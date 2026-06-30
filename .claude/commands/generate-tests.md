---
description: Add focused Jest coverage for a module — e2e (Supertest) for HTTP/DB behaviour and unit specs for pure logic — emphasizing integrity-critical paths.
argument-hint: <module/area, e.g. "cart" or "order state machine">
---

# /generate-tests

Add meaningful test coverage for **$ARGUMENTS**, matching this project's philosophy: focused on
**data-integrity-critical logic**, not coverage percentage. Owned by **testing-engineer**.

## Workflow

1. **Map the surface.** Identify the module's endpoints and pure functions. Read the closest
   existing suite in [backend/test/](../../backend/test/) (`auth`, `products`, `cart`, `orders`,
   `admin`, `recommendations`) and any colocated `*.spec.ts` to mirror setup/teardown and helpers.

2. **Choose the layer per behaviour.**
   - **Unit spec** (`backend/src/**/*.spec.ts`, `rootDir: src`, DB/network-free) for pure logic —
     e.g. the state-machine transition matrix, money/total math, or the Stripe webhook handler with
     a mocked signature.
   - **e2e spec** (`backend/test/*.e2e-spec.ts`, `--runInBand`) for anything crossing HTTP or the
     database — through the real global pipe/guards/filter.

3. **Enumerate the cases — negatives first.** For each mutating endpoint cover at minimum:
   - success (and assert the **integrity outcome**, e.g. `totalCents === Σ line totals`, stock
     decremented, cart cleared);
   - validation **422** (bad/empty/extra fields — `forbidNonWhitelisted`);
   - authz **401/403** where relevant;
   - conflict/rollback **409** (oversell, inactive product, invalid transition) asserting state is
     **unchanged**;
   - ownership **404** (another user's resource);
   - payment **402** / idempotent duplicate where relevant.

4. **Write self-sufficient, deterministic tests.** Each suite seeds and cleans its own data in
   **FK-safe order** (delete `order` before `user`), never relies on run order or wall-clock, and
   authenticates by extracting the `access_token` cookie pair like a browser. Assert the **real**
   status codes (422, not 400). No `any`.

5. **Guard the database.** e2e runs only against a `*test*` DB; never disable the guard or point at
   dev data. `pretest:e2e` applies migrations automatically.

6. **Run and stabilize.** `npm test` and `npm run test:e2e` both green; re-run to confirm
   order-independence. If a test exposes a real defect, **report it** to the owning agent — don't
   change source to make it pass (unless the test itself is wrong).

7. **Report counts** and what's covered vs deliberately skipped, for **supervision-verifier** and
   the README testing section.

## Definition of Done

- New unit/e2e specs cover success + the negative/rollback/authz cases for the area.
- Integrity outcomes asserted, not just status codes; correct codes used.
- Suites self-sufficient, FK-safe, deterministic; run only against a `*test*` DB.
- `npm test` + `npm run test:e2e` green; counts reported.
