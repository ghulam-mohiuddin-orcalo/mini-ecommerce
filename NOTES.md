# NOTES

Engineering notes for the Mini E-Commerce assessment: how the agent was driven, the
decisions made, mistakes caught, and how the work was verified. Written incrementally as the
build progresses (not at the end).

---

## Agent workflow

- **Tool:** Claude Code (agentic CLI), driven by a human supervisor.
- **Context file:** [`CLAUDE.md`](./CLAUDE.md) is the persistent project-context file. It pins
  the stack, architecture rules (services-only business logic, DTO validation, transactional
  stock, snapshots, soft-delete, authZ), the order state machine, ports, and the open-ended
  requirement interpretation. The agent re-reads it each session so decisions stay consistent.
- **How work is scoped:** the build is broken into small, independently verifiable milestones
  (scaffold → DB → auth → catalog → cart → checkout → admin → dashboard → recommendations →
  tests/docs). For each milestone the agent explains *what* and *why*, lists files, implements,
  self-reviews, verifies, and **waits for explicit approval** before the next one.
- **Planning before code:** a full implementation blueprint (requirements breakdown, schema,
  API design, security checklist, edge cases, risks) was produced and approved before any code.

## Architectural decisions

### Overall
- **Modular monolith**, not microservices. One NestJS process + one Postgres DB, organized into
  cohesive feature modules with DI boundaries. Checkout crosses cart → stock → order → payment
  in a single transaction — trivial in a monolith, genuinely hard across services. Right-sized
  for a timed, integrity-sensitive, end-to-end build and far easier to run from a clean clone.
- **Two surfaces, one app/API:** the admin panel is a role-gated surface over shared services,
  not a duplicate stack.

### Data model (Milestone 1)
- **Money as integer cents** (`Int`) everywhere — eliminates floating-point rounding bugs.
- **Order-item snapshots:** `OrderItem` freezes `productName`, `productImageUrl`,
  `productCategory`, `unitPriceCents`, `quantity` at order time, so historical orders stay
  correct even if a product is later edited or deactivated. `Order.totalCents` is the
  authoritative charged amount and equals the sum of its line snapshots (verified).
- **Soft delete:** `Product.isActive`. The row persists so order history never breaks; catalog
  queries filter it out. `OrderItem → Product` uses `Restrict`, so an ordered product can never
  be hard-deleted — this is the backstop that forces the soft-delete path.
- **Intentional referential actions:** `Order → User: Restrict` (preserve financial/audit
  history); `OrderItem → Order: Cascade`; `Cart/CartItem: Cascade`; `CartItem → Product:
  Cascade`. Documented inline in `schema.prisma`.
- **DB-level CHECK constraints** (migration `add_value_check_constraints`): non-negative
  money/stock, positive quantities. Defense-in-depth *in addition to* application validation,
  because Prisma's schema language can't express them.
- **`cuid()` primary keys** rather than sequential integers — non-guessable IDs reduce IDOR
  surface.
- **Indexes** chosen for real access paths: composite `(isActive, …)` for catalog filter/sort,
  `(userId, createdAt)` for order history, `status`/`productId` for dashboard aggregation.
  Unique constraints on `email`, `sku`, `Cart.userId`, `(cartId, productId)`.
- **`sku`** added as a stable natural key that doubles as the idempotent seed upsert key.

### Authentication & authorization (Milestone 2)
- **JWT in an httpOnly cookie**, `SameSite=Lax`, `Secure` only in production (`NODE_ENV`). The
  token is never exposed to frontend JS (XSS-safe); same-origin via the Next proxy means Lax
  covers CSRF without cross-site cookie complexity. No refresh tokens — deliberately out of
  scope for a 5–6h build (documented trade-off).
