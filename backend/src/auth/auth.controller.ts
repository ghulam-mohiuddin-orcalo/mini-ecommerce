import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { UserResponseDto, toSafeUser } from '../users/user.mapper';
import { AUTH_COOKIE, authCookieOptions } from './auth.constants';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';

/** Same generic copy is returned whether or not the email exists, to prevent user enumeration. */
const FORGOT_PASSWORD_MESSAGE = 'If that email exists, a reset link has been sent';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /** Register a customer, set the auth cookie, return the sanitized user. */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('signup')
  @ApiOperation({ summary: 'Register a customer; sets the access_token cookie' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: 'Email already registered' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const user = await this.authService.register(dto);
    this.setAuthCookie(res, this.authService.signToken(user));
    return toSafeUser(user);
  }

  /** Authenticate, set the auth cookie, return the sanitized user. */
  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Authenticate; sets the access_token cookie' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const user = await this.authService.validateCredentials(dto);
    this.setAuthCookie(res, this.authService.signToken(user));
    return toSafeUser(user);
  }

  /** Clear the auth cookie. Public so an expired session can still be cleared. */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Clear the access_token cookie' })
  @ApiOkResponse({ description: 'Cookie cleared' })
  logout(@Res({ passthrough: true }) res: Response): { success: true } {
    res.clearCookie(AUTH_COOKIE, authCookieOptions(0));
    return { success: true };
  }

  /**
   * Begin a password reset. Always returns 200 with a generic message — never reveals whether the
   * email is registered (no user enumeration).
   */
  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset link (always 200; never reveals if email exists)' })
  @ApiOkResponse({ description: 'Generic acknowledgement' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string; resetToken?: string }> {
    const { token } = await this.authService.requestPasswordReset(dto);

    // DEV-ONLY DELIVERY STUB: this repo has no mailer. The reset flow itself is real (random token,
    // hashed at rest, single-use, time-limited) — only the *delivery channel* is stubbed. We always
    // log the link server-side, and additionally echo the raw token in the response when NOT in
    // production so it can be exercised end-to-end without an inbox. This is the single intentional
    // stub; it MUST stay gated on NODE_ENV !== 'production' so tokens never leak in prod.
    if (token) {
      this.logger.log(`Password reset requested; reset token (dev log): ${token}`);
    }

    const response: { message: string; resetToken?: string } = { message: FORGOT_PASSWORD_MESSAGE };
    if (token && process.env.NODE_ENV !== 'production') {
      response.resetToken = token;
    }
    return response;
  }

  /**
   * Complete a password reset with a valid, unused, unexpired token. Does NOT auto-login — the
   * client redirects to /login afterwards.
   */
  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset the password using a valid reset token' })
  @ApiOkResponse({ description: 'Password updated' })
  @ApiBadRequestResponse({ description: 'Invalid or expired token' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(dto);
    return { message: 'Your password has been reset. Please sign in.' };
  }

  /** Change the password of the signed-in user (requires the current password). */
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Change password for the authenticated user' })
  @ApiOkResponse({ description: 'Password changed' })
  @ApiUnauthorizedResponse({ description: 'Current password incorrect or not authenticated' })
  @ApiUnprocessableEntityResponse({ description: 'Validation failed' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
    return { message: 'Your password has been changed.' };
  }

  /** Return the currently authenticated user. */
  @Get('me')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  private setAuthCookie(res: Response, token: string): void {
    res.cookie(AUTH_COOKIE, token, authCookieOptions(this.authService.tokenMaxAgeMs()));
  }
}
