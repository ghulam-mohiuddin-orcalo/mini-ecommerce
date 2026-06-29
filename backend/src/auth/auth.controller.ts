import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { SafeUser, toSafeUser } from '../users/user.mapper';
import { AUTH_COOKIE, authCookieOptions } from './auth.constants';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Register a customer, set the auth cookie, return the sanitized user. */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('signup')
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SafeUser> {
    const user = await this.authService.register(dto);
    this.setAuthCookie(res, this.authService.signToken(user));
    return toSafeUser(user);
  }

  /** Authenticate, set the auth cookie, return the sanitized user. */
  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SafeUser> {
    const user = await this.authService.validateCredentials(dto);
    this.setAuthCookie(res, this.authService.signToken(user));
    return toSafeUser(user);
  }

  /** Clear the auth cookie. Public so an expired session can still be cleared. */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { success: true } {
    res.clearCookie(AUTH_COOKIE, authCookieOptions(0));
    return { success: true };
  }

  /** Return the currently authenticated user. */
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  private setAuthCookie(res: Response, token: string): void {
    res.cookie(AUTH_COOKIE, token, authCookieOptions(this.authService.tokenMaxAgeMs()));
  }
}