- **bcryptjs, cost 12.** Signup/login DTOs cap password at 72 bytes (bcrypt's limit) to avoid
  silent truncation.
- **Secure-by-default guards:** `JwtAuthGuard` and `RolesGuard` are registered globally; routes
  are protected unless explicitly `@Public()`. Admin routes add `@Roles(ADMIN)`. Guard order is
  authenticate-then-authorize.
- **DB re-validation on every request:** `JwtStrategy.validate` looks the user up by id, so
  deleted users are rejected and the current role is always used (no stale-role tokens).
- **Sanitized responses:** a `toSafeUser` mapper guarantees `passwordHash` never leaves the
  server; `/auth/me` returns only id/email/name/role.
- **Consistent errors:** validation → **422**, auth → **401**, role → **403**, duplicate →
  **409**, rate limit → **429**, all via the global filter in one `{statusCode,error,message,
  path,timestamp}` shape. `forbidNonWhitelisted` rejects unexpected fields.
- **Rate limiting:** `@nestjs/throttler` on `/auth/signup` and `/auth/login` (configurable via
  `AUTH_THROTTLE_LIMIT`, default 10/min/IP). Cheap to add, meaningful protection.
- **No user enumeration on login:** identical 401 message for unknown email vs wrong password.
  (Signup necessarily reveals an email is taken — accepted trade-off.)

### Product catalog (Milestone 3) — end-to-end
- **Backend:** `GET /products` composes a reusable Prisma `where` (always `isActive: true`, plus
  optional case-insensitive name search, exact category, and inclusive cents price range) and
  `orderBy` (newest / price asc / price desc). Data + total count run in **one** `$transaction`
  round trip, backed by the composite catalog indexes from M1. `GET /products/:id` returns a
  single active product or 404; `GET /products/categories` powers the filter. All public.
- **Money in the API stays in cents** (`minPrice`/`maxPrice`); the frontend converts to/from
  dollars only at the input edge.
- **Frontend (fully integrated):** home (hero + new arrivals), catalog (filter sidebar + grid +
  pagination), and product detail — all driven by TanStack Query against `/api/*` through the
  proxy. **Filters are synchronized with URL search params** (shareable/bookmarkable), and so
  filter state is preserved across list↔detail navigation (the catalog route re-reads the URL).
  Loading skeletons, empty state, and error state (with retry) are all present.
- **Design:** continued the custom "Linen & Pine" system — new primitives (`Input`, `Select`,
  `Badge`, `Skeleton`, `States`) and store components (`ProductCard`, grid, filters, pagination)
  built from our tokens, no template.
- **Deliberate decisions:** plain `<img>` (lazy/async) over `next/image` — avoids remote-image
  config and stays resilient if the external demo image host is unreachable (e.g. offline clean
  clone); page size fixed at 12; filter inputs use focus-aware resync so Clear/back-navigation
  update the boxes without fighting the user's typing.
- **Add-to-cart on the detail page is intentionally deferred to M4** (it needs the cart backend)
  — no dead buttons shipped in M3.

### Cart (Milestone 4) — end-to-end, integrity-first
- **Server-side persistent cart, one per user** (`Cart.userId` unique). Lines are unique per
  `(cartId, productId)`, so a repeat add **merges** into the existing line — no duplicates.
- **Totals are never trusted from the client.** `buildCartResponse` is the single source of
  truth and always recomputes line/grand totals from the **current product price**; the cart
  stores only `(productId, quantity)`.
- **Ownership is structural:** every operation is scoped to `req.user.id` from the JWT. There is
  no `userId`/`cartId` parameter to address another user's cart, and `forbidNonWhitelisted`
  rejects a client-supplied `userId` (422). Proven by e2e isolation tests.
- **Validation on every mutation:** product must exist and be active (404 otherwise); quantity
  must be ≥ 1 (422); the resulting quantity must fit in stock (409). Add/update run in a Prisma
  **transaction**.
- **Race conditions & stock consistency (deliberate design):** the cart is a *staging area*, not
  a stock reservation. Cart writes validate against current stock best-effort, but the cart
  **never decrements stock**. The authoritative, atomic stock decrement happens at **checkout
  (M5)** inside a transaction with a conditional decrement — that is where overselling is
  actually prevented. Reserving stock at add-to-cart time would let abandoned carts lock
  inventory, so it's intentionally avoided. A line whose stock later drops below its quantity is
  flagged `available: false` for the UI and will be re-validated at checkout.
- **Module isolation:** `CartModule` doesn't depend on `ProductsModule`; the one-line
  active-product predicate is duplicated intentionally so cart stays self-contained and checkout
  can build directly on it.
- **Frontend (fully integrated):** product-detail add-to-cart (quantity selector + success
  feedback + sign-in gating), a cart page (line totals, grand total, quantity update, remove,
  clear, empty/loading/error states), and a live cart-count badge in the header. **Mutations are
  not optimistic** — each returns the server-recomputed cart, which is written straight to the
  query cache (correctness over guesswork, as requested).
- **Auth UI enabler:** since the cart is per-user, M4 also added the minimal frontend auth layer
  needed to use it — `useMe`/login/signup/logout hooks and `/login` + `/signup` pages — so the
  feature is genuinely integrated rather than a backend-only endpoint.

### Checkout (Milestone 5) — the integrity core
- **One interactive Prisma transaction** wraps the entire checkout: load cart → per line
  re-read the product, snapshot its current price/name/image, and **atomically decrement stock**
  → compute the authoritative total server-side → charge (mock) → create Order + OrderItems →
  clear the cart. Any failure `throw`s and Prisma rolls back **everything**.
- **Atomic stock decrement (oversell guard):** `updateMany WHERE id, isActive, stock >= qty →
  decrement`, then assert `count === 1`. This is the real gate — it serializes at the row level,
  so concurrent checkouts can't oversell, without needing Serializable isolation (which would
  force retry handling). The preceding `findUnique` is only for the price/name snapshot.
