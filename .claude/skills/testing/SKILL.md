---
name: testing
description: How tests are written and run in this repo — Jest + Supertest e2e in backend/test, fast unit specs in backend/src, the *test*-DB safety guard, FK-safe self-sufficient suites, and which status codes/integrity outcomes to assert. Load when adding or fixing tests.
---

# Testing

Coverage is **focused on data-integrity-critical logic**, not a coverage percentage. Two layers,
both Jest.

## The two layers

| Layer | Location | Config | Runs |
|---|---|---|---|
| **Unit** (DB/network-free) | `backend/src/**/*.spec.ts` | `jest` block in `package.json`, `rootDir: src` | `npm test` |
| **e2e** (full Nest app + DB) | `backend/test/*.e2e-spec.ts` | `test/jest-e2e.json`, `--runInBand` | `npm run test:e2e` |

- **Unit** is for pure logic and DB-free handlers: the order state-machine transition matrix
  ([order-state-machine.spec.ts](../../../backend/src/orders/order-state-machine.spec.ts)) and the
  Stripe webhook handler ([payments.service.spec.ts](../../../backend/src/payments/payments.service.spec.ts))
  with a mocked signature — no live Stripe, no DB.
- **e2e** boots the real app with the **global pipe/guards/filter**, so it sees the real behaviour:
  existing suites are `auth`, `products`, `cart`, `orders`, `admin`, `recommendations`.

## The database safety guard

- e2e refuses to run unless `DATABASE_URL` names a **`*test*`** database — never disable it, never
  point it at dev data.
- `pretest:e2e` runs `prisma migrate deploy` automatically. One-time setup creates
  `mini_ecommerce_test` (see README "Testing").

## What to assert

For each mutating endpoint, cover (negatives first):
- **success** — and the **integrity outcome**: `order.totalCents === Σ line totals`, stock
  decremented, cart cleared.
- **validation 422** — bad/empty/extra fields (`forbidNonWhitelisted`). Assert **422**, not 400.
- **authz** — 401 anon, 403 wrong role on protected/admin routes.
- **conflict/rollback 409** — oversell, inactive product, invalid transition; assert state is
  **unchanged** (stock, order count, cart restored — an earlier line's decrement is rolled back).
- **ownership 404** — another user's order/resource returns 404, not 403.
- **payment 402** and **idempotent duplicate** where relevant (the webhook unit tests cover bad
  signature / duplicate delivery / unpaid / out-of-stock-ack).

## Writing robust suites

- **Self-sufficient & FK-safe:** each suite seeds and cleans its own data, deleting in FK order
  (`order.deleteMany()` **before** `user.deleteMany()`). Don't rely on suite run order — Jest
  reorders by timing (NOTES.md "mistakes caught #6").
- **Authenticate like a browser:** extract the `access_token` cookie pair from `Set-Cookie` and
  resend just that — not the whole multi-attribute string.
- **Deterministic:** no wall-clock/random dependence; stable assertions.
- **No `any`;** type Supertest responses and helpers.

## When a test fails

- **Suspect the test first** when it disagrees with a live check (NOTES.md "mistakes caught #5":
  an extra field in a login body was correctly 422'd — the bug was in the test). Read the **actual**
  status code before touching app code.
- If it's a real defect, report it to the owning agent — **don't change source just to go green**.

## Anti-patterns

- ❌ Pointing e2e at the dev DB or disabling the `*test*` guard.
- ❌ Asserting only the HTTP code, not the integrity outcome (stock/total/cart).
- ❌ A suite that depends on another suite's leftover data or run order.
- ❌ Resending the raw multi-attribute `Set-Cookie` as the `Cookie` header.
- ❌ Editing production code to make a test pass (when the test is the thing that's wrong).
- ❌ A DB-touching test written as a "unit" spec (use e2e).
