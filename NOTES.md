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