- **Money:** integer cents end to end. The total is computed server-side from the **re-read**
  prices (never from the cart or client); `order.totalCents` is persisted as the authoritative
  charged amount and always equals the sum of line totals (asserted in tests).
- **Snapshots:** `OrderItem` stores name/image/category/unit price at order time, so later
  product edits never change historical orders (verified).
- **Payment placement (deliberate):** since the mock provider is in-process and synchronous, the
  charge runs **inside** the transaction — a decline simply throws and the whole tx rolls back,
  which is exactly "failed payment creates no order and changes no stock." Documented that a real
  provider would charge **outside** the tx and issue a compensating refund on failure; the
  `PaymentProvider` interface (`payments/`) makes that swap a one-file change. Failure is explicit
  and testable via the `tok_decline` token.
- **Order history & ownership:** `GET /orders` is scoped to `req.user.id`; `GET /orders/:id` uses
  `findFirst({ id, userId })` and returns **404** (not 403) for someone else's order, so existence
  isn't leaked.
- **Frontend (integrated):** checkout page (summary + mock-payment panel with a decline toggle),
  order confirmation (the order detail page with a success banner via `?placed=1`), and order
  history — all through the proxy, with clear success/failure states. Cart now links to checkout.

### Critical review — transaction safety / rollback / stock / money
- **Transaction safety:** all mutations (stock decrements, order, order items, cart clear) are in
  a single `$transaction`; nothing is written outside it, so there are no partial orders.
