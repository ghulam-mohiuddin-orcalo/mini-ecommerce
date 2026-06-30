---
name: security
description: The trust-boundary, auth, authorization, ownership/IDOR, cookie/CSRF, secrets, and Stripe payment rules for this app. Load for any work on auth, admin routes, payments, user data exposure, or the API proxy.
---

# Security

The server is the **only trust boundary**. The client validates for UX; the server re-validates and
decides everything authoritative (prices, totals, stock, permissions). These rules reflect the
mechanisms actually in this codebase.

## Authentication

- JWT stored in an **httpOnly cookie** `access_token`, `SameSite=Lax`, `Secure` only in production
  (`NODE_ENV`). The token is never readable by JS (XSS-safe).
- The browser is **same-origin** with the API via the Next `/api/*` rewrite proxy, so `Lax` covers
  CSRF without cross-site cookie complexity.
- `JwtStrategy.validate` **re-reads the user from the DB** on every request, so deleted users are
  rejected and the current role is always used (no stale-role tokens).
- Passwords: **bcryptjs cost 12**; signup/login DTOs cap length at **72 bytes** (bcrypt's limit).
- Login is **non-enumerating**: identical 401 message for unknown email vs wrong password.
- Email is normalized (trim + lowercase) at the validation boundary so casing can't fork accounts.

## Authorization (secure-by-default)

- `JwtAuthGuard` + `RolesGuard` are **registered globally** in
  [app.module.ts](../../../backend/src/app.module.ts). A route is protected **unless** it opts out
  with `@Public()`.
- Admin routes carry `@Roles(Role.ADMIN)` (class-level on `admin/*` controllers). Result:
  customer → **403**, anonymous → **401**, on every admin route.
- Guard order is authenticate-then-authorize (populate `req.user`, then check role).

## Ownership / IDOR

- Customer endpoints take **no** `userId`/`cartId` param — identity is `req.user.id` from the JWT.
  A client-supplied `userId` is rejected (422 via `forbidNonWhitelisted`).
- By-id reads use `findFirst({ id, userId })` and return **404 (not 403)** for someone else's
  resource — existence isn't leaked. Same for Stripe sessions (`findByStripeSession` ownership
  check).

## Stripe payments

- `POST /payments/checkout-session` builds line items priced **from the DB** at request time; the
  client sends nothing but its cookie. `userId`/`cartId` go in session metadata.
- An order is created **only** from a signature-verified `checkout.session.completed` with
  `payment_status === 'paid'`. The webhook verifies the signature against the **raw** body
  (`NestFactory({ rawBody: true })`) using `STRIPE_WEBHOOK_SECRET` — bad/missing signature is
  **400** and never processed.
- Fulfilment reuses the transactional core and is **idempotent** (unique `stripeSessionId`).
- Business-permanent failure at fulfilment (cart emptied / out of stock) is logged and acked
  **200** (so Stripe stops retrying; a prod system would refund); unexpected errors return **500**
  so Stripe retries.

## Secrets

- `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` are **server-only** env vars. Only
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is public, by design.
- `.env` is gitignored; `.env.example` documents the variables. Never commit a real secret; never
  put a secret in a `NEXT_PUBLIC_*` var (it ships to the browser).
- If `STRIPE_SECRET_KEY` is unset the app still boots and payment calls return **503**.

## Other

- `helmet()` sets security headers; CORS is locked to `FRONTEND_ORIGIN` with credentials.
- Auth endpoints are rate-limited (`@nestjs/throttler`, default 10/min/IP) → **429**.
- The error filter never leaks stack traces or internals.
- The client admin gate (`StoreAccessGuard` / admin layout) is **UX only** — the server enforces
  `@Roles(ADMIN)` regardless.

## Anti-patterns

- ❌ Computing/accepting a price, total, stock delta, or permission decision on the client as
  authoritative.
- ❌ Making a route public by default or removing a global guard.
- ❌ Returning 403 (or a different message) for a foreign resource — leaks existence; use 404.
- ❌ Accepting `userId` from the request body/query to scope data.
- ❌ Processing a Stripe webhook before verifying its signature against the raw body.
- ❌ Putting any secret in `NEXT_PUBLIC_*` or committing `.env`.
- ❌ Logging or returning `passwordHash` / internal errors.
