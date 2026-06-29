import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedUser } from '../types/authenticated-user';

/**
 * Like JwtAuthGuard but never rejects: if a valid auth cookie is present the user is attached
 * to the request, otherwise the request proceeds anonymously (req.user === undefined).
 *
 * Used for endpoints that personalize when signed in but must still serve guests
 * (e.g. recommendations on the home page).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthenticatedUser>(_err: unknown, user: TUser | false): TUser | undefined {
    return user || undefined;
  }
}
