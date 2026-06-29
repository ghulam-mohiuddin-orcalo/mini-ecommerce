import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './auth.constants';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

const BCRYPT_COST = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
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
