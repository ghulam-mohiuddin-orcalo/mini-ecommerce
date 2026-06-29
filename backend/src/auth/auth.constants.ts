import type { CookieOptions } from 'express';

/** Name of the httpOnly cookie that carries the JWT. */
export const AUTH_COOKIE = 'access_token';

/** JWT payload shape (kept minimal — no secrets/PII beyond id/email/role). */
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

/**
 * Cookie options for the auth token.
 *  - httpOnly: token is never readable by frontend JS (XSS-safe).
 *  - sameSite 'lax': frontend + API are same-origin via the Next proxy, so Lax covers CSRF.
 *  - secure: only over HTTPS in production; off in dev so it works over http://localhost.
 */
export function authCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeMs,
  };
}
