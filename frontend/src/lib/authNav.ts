/**
 * Post-authentication navigation helpers.
 *
 * The sign-in / sign-up pages accept a `?next=` parameter so a visitor who was bounced
 * off a protected page (or clicked "Sign in" from somewhere specific) returns exactly
 * where they intended. To avoid an open-redirect, `next` is only ever honoured when it
 * is a same-origin, root-relative path.
 */

/** Only allow same-origin, root-relative paths (rejects absolute URLs and `//host` escapes). */
export function safeNext(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

/** Build a `/signin` href that preserves an intended destination as `?next=`. */
export function signinHref(next?: string | null): string {
  const target = safeNext(next);
  return target ? `/signin?next=${encodeURIComponent(target)}` : '/signin';
}
