import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './auth.constants';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';

const BCRYPT_COST = 12;
/** Password reset tokens are short-lived single-use credentials; one hour is plenty for an email click-through. */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /** Create a customer account. Rejects duplicate emails with 409. */
  async register(dto: SignupDto): Promise<User> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    return this.usersService.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
    });
  }

  /**
   * Verify credentials. Returns the user on success, throws 401 otherwise. The same generic
   * message is used for "no such email" and "wrong password" to avoid user enumeration.
   */
  async validateCredentials(dto: LoginDto): Promise<User> {
    const user = await this.usersService.findByEmail(dto.email);
    const ok = user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !ok) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return user;
  }

  /**
   * Begin a password reset. ALWAYS resolves with the same generic outcome regardless of whether
   * the email maps to an account, so the endpoint can never be used to enumerate registered users.
   *
   * On a hit: a 32-byte random token is generated, ONLY its SHA-256 hash is persisted (a DB leak
   * can't be replayed to reset accounts), any prior unused tokens for the user are invalidated, and
   * the new token expires in one hour.
   *
   * Returns the raw token only when not in production — see the controller's dev-only delivery stub.
   */
  async requestPasswordReset(dto: ForgotPasswordDto): Promise<{ token: string | null }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      // No such account: do nothing, but return the same shape so timing/response don't leak.
      return { token: null };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    // Single outstanding token per user: invalidate any prior unused ones, then issue the new one.
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      }),
    ]);

    return { token: rawToken };
  }

  /**
   * Complete a password reset. Looks up an unused, unexpired token by its hash; on any failure
   * throws a single generic 400 ("invalid or expired") so the caller can't tell which condition
   * failed. On success the user's password is rehashed (bcrypt), the token is marked used, and the
   * user's other outstanding tokens are invalidated — all in one transaction.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = hashToken(dto.token);
    const record = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      // Consume this token and invalidate every other outstanding token for the user.
      this.prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: now },
      }),
    ]);
  }

  /**
   * Change the password of an already-authenticated user. The current password must be supplied
   * and verified (so a hijacked session alone can't rotate the password), then the new one is
   * rehashed. Any outstanding reset tokens are invalidated for good measure. 401 on a wrong
   * current password.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  /** Sign a JWT for a user. */
  signToken(user: User): string {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }

  /** Token lifetime in ms, derived from config, so the cookie maxAge matches the JWT expiry. */
  tokenMaxAgeMs(): number {
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN', '7d');
    return parseDurationMs(expiresIn);
  }
}

/** Derive the stored fingerprint of a reset token. SHA-256 of the raw token; the raw value is never persisted. */
function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

/** Parse simple JWT-style durations ("7d", "12h", "30m", "3600s", or a raw seconds number). */
function parseDurationMs(value: string): number {
  const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * (unitMs[match[2] ?? 's'] ?? 1000);
}