- **Rollback proven:** payment decline (402), mid-loop insufficient stock (409 — an earlier
  line's decrement is restored), and inactive product (409) all leave stock, order count, and the
  cart exactly as before. Covered by both manual checks and 7 e2e tests.
- **Stock consistency:** the conditional decrement prevents overselling even under concurrency;
  cart-level checks are advisory, checkout is authoritative.
- **Money calculations:** integer cents only; server-recomputed totals; persisted authoritative
  total == Σ line totals; snapshots immutable.

### API documentation (Swagger / OpenAPI)
- `@nestjs/swagger` exposes Swagger UI at **`/api/docs`** (OpenAPI JSON at `/api/docs-json`),
  **gated to non-production** (`NODE_ENV !== 'production'`) so internals aren't exposed in prod.
- DTOs documented with `@ApiProperty`; controllers/endpoints with `@ApiTags`/`@ApiOperation`
  and typed responses. Cookie auth (`access_token`) is registered via `addCookieAuth` and
  applied to protected endpoints (`@ApiCookieAuth`) — matching our real auth scheme rather than
  documenting an unused bearer scheme.
- Mounted on the backend root path `/api/docs` (the Next proxy strips `/api`, so this is hit
  directly on the API server at `http://localhost:3001/api/docs`).

### Tooling / dependency decisions
- **`bcryptjs`** (pure JS) over native `bcrypt` — avoids a native build toolchain, a common
  clean-clone failure on Windows.
- **httpOnly JWT cookie + Next.js `/api/*` rewrite proxy** so the browser is always same-origin:
  the token is never readable by JS (XSS-safe) and `SameSite=Lax` covers CSRF, with no
  cross-site cookie pain.
- **Mocked payment behind an interface** (chosen, spec-allowed) instead of real Stripe — keeps
  the build inside the time budget while remaining swappable.
- **Tailwind v4 + custom design tokens** ("Linen & Pine") instead of an off-the-shelf UI kit,
  per the assessment's design requirement.

## Where the agent helped / where it failed (mistakes caught)

This is the most important section — concrete cases where the agent's output was wrong and how
it was caught.

1. **Boot crash from a missing peer dependency (M0).** The global `ValidationPipe` was wired in
   `main.ts` before `class-validator`/`class-transformer` were installed. The build passed but
   the server **crashed on boot** (`The "class-validator" package is missing`). Caught by
   actually *running* the server rather than trusting a green build. Fix: added the deps.
   *Lesson: a successful compile is not a successful run — verify at runtime.*
2. **Pending migration not applied to the dev DB (M1 finalize).** The CHECK-constraint migration
   was created with `--create-only` and applied to the clean-room verification DB, but the dev
   DB was left one migration behind. Caught via `prisma migrate status` during final review and
   fixed with `migrate deploy`. *Lesson: verify migration state, don't assume.*
3. **Self-review cleanups (M1).** Reviewing the seed before commit surfaced duplicated
   `bySku.get(...) + throw` logic (extracted a `requireProduct` helper) and an un-awaited
   `prisma.$disconnect()` in teardown (restructured to await it).
4. **Build output silently relocated (M2).** Adding `prisma/seed.ts` (which imports
   `@prisma/client`) pulled the `prisma/` folder into the Nest build, shifting the output from
   `dist/main.js` to `dist/src/main.js` and breaking `start:prod`. Caught when the built server
   failed with `Cannot find module dist/main.js`. Fixed by excluding `prisma` from
   `tsconfig.build.json`. *Lesson: adding files can change the compiler's inferred rootDir.*
5. **Two e2e failures that were actually the code being right (M2).** `/users` returned 401 in
   tests while a live curl returned the correct 403/200. Root cause was a *test* bug: the test
   sent the whole `{email,password,name}` object to `/auth/login`, and `forbidNonWhitelisted`
   correctly rejected the extra `name` field with 422 → empty cookie → 401. The fix was in the
   test, not the app — and it confirmed the validation hardening works. (A second red herring
   along the way: re-sending the raw multi-attribute `Set-Cookie` string as a `Cookie` header;
   switched to extracting just the `access_token` pair, as a browser does.) *Lesson: when a
   test and a manual check disagree, suspect the test — and read the actual status code.*

## Supervision & verification

Nothing is accepted on a green build alone. Verification performed so far:

- **M0:** backend + frontend build clean; backend boots and serves `/health`; **the Next→Nest
  `/api/*` proxy works end-to-end**; homepage returns 200; confirmed no secrets are tracked.
- **M1:**
  - Clean-room DB test: created a throwaway database, applied **both migrations from empty** via
    `migrate deploy`, seeded it — proving the clean-clone path without a destructive reset.
  - Seed **idempotency** confirmed (identical row counts after re-running).
  - Row counts verified directly in Postgres (2 users, 14 products, 5 orders / 7 items, 1 cart /
    2 items).
  - **Integrity invariant**: every order's `totalCents` equals the sum of its line snapshots.
  - **`Restrict` proven**: hard-deleting an ordered product raises an FK violation; soft-delete
    preserves the snapshot.
  - **CHECK constraints proven**: negative stock, negative price, and zero-quantity updates are
    all rejected by the database.
  - Prisma Studio serves on :5555.
  - A note: `prisma migrate reset` is intentionally blocked for AI agents; the clean-room
    throwaway-DB approach was used instead — safer and equally rigorous.
- **M2 (auth):**
  - 13 automated e2e tests pass (signup, duplicate→409, invalid→422, wrong password→401, valid
    login, `/me` with/without/invalid/expired token, customer→admin 403, admin→200 with no hash
    leak, logout clears cookie).
  - Verified live with a cookie jar: customer `/users` → 403, admin `/users` → 200, `/auth/me`
    → 200 — confirming the guards behave correctly outside the test harness too.
  - Rate limiting verified live: 10 logins succeed, the 11th–13th return 429.
  - Error-shape consistency verified for 401/403/422/429 (proper reason phrases, no stack
    traces).
  - e2e suite is guarded to refuse any non-`test` database, so it can't wipe dev data.
- **M3 (catalog):**
  - 8 automated catalog e2e tests added (active-only, search, category, price range, sort,
    pagination boundaries, 422 on bad params, 404 for inactive/missing) — 21 tests total.
  - Manually verified against the seed: every filter and combination, sort correctness (asc/desc
    arrays sorted), pagination (page 2 = 2 items, out-of-range = empty with correct total),
    detail matches listing, and toggling a product inactive removes it from list/search/detail
    (404) then restores.
  - **Verified the storefront works only through the Next proxy:** `/api/products` via :3000
    returns the catalog; `/`, `/products`, filtered URLs, and detail pages all return 200.
  - Lighthouse not run in this sandbox (no browser); the build is optimized (≈124–126 kB first
    load, lazy images, skeletons to limit CLS) — left as a manual check.
- **M4 (cart):**
  - 10 cart e2e tests (add, merge, exceed-stock 409, inactive 404, client-`userId` 422,
    zero/negative 422, update, remove, and **ownership isolation** proving B can't see/affect
    A's cart) — 31 tests total, run `--runInBand`.
  - Manually verified the whole matrix against the seed: add the same product twice (merges),
    update, remove, exceed stock (409, cart unchanged), inactive product (404), unauthorized
    (401), and totals correct after every operation.
  - **Verified the full cart flow through the Next proxy** (login → add → get cart via
    `:3000/api`, totals correct) and that `/cart`, `/login`, `/signup` pages load.
  - Minor agent slips caught by the build/tests before commit: an `unknown`-typed test helper
    arg and a `void` mutation generic (both surfaced by `tsc`), and a premature `/admin` header
    link removed in self-review (route doesn't exist until M6).
- **M5 (checkout):**
  - 7 checkout e2e tests (success with totals/stock/cart assertions, empty cart 400, declined
    payment 402 with no order/stock change, mid-loop insufficient-stock rollback, inactive-product
    rollback, snapshot immutability, cross-user order isolation) — **38 tests total**.
  - Manually verified the full matrix against the seed: successful multi-product checkout
    (total = Σ lines, atomic stock decrement, cart cleared), empty cart, price-change-before-
    checkout (order uses re-read price), stock-becomes-insufficient and product-becomes-inactive
    (both 409 + full rollback incl. restoring an earlier line's decrement), payment decline (402,
    nothing persisted), and snapshot immutability after later product edits.
  - Verified the entire checkout flow through the Next proxy (login → add → checkout → order
    detail → history → cart emptied) and that `/checkout`, `/orders`, `/orders/[id]` load.

## Design workflow

- The visual identity is a **custom design system** ("Linen & Pine"): warm paper neutrals, a
  pine-green brand accent (deliberately away from default blue), an amber highlight, generous
  radii and soft shadows. Encoded as Tailwind v4 tokens in `globals.css` and consumed through
  reusable primitives (e.g. `Button`).
- *(To be expanded as the UI is built: which design agent directed the layouts and how the look
  was iterated, per the assessment's design requirement.)*

## Assumptions

- **Open-ended requirement ("suggestions relevant to them")** interpreted as **hybrid
  personalized**: popular products from categories the user has purchased in (excluding
  already-owned), with a **cold-start fallback** to top sellers / newest for users with no
  history. Product detail pages additionally show same-category related products. Rationale: it
  matches the literal "relevant to *them*" (personalization), reuses existing order data, and
  degrades gracefully.
- **Single currency** (amounts are unit-less cents; no multi-currency).
- **Categories are denormalized strings** (indexed), not a separate entity — sufficient for
  browse/filter; a `Category` table would only be warranted if categories needed their own
  metadata/management.
- **Historical seed orders do not decrement product stock** — seeded stock represents current
  availability; past orders are treated as already-settled transactions.
- **Admin is a role-gated area** of the single app, not a separate deployable.
- **Product images via URL** (validated), not file upload — avoids storage/multipart surface in
  the time budget.

## Trade-offs and scope

- **Built fully so far:** project scaffolding, the Next→Nest proxy, the design-system
  foundation, and the complete data layer (schema, migrations, idempotent realistic seed) with
  relational + value integrity verified.
- **Deliberately simplified:** payment is mocked; images are URLs; categories are strings.
- **Known future work:** migrate the Prisma seed config to `prisma.config.ts` (the
  `package.json#prisma` key is deprecated in Prisma 7; harmless on the pinned v6); add a
  `Category` entity if category management is needed; optionally wire Stripe test mode and file
  upload; frontend component tests.
