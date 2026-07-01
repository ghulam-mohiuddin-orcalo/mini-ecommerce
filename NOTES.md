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
- **Design:** continued the custom "Pine & Parcel" system — new primitives (`Input`, `Select`,
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

### Admin panel (Milestone 6) — role-gated surface over shared services
- **One app, two surfaces (no duplicate stack):** `AdminModule` imports `ProductsModule` and
  `OrdersModule` and adds three controllers (`admin/products`, `admin/orders`,
  `admin/analytics`) plus an `AnalyticsService`. Admin behaviour reuses the *same* services as
  the storefront — the only admin-specific service code is new methods (`findAllForAdmin`,
  `createProduct`, `updateProduct`, `setActive`, `updateStatus`) and the read-only analytics.
- **Authorization is the whole point:** every admin controller is class-level `@Roles(ADMIN)`.
  With the globally-registered `JwtAuthGuard` + `RolesGuard`, a customer gets **403** and an
  anonymous request **401** on every admin route — proven by an e2e loop over all three.
- **Product management:**
  - Admin listing returns **all** products incl. inactive (the public catalog hides inactive);
    paginated, newest-first, optional name search.
  - Create/edit use dedicated DTOs; **SKU is immutable** (`UpdateProductDto =
    PartialType(OmitType(CreateProductDto, ['sku']))`). A duplicate SKU surfaces as Prisma
    **P2002 → 409** via the global filter (no manual pre-check race).
  - **Delete is soft** (`deactivate`/`reactivate` flip `isActive`) — never a hard delete, so
    order-item snapshots and history stay intact, consistent with the M1 data-model contract.
- **Order management & the state machine:** the lifecycle lives in **one** source of truth
  (`order-state-machine.ts`): `PENDING→PROCESSING→SHIPPED→DELIVERED`, with `PENDING|PROCESSING
  →CANCELLED`; `DELIVERED`/`CANCELLED` are terminal. `updateStatus` runs in a **transaction**:
  it validates the transition (invalid → **409**), and **cancellation restocks every line
  atomically with the status change**, so stock and status can never drift apart. The frontend
  mirrors the same table (`orderTransitions.ts`) purely to render valid action buttons — the
  server re-validates and remains the authority.
- **Analytics (read-only):** a single service issues parallel aggregates — total sales
  (**excluding cancelled**), total orders, counts grouped by status (zero-filled for every enum
  value), top sellers by units from non-cancelled orders (grouped on the snapshot name), and the
  five most recent orders. All money stays in integer cents.
- **Frontend (fully integrated):** an `(admin)` route group with its own layout and a
  **client-side ADMIN gate** (the server stays the real authority — every admin API requires
  ADMIN). Dashboard with stat cards + a Recharts status bar chart + top-products and recent-
  orders panels; a products screen (searchable, paginated table with inline create/edit form and
  activate/deactivate); and an orders screen (status filter + customer search, expandable line
  items, and state-machine-driven transition buttons). A role-gated **Admin** link appears in the
  storefront header for admins, so the two surfaces connect end-to-end. TanStack Query mutations
  invalidate the relevant caches (and the public catalog/analytics) so views stay consistent.

### Recommendations (Milestone 7) — the open-ended requirement
- **Requirement:** "customers should see product suggestions relevant to them." Implemented as a
  **deterministic priority ladder** in a dedicated `RecommendationsService` — no ML, no
  randomness, no opaque scoring, so the behaviour is obvious, testable, and right-sized for the
  time budget:
  1. **Purchase history** — popular active products in categories the customer has *purchased*
     (non-cancelled orders), **excluding products they already own**.
  2. **Cart** (only if there's no order history) — popular active products in the categories
     currently in their cart, excluding the cart items themselves.
  3. **Top sellers** — global best sellers by units, **topped up with the newest** active
     products so the strip is never sparse on a low-traffic catalog. This is also the guest path.
- **Why this design:** it literally targets "relevant to *them*" (category affinity from real
  behaviour), reuses data we already have (orders, cart) with **no new schema**, and **degrades
  gracefully** — a brand-new visitor still gets a sensible list. Returning a `strategy` enum
  alongside the items makes the feature self-explaining and lets tests assert *why* a list was
  chosen, not just its contents.
- **"Popularity" is one definition everywhere:** total units sold across non-cancelled orders,
  with **stable tie-breaks** (units desc → newest → id) so output is fully deterministic.
- **Safety invariants:** inactive (soft-deleted) products are **never** recommended (every query
  filters `isActive: true`); already-owned/in-cart products are excluded; results are capped at
  **8**. If a chosen priority yields nothing after exclusions (e.g. the customer owns everything
  in their one category), it falls through to top sellers rather than returning an empty strip.
- **Product-detail context:** a second method, `getRelated(productId)`, returns other active
  products in the **same category** (excluding the product itself), falling back to top sellers
  for an unknown/lonely-category product — the "you might also like" strip.
- **Optional auth:** `GET /recommendations` is `@Public()` but wrapped in a new
  `OptionalJwtAuthGuard` (an `AuthGuard('jwt')` whose `handleRequest` never throws), so the
  endpoint **personalizes when a valid cookie is present and serves guests otherwise** — exactly
  what a home-page strip needs. `GET /recommendations/related/:productId` is fully public.
- **Performance:** each call is a small, bounded set of indexed queries (one `groupBy` for
  popularity + one `findMany` for the candidate set, with an over-fetch factor on top sellers to
  survive inactive rows). Ranking/tie-breaking is done in-memory over at most a few dozen
  candidates — no N+1, no per-product round trips.
- **Frontend:** one reusable `RecommendationsSection` (reuses the standard `ProductGrid`/
  `ProductCard`) that **renders nothing when empty** — wired into the **home page** ("Recommended
  for you" / "Popular right now" for guests), the **product detail page** ("You might also like"),
  and the **post-checkout** confirmation. The checkout mutation invalidates the `recommendations`
  query so suggestions reflect the just-completed purchase.
- **Trade-offs (deliberate):** category-affinity is a coarse signal — it won't capture
  cross-category complements ("bought a tent → suggest a sleeping bag") or per-item similarity.
  Popularity is computed on every request rather than precomputed, which is fine at this catalog
  size but wouldn't scale to millions of orders. No collaborative filtering, no embeddings, no
  recency/decay weighting. These are conscious omissions for a 5–6h build, not oversights.
- **How it could evolve into a real engine:** (1) precompute a product→units-sold rollup
  (materialized view / nightly job) and a category-affinity table per user, refreshed
  incrementally; (2) add **item-to-item collaborative filtering** ("customers who bought X also
  bought Y") from order co-occurrence; (3) introduce **content embeddings** (name/description/
  image) for cold-start similarity; (4) blend signals with weights + recency decay behind the
  same `strategy`-tagged interface, and (5) log impressions/clicks to evaluate and tune offline.
  The current `RecommendationsService` interface (one personalized method, one related method,
  both returning `{strategy, items}`) is the seam where any of these would slot in without
  touching controllers or the frontend.

### Stripe Checkout (payment upgrade) — Test Mode, reuse the integrity core
> **Superseded — kept as history.** The storefront later moved from hosted Checkout to an
> **embedded Stripe Payment Element** so the customer never leaves the site (see
> *"Embedded checkout"* below). The reasoning here records the original hosted-Checkout decision
> and still describes the server-authoritative + idempotent fulfilment model that the embedded
> flow reuses unchanged. The hosted-Checkout endpoints remain in the code behind the same core.

- **What changed:** the mocked in-process payment was replaced with **Stripe Checkout (Test
  Mode)**. The *integrity core was not rewritten* — the same transactional `createOrderFromCart`
  (re-read products → atomic stock decrement → server-side total → create order/items → clear
  cart) now backs both paths. Stripe fulfilment is a thin new entry point into it.
- **Why Stripe Checkout, not Stripe Elements (the key decision):**
  - **PCI scope.** Checkout is **Stripe-hosted** — the PAN is entered on Stripe's domain and never
    touches our servers or even our DOM, keeping us in the simplest **SAQ-A** bracket. Elements
    embeds Stripe-hosted iframes in *our* page: lower friction visually, but more integration
    surface (we own the payment form, its state, confirmation, and error handling).
  - **Coverage for free.** Checkout handles **3DS/SCA**, wallets (Apple/Google Pay), address/tax
    fields, promotion codes, emailed receipts, and localization out of the box. With Elements we'd
    wire `PaymentIntent` confirmation, `next_action`/3DS, and each payment method ourselves.
  - **Right-sized.** This is a breadth-first assessment; Checkout is the **most payment coverage
    for the least code**, and it maps cleanly onto our existing server-authoritative model: we
    hand Stripe a set of line items priced from the DB and let it run the UI. Elements is the right
    call when you need a bespoke in-page payment UX — not a goal here.
  - **Same security posture either way.** Both verify webhooks and keep the secret key server-side;
    Checkout simply removes the card-handling surface entirely.
- **Server-authoritative, prices never trusted:** `POST /payments/checkout-session` loads the
  user's cart and builds Stripe `line_items` with `unit_amount = product.priceCents` read **from
  the DB at request time** — the client sends nothing but its cookie. `userId` + `cartId` go into
  the session **metadata** (and the PaymentIntent metadata) so fulfilment binds to the right
  cart/user.
- **Order is created only after Stripe confirms payment.** Creating the session changes nothing.
  The order is created exclusively from a **verified** `checkout.session.completed` whose
  `payment_status === 'paid'`. The webhook (`POST /payments/webhook`, `@Public()`):
  1. **verifies the signature** against the *raw* request body (`NestFactory({ rawBody: true })`)
     using `STRIPE_WEBHOOK_SECRET` — an invalid/missing signature is **400** and never processed;
  2. **re-reads products, re-validates stock, recomputes the total** server-side, then runs the
     existing transaction to **decrement stock, create the order + items, and clear the cart** —
     any failure rolls the whole thing back, so a failed validation creates no order.
- **Exactly-once / idempotency (3 layers):** `Order.stripeSessionId` is **UNIQUE**; the
  transaction first short-circuits if an order for that session already exists; and a concurrent
  double-delivery that races past the check loses on the unique index (P2002) and returns the
  winner's order. So duplicate webhook deliveries — which Stripe *will* send — never double-create
  an order or double-decrement stock.
- **Reliable without a webhook forwarder:** the success page (`/checkout/success?session_id=…`)
  polls `GET /payments/checkout-session/:id`, which returns the fulfilled order if the webhook
  already ran, **or** retrieves the session from Stripe and fulfils it then (idempotently, ownership
  checked). Both paths converge on the same `fulfillStripeCheckout`, so local dev works whether or
  not `stripe listen` is running, and the order is still created exactly once.
- **Business vs transient failure handling:** at fulfilment, a permanent business failure
  (cart emptied, out-of-stock) is **logged and acknowledged with 200** (so Stripe stops retrying a
  hopeless event — a production system would refund here); an unexpected error bubbles up as **500**
  so Stripe retries. The payment is already captured, so the Stripe path's `settle()` just returns
  the PaymentIntent reference rather than charging.
- **Secrets & config:** `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` are server-only env vars
  (never shipped to the browser); only the `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is public by
  design. Test Mode only (`sk_test_…` / `whsec_…`). If the secret key is absent the app still boots
  and Stripe calls return **503** — payments are simply disabled, handy for non-payment dev.
- **Frontend:** the checkout page's mock panel became a single **"Proceed to Payment"** button that
  creates the session and `window.location`-redirects to Stripe's hosted page; new
  `/checkout/success` (polls, then forwards to the existing `/orders/[id]?placed=1` confirmation)
  and `/checkout/cancel` (no charge, cart intact) return pages. The hosted-redirect approach means
  no `@stripe/stripe-js` dependency is needed on the client.
- **Mock path retained, not deleted:** `OrdersService.checkout` (the `tok_decline`-testable mock)
  and its `PaymentProvider` interface stay in place behind the same core, so the transactional
  logic stays swappable and its e2e tests keep exercising the rollback paths — the Stripe upgrade
  is additive, not a rewrite of unrelated code.

### Embedded checkout (Stripe Payment Element) — moved on-site
- **Why the change:** the assessment's checkout requirement is an **in-app** experience where the
  customer never leaves the site. Hosted Checkout (above) redirects to `checkout.stripe.com`, so we
  moved the storefront to the **embedded Payment Element** — Stripe-hosted *iframes* mounted inside
  our `/checkout` page (card data still never touches our servers).
- **The integrity core was reused verbatim.** No rewrite: the same transactional
  `createOrderFromCart` (re-read products → atomic stock decrement → server-side total → create
  order/items → clear cart) backs the embedded path. The **PaymentIntent id is the idempotency
  key**, stored in the existing unique `stripeSessionId` column — so **no DB migration** was needed
  and exactly-once fulfilment carries over unchanged.
- **Flow:** `POST /payments/payment-intent` computes the amount **from DB prices** and returns a
  `clientSecret` (+ `userId`/`cartId` in PI metadata). The page mounts the Payment Element and
  collects shipping/billing (sent to Stripe for receipt/dashboard, **not persisted** — Order has no
  address columns and adding them wasn't required). `stripe.confirmPayment({ redirect: 'if_required' })`
  confirms cards in place; 3-D Secure returns to `/checkout/success?payment_intent=…`. Fulfilment is
  reached by a success-poll (`GET /payments/payment-intent/:id`) **and/or** a signed
  `payment_intent.succeeded` webhook — both converge on the idempotent core, so it works with or
  without a local webhook forwarder.
- **Amount-integrity hardening (anti-tamper / stale-cart guard):** the PaymentIntent's authorized
  `amount` is passed into `createOrderFromCart` as `expectedTotalCents`; inside the transaction the
  recomputed server-side total **must equal** it or the whole thing rolls back (no order, no stock
  consumed — a production system would refund). So a client can't influence the charged amount, and
  a cart that changed after payment was authorized fails safely rather than producing a mispriced
  order. The frontend poll surfaces that terminal failure instead of spinning.
- **Theme-aware, accessible:** the Payment Element's `appearance` is themed for light/dark (the one
  place literal colors are unavoidable — a cross-origin iframe can't read our CSS variables); the
  address form uses inline, `aria-describedby`-linked validation (extracted to a pure, unit-tested
  `lib/checkout-validation.ts`).
- **New client dependency:** `@stripe/stripe-js` + `@stripe/react-stripe-js` (the hosted flow needed
  neither). The publishable key (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) is now actually used in the
  browser; if it's absent the page shows a "payments not configured" state rather than crashing.

### Storefront redesign — gallery, variants, reviews, wishlist, sale/badges, CMS, addresses, password reset
A breadth pass that layered merchandising depth and content management onto the existing core
**without disturbing the integrity invariants**. Three additive migrations
(`add_product_gallery_variants_sale_price`, `add_reviews_addresses_wishlist`,
`add_cms_and_password_reset`) and an expanded seed back it. Key decisions and trade-offs:

- **Variants are additive and optional — the integrity core is untouched.** A product can have
  **zero** variants, in which case it behaves exactly as before (base `priceCents`/`stock`, the
  same atomic conditional decrement, the same order-item snapshot). `ProductVariant` adds
  per-variant `priceCents`/`stock`/`sku`; `CartItem`/`OrderItem` gain a nullable `variantId`, and
  `OrderItem` snapshots a `variantLabel` alongside the existing name/price snapshot so historical
  orders survive variant edits/deletes. The cart's uniqueness key widened from `(cartId,
  productId)` to `(cartId, productId, variantId)` so the same product in two variants are distinct
  lines. **Deliberate scope:** zero-variant products are the unchanged, well-tested path; variants
  ride the *same* transactional decrement and snapshot machinery rather than a parallel one, so the
  oversell guard and snapshot immutability that M5 proved still hold. `OrderItem → ProductVariant`
  is `Restrict` (mirrors the product backstop), keeping the soft-delete contract.
- **Reviews require a real verified purchase.** `POST /products/:id/reviews` only succeeds if the
  author has a **paid** order (`paidAt` set) containing that product — checked against
  authoritative order data, never trusted from the client. One review per `(productId, userId)`
  (DB unique → P2002 → **409**); a DB `CHECK (rating BETWEEN 1 AND 5)` backs the DTO. Listing joins
  the author's **name only** (never email/id), so reviews can't leak account identifiers. Deletion
  is author-or-admin (403 otherwise, 404 if missing) — ownership-checked, no IDOR. `ratingAvg`/
  `ratingCount` on the product response are **derived** from real rows, not stored.
- **Badges are derived from real data, never stored flags.** `deriveBadges` computes NEW (created
  within 30 days), SALE (`compareAtPriceCents > priceCents`), and BESTSELLER/TRENDING (units sold
  across non-cancelled orders, thresholds 20 / 5) at response time. Same explainable, deterministic
  spirit as recommendations — no opaque scoring, nothing to keep in sync, no migration to "unset" a
  stale badge. `compareAtPriceCents` is the strike-through "was" price (a DB CHECK enforces
  `NULL OR > 0`); the SALE badge and the strike-through both fall out of it.
- **Wishlist is server-side, per-user — not localStorage.** A `WishlistItem` table keyed unique on
  `(userId, productId)`; every route is scoped to the JWT user id (no client-supplied userId, no
  IDOR), add/remove/toggle are idempotent. Chosen over localStorage so it **syncs across devices**
  and is a genuine account feature, consistent with the cart's server-authoritative design.
- **Recently-viewed *is* localStorage — intentionally.** The "recently viewed" rail is **view
  history**, not a saved list: a privacy-light, device-local convenience that doesn't warrant a
  table or a write on every page view. It reads ids from `localStorage` and resolves them through
  the product cache, renders nothing when empty, and degrades silently if storage is unavailable.
  Clearly distinct from the wishlist — flagged here so the two aren't conflated.
- **Content is CMS-backed with draft/publish, not hard-coded.** `Article` (+ `ArticleCategory`)
  for the journal carries an `ArticleStatus` (`DRAFT`/`PUBLISHED`) with a `publishedAt`; **public
  read endpoints only ever return PUBLISHED**, admin endpoints see drafts too. `FaqCategory`/
  `FaqItem` (ordered by `position`), `ContentBlock` (keyed by `key`, e.g. `about`/`privacy`), and
  `ContactMessage` (real intake for both the contact form and the footer newsletter, with a
  handled/unhandled admin inbox) round it out. Slugs/keys are unique (duplicate → **409**). The
  About/policy pages and FAQ are now editable through the admin panel rather than redeployed.
- **Addresses are a saved-address book, scoped + ownership-checked.** `Address` per user with a
  single-default invariant (creating/▶setting a default unsets the previous; deleting the default
  promotes the newest remaining). By-id routes 404 for another user's address (no IDOR). **Note:**
  this is an account convenience — checkout still sends shipping/billing to Stripe and the `Order`
  still has no address columns (the M-checkout assumption is unchanged); these saved addresses are
  not yet wired into the order record.

### Categories become a first-class, admin-managed entity
A product's category was originally a free-text `String` column, and the "list of categories" was
just the distinct set of those strings computed at query time (the old `GET /products/categories`).
That allowed typos and duplicates (`"Electronic"` vs `"Electronics"`), gave admins **no way to
manage** the taxonomy, and hardcoded per-category presentation in the storefront grid. This refactor
promotes categories to a real, admin-managed `Category` entity that products reference by FK.

- **Data model.** New `Category` (`id, name @unique, slug @unique, description?, imageUrl?, isActive,
  sortOrder, createdAt, updatedAt`). `Product.category: String` is **replaced** by a required
  `categoryId` FK with `onDelete: Restrict` (a DB backstop against orphaning), and the composite
  catalog index moved from `(isActive, category)` to `(isActive, categoryId)`. The existing CMS
  `ArticleCategory`/`FaqCategory` models were the near-exact template (slugify / unique-slug /
  P2002→409), so we mirrored those patterns rather than invent new ones.
- **Data-preserving migration.** A hand-edited migration backfills with zero loss, in order:
  create `Category`; add `categoryId` as **nullable**; `INSERT` one `Category` row per
  `DISTINCT` existing `Product.category` string (name = the old string, derived slug); `UPDATE`
  every product to point at its category by name; then `SET NOT NULL`, add the FK, and drop the old
  index + string column. The backfill **must** sit between add-nullable-column and set-NOT-NULL —
  verified on a scratch/`*test*` DB before touching dev data (see risks below).
- **Delete semantics (reconciles the spec's "prevent delete" *and* "soft delete").**
  **Deactivate/Activate** toggles `isActive` — the everyday "hide from the storefront without
  deleting" path (public reads only ever return active categories). **DELETE** is permanent and
  returns **409 with a clear message** if any product still references the category; with zero
  references it hard-deletes (safe, since `categoryId` is required so no orphans are possible).
- **Endpoint paths follow the repo's security convention, not the spec's literal `POST /categories`.**
  Every admin write is guarded under `/admin` behind `RolesGuard` + `@Roles(ADMIN)`, matching the
  products/articles/faq admin controllers. So: public `GET /categories`, `GET /categories/:slug`;
  admin `GET|POST /admin/categories`, `GET|PATCH|DELETE /admin/categories/:id`, and
  `PATCH /admin/categories/:id/{activate,deactivate}`.
- **Category image is a URL string** (`imageUrl?`), not an upload — no upload infra was added,
  consistent with `Product.imageUrl` and `Article.coverUrl`.
- **Order history is preserved.** `OrderItem.productCategory` **stays** as a string snapshot; it is
  now populated at checkout from `product.category.name`. Renaming or removing a category never
  rewrites historical orders (non-negotiable per CLAUDE.md's snapshot rule).
- **Product API shape changed (breaking, done in the same change).** A product's `category` is now a
  nested `{ id, name, slug }` object (relation-loaded) instead of a bare string, and the storefront
  list filter `?category=` now matches on the **slug** (mirrors articles). All frontend consumers
  were updated in the same change and gated by typecheck + e2e.
- **Out of scope, intentionally.** The CMS `ArticleCategory` and `FaqCategory` taxonomies were left
  **untouched** — they are separate concerns with their own admin CRUD, and conflating them would
  add churn for no benefit.
- **Verified:** backend `npm run build` clean; frontend `npm run typecheck` + `npm run build` clean;
  Jest **45 unit + 203 e2e** green (new `categories.e2e-spec.ts` covers CRUD, unique-name/slug 409,
  slug auto-gen, delete-blocked-while-products-assigned 409 + message, delete-allowed-when-empty,
  activate/deactivate, and admin RBAC; product/order/recommendation/admin specs updated for the FK,
  slug filter, and nested-category shape, plus a migration-integrity assertion that seeded products
  keep their category after migrate). Runtime, through the Next `/api` proxy: seeded products still
  show their category; admin can create/edit/activate/deactivate/delete (delete 409s while products
  are assigned); product create/edit only offers existing categories (no free-text); the home grid
  and shop filters populate from the DB; `/products?category=<slug>` filters correctly.

### Password reset — the one intentional stub (delivery only)
- **The token flow is real; only email *delivery* is stubbed.** This repo ships **no mailer**, so
  there is exactly one intentional stub in the system: the channel that would email the reset link.
  Everything security-relevant about the flow is genuine:
  - `POST /auth/forgot-password` generates a **cryptographically random** token
    (`randomBytes(32)`), stores only its **sha256 hash** (`PasswordResetToken.tokenHash`) — the raw
    token never hits the DB — with a **1-hour expiry**, and invalidates any prior unused token for
    that user. It is **single-use** (`usedAt` stamped on redeem) and returns an identical generic
    200 whether or not the email exists (**no user enumeration**). Rate-limited like login/signup.
  - `POST /auth/reset-password` accepts a raw token, re-hashes and looks it up by
    `{ tokenHash, usedAt: null, expiresAt > now }`, sets the new password, and marks it used — all
    in one transaction. It does **not** auto-login (client redirects to `/login`).
- **How the stub is bounded:** the link/token is always **logged server-side**, and the raw token
  is **echoed in the `/auth/forgot-password` response only when `NODE_ENV !== 'production'`** so the
  flow is exercisable end-to-end without an inbox. This gate is load-bearing and must stay — tokens
  must never be echoed in production. Swapping in a real mailer is a one-call change at the point
  where we currently log; nothing else about the flow changes.

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
- **Stripe Checkout (Test Mode)** for payment, layered onto the existing swappable
  `PaymentProvider`/transactional core (the mock path is retained behind the same core). Hosted
  Checkout was chosen over Elements to keep card data off our servers (PCI SAQ-A) and get
  3DS/wallets/receipts for free — see the dedicated section above.
- **Tailwind v4 + custom design tokens** ("Pine & Parcel") instead of an off-the-shelf UI kit,
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
6. **A latent e2e teardown bug exposed by a new suite (M6).** Adding `admin.e2e-spec.ts`
   (alphabetically first, and it creates orders) made the cart suite fail at
   `prisma.user.deleteMany()` with an `Order_userId_fkey` violation. Root cause was **not** the
   new code: the cart suite's `beforeAll` cleanup deleted `orderItem` but never `order`, so it
   only worked while no earlier suite left orders behind (pre-M6, `orders` ran *after* `cart`).
   Jest reorders suites by timing, so the assumption was always fragile. Fixed by making cart's
   teardown FK-complete (`order.deleteMany()` before `user.deleteMany()`, mirroring the orders
   suite) and giving the admin suite a symmetric `afterAll` cleanup. The admin module's own
   tests passed in isolation throughout — the failure was purely shared-DB test ordering.
   *Lesson: shared-DB e2e suites must each be self-sufficient in FK-safe order; don't rely on
   run order.*
7. **Embedded checkout shipped with a first-load race (caught by reproducing, not by reading).**
   The first cut of the embedded checkout created the PaymentIntent imperatively in a
   `useEffect`+`useRef`+`mutate()`. It worked on a hard refresh but, on **client-side navigation**
   (cart → checkout), the page got stuck on the loading skeleton — data only appeared after a manual
   refresh. The agent's first instinct (and a static read) said the logic looked correct. Root cause,
   found by **reproducing it in a headless browser**: under React's dev StrictMode mount→unmount→
   remount, `mutate()` fired during the churn; the `useRef` guard survived the remount but the
   `useMutation` *observer* was recreated, so the in-flight result was orphaned and the guard blocked
   any retry. Fixed properly by fetching the PaymentIntent with a **cache-backed `useQuery`**
   (`usePaymentIntent`) keyed on cart state — remount-safe, deterministic, deduped — and removing a
   `key={resolvedTheme}` that remounted Stripe Elements. A **regression test** now asserts the form
   renders on the first render once the intent is ready. *Lesson: "works on refresh, not on
   navigation" is almost always a remount/cache-lifecycle bug — reproduce the exact navigation, don't
   trust a static read; and fetch render-critical data with a query, not an effect.*

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
- **M6 (admin):**
  - 10 admin e2e tests (RBAC: customer→403 and anon→401 across all three admin routes,
    admin→200; product create/duplicate-SKU 409/validation 422/edit/deactivate→hidden from public
    catalog/reactivate→visible again; state machine: valid forward transitions, invalid→409,
    cancel-PENDING restores stock, cancel-DELIVERED→409 with stock unchanged, customer status
    change→403; analytics: sales excludes cancelled, total count, counts by status, top product
    units) — **48 tests total**, full suite green.
  - **Caught a shared-DB teardown bug** the new suite exposed (FK ordering in `cart`'s cleanup)
    and fixed it so the whole suite is order-independent — see "mistakes caught" #6.
  - Frontend: `tsc --noEmit` clean and a full `next build` succeeds with the new `/admin`,
    `/admin/products`, and `/admin/orders` routes (admin dashboard carries Recharts, ~225 kB
    first load — acceptable for an admin-only screen).
- **M7 (recommendations):**
  - 6 e2e tests — guest→top sellers (active-only, popularity-ordered, inactive excluded);
    purchase-history strategy (recommends same-category products, **excludes owned**, excludes
    inactive); cart strategy for a new customer (recommends cart-category products, excludes the
    cart item); **recommendations update after a purchase** (cart→history switch verified);
    related-by-category (same category, excludes self + inactive + other categories); and
    related-of-unknown-product fallback — **54 tests total**, full suite green.
  - Frontend `tsc --noEmit` clean and full `next build` succeeds with the strips wired into home,
    product detail, and post-checkout.
- **Pre-submission polish:**
  - **Email normalization** — signup/login now trim + lowercase the email at the validation
    boundary (`@NormalizeEmail()` before `@IsEmail`), so duplicate detection and credential
    lookup share one canonical form. Fixes a real defect where `User@x.com` and `user@x.com`
    were distinct accounts and case affected login. Covered by 3 new e2e tests (57 e2e total).
  - **Unit tests** — added a fast, DB-free Jest setup (`npm test`, `rootDir: src`) and a unit
    suite for the order state machine (transition matrix, terminal states, no-op rejection,
    `isCancellation`) — 12 tests. Complements the e2e suite without duplicating it.
  - **Next.js App Router UX** — added root `loading.tsx`, `error.tsx` (error boundary wired to
    `reset()`), and `not-found.tsx`, all reusing the existing `Skeleton`/`ErrorState`/
    `EmptyState` primitives for a consistent look.
- **Stripe Checkout (payment upgrade):**
  - **Unit tests (DB-free, no live Stripe)** for the webhook handler — invalid signature → 400 and
    never fulfilled; missing signature → 400; paid `checkout.session.completed` → fulfils exactly
    once with the right metadata; **duplicate delivery** routes to the idempotent core both times;
    out-of-stock at fulfilment → acknowledged (200) with no order; unexpected error → re-thrown
    (500, Stripe retries); unpaid/unrelated events ignored. 8 tests (20 unit total). The
    exactly-once / stock-decremented-once integrity itself is the existing transactional core,
    already covered by the checkout e2e suite.
  - **Manual end-to-end (Stripe CLI + test card 4242…):** successful payment creates the order
    once, decrements stock, and clears the cart; **cancel** returns to `/checkout/cancel` with the
    cart intact and no order; **invalid signature** (tampered payload) → 400, not processed;
    **duplicate webhook** (`stripe trigger` / re-sent event) creates no second order;
    **out-of-stock during webhook** (stock zeroed before fulfilment) creates no order and the paid
    session is logged for refund; **cart cleared only after** the webhook fulfils, never at session
    creation.
  - Frontend `tsc --noEmit` clean and a full `next build` succeeds with the new
    `/checkout/success` and `/checkout/cancel` routes.
- **Embedded checkout + final polish pass:**
  - **Reproduced the first-load checkout bug in a headless browser** (system Chrome via
    `playwright-core`), confirmed the fix (form renders on first client-nav, 0 skeletons), and
    verified *navigate-away-and-back reuses the same PaymentIntent* (exactly one create call) and
    the *empty-cart* state — then removed the throwaway harness.
  - **Live end-to-end against Stripe Test Mode:** created a PaymentIntent from the cart
    (amount = 2 × 3299 = 6598, server-computed), confirmed it with `pm_card_visa`, polled the
    status endpoint → order created once (`PENDING`, total 6598, snapshot correct), cart cleared,
    and a second poll returned the **same** order id (idempotent). New endpoints return **401**
    unauthenticated.
  - **Amount-integrity** wired through `expectedTotalCents` and asserted in the payments unit spec
    (the authorized amount is forwarded to fulfilment).
  - **Frontend tests** added (Vitest + Testing Library): checkout validation, money formatting +
    line-total summation, and checkout-page render states incl. the regression — **15 tests**,
    `npm test` green; `tsc --noEmit` and `next build` clean.
- **Storefront redesign (gallery / variants / reviews / wishlist / sale-badges / CMS / addresses /
  password reset):**
  - Three additive migrations applied cleanly from the existing baseline; the expanded seed is
    idempotent (re-run leaves identical counts) and now provisions 24 products (two on sale, two
    variant-bearing), customer reviews, two addresses (one default), a 3-item wishlist, 4 published
    articles + 1 category, 2 FAQ categories, and 5 content blocks.
  - **Backend gates green:** `npm run build` (TypeScript compile) clean, `npm test` (unit) and
    `npm run test:e2e` (Jest + Supertest against the `*test*` DB) both pass.
  - **Integrity invariants re-checked under the additive features:** zero-variant products still
    take the unchanged atomic-decrement + snapshot path; variant lines ride the same transaction;
    the review verified-purchase gate, one-per-product 409, ownership-checked deletion, and the
    no-enumeration password-reset flow (random token, sha256-at-rest, single-use, 1h expiry, dev
    echo gated on `NODE_ENV`) all behave as designed.
  - **Frontend gates green:** `tsc --noEmit` clean and a full `next build` succeeds — **33 routes**.

## Design workflow

- **Tooling:** the visual direction was produced with a **design agent** (Claude's design tooling)
  and iterated in-editor with Claude Code. The reference concept was a botanical "Verdant
  Storefront" — pine-green over warm paper — which became the **"Pine & Parcel"** system.
- **How it was directed & iterated:** I drove the agent from a written design brief (palette,
  type, radii/shadow scale, component inventory) rather than accepting a generic first pass —
  reviewing each surface and pushing back on spacing, hierarchy, and consistency. The look evolved
  across passes: (1) the base token system + primitives; (2) a polish pass adding the serif display
  face (Newsreader) for headings against Manrope body text, softer layered shadows, and hover/lift
  motion; (3) a **full light + dark theme** built entirely at the token layer — the same
  `--color-*` variables redefined under `html[data-theme='dark']`, so every utility flips with no
  per-component dark variants — plus a pre-paint bootstrap script that resolves the saved/`system`
  theme **before first paint** (no flash-of-wrong-theme), and a header toggle.
- **Custom, not a template:** every primitive (`Button`, `Input`, `Select`, `Badge`, `Toggle`,
  `Skeleton`, `States`, `Icon`) and layout is composed from our own Tailwind v4 tokens via `cn()`;
  no off-the-shelf UI kit or theme was dropped in. Icons are inlined Lucide paths (no runtime UI
  dependency).
- **Accessibility carried through the design:** visible focus rings on every interactive element,
  semantic landmarks, ARIA on menus/toggles/forms, `aria-describedby` inline form errors, an
  `sr-only` data-table fallback for the dashboard chart, and `prefers-reduced-motion` honoured.

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
- **Checkout addresses go to Stripe, not our DB.** Shipping/billing collected at checkout are sent
  to Stripe (`shipping` + `billing_details`, receipt email) for the payment record/receipt, but the
  `Order` model has **no address columns** — persisting them wasn't required and adding them would be
  a schema change for no in-app consumer. Flagged as future work if order addresses become a feature.
- **Theme is a device preference.** Light/dark/system is stored in `localStorage` and applied
  before paint; it isn't synced to the account (no backend preference store in scope).
- **Change password and password reset are now real;** the remaining account affordances are
  demo-only and labelled as such: *Delete account* is disabled ("coming soon") and *Edit profile*
  shows a demo notice. Password **reset email *delivery*** is the single intentional stub — the
  token flow itself is real (see "Password reset — the one intentional stub" above). The demo-only
  actions are clearly marked rather than presented as working.

## Trade-offs and scope

- **Built fully:** the whole storefront + admin end-to-end (catalog with **gallery / variants /
  reviews / sale-badges**, **wishlist**, cart, **embedded Stripe checkout**, orders, auth +
  **password reset / change password**, **saved addresses**, profile, settings, recommendations,
  the **journal / FAQ / content / contact CMS**, admin CRUD/orders/analytics + CMS management), the
  complete data layer (schema, migrations, idempotent seed) with relational + value integrity
  verified, a custom light/dark design system, and backend + frontend test suites.
- **Deliberately simplified:** images are URLs (not uploads); categories are strings; **variants
  are additive/optional** (zero-variant products are the unchanged core path); checkout addresses
  go to Stripe and saved addresses aren't yet wired into the order record. Payment is **Stripe Test
  Mode** via the embedded Payment Element; the legacy hosted-Checkout endpoints and the in-process
  mock provider are both retained behind the same transactional core (the mock still backs the
  rollback e2e tests).
- **The one intentional stub:** password-reset **email delivery** (no mailer in repo) — the token
  flow is real and the raw token is echoed only when `NODE_ENV !== 'production'`.
- **Known future work:** migrate the Prisma seed config to `prisma.config.ts` (the
  `package.json#prisma` key is deprecated in Prisma 7; harmless on the pinned v6); add a
  `Category` entity if category management is needed; persist a record of refunds/failed
  fulfilments (today an unfulfillable paid payment is logged for manual refund); wire a real mailer
  for password-reset delivery; wire the remaining demo-only account actions (edit profile / delete
  account) and persist order addresses (incl. picking from the saved address book) if those become
  real features; file upload; broaden frontend test coverage.
