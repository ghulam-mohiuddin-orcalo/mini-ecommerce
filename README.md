# Mini E-Commerce Platform

A small but coherent e-commerce platform: a **customer storefront** and an **admin panel**
sharing a single API. Built as a timed full-stack assessment.

> **Status:** built incrementally, milestone by milestone. This README documents how to run
> what currently exists and is kept in sync as features land. See [`NOTES.md`](./NOTES.md)
> for architecture decisions, the agent workflow, and trade-offs.

## Tech stack

| Layer | Choice |
|---|---|
| Backend | NestJS 11 + TypeScript |
| ORM / DB | Prisma 6 + PostgreSQL 16 |
| Frontend | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + custom **"Pine & Parcel"** design system (no off-the-shelf UI kit); light + dark themes |
| Payments | Embedded **Stripe Payment Element** (Test Mode); order created server-side only after Stripe confirms |
| Auth | JWT in an httpOnly cookie (frontend proxies `/api/*` to the backend, same-origin) |
| Money | Integer **minor units (cents)** everywhere |

## Features

- **Storefront:** product catalog (search, category + price-range filter, sort by price/newest,
  pagination), product detail with an **image gallery**, optional **product variants**
  (colour/size with per-variant price/stock), **sale pricing** + derived merchandising **badges**
  (NEW / SALE / BESTSELLER / TRENDING), **verified-purchase reviews** with average ratings, a
  quantity add-to-cart, a server-side **wishlist**, persistent per-user cart, **in-app checkout**
  (embedded Stripe Payment Element with shipping/billing), saved **addresses**, order history +
  detail, signup/login + **password reset**, profile, settings, and personalized **product
  suggestions**. A **recently-viewed** rail (client-only view history) and a **journal** (CMS blog).
- **Admin panel** (role-gated): product create/edit/soft-delete, order management with a status
  state machine (`pending → processing → shipped → delivered`, `cancelled` restocks), a dashboard
  (total sales, orders-by-status chart, top sellers) with an accessible data-table fallback for
  the chart, and a **CMS** for the journal (articles with draft/publish), FAQ, static content
  blocks, and the contact-message inbox.
- **Cross-cutting:** light/dark mode with no flash-of-wrong-theme, loading/empty/error states
  throughout, client + server validation, integer-cents money, and accessible, responsive UI.
- **Content pages (CMS-backed):** About + policy pages (content blocks), Contact (stores real
  messages; also powers the footer newsletter signup), and a FAQ grouped by category.

## Prerequisites

- **Node.js 20+** (developed on 22) and npm
- **Docker** + Docker Compose (for PostgreSQL) — or your own PostgreSQL 16 instance

## Setup

```bash
# 1. Clone, then start PostgreSQL (from the repo root)
docker compose up -d

# 2. Backend env + dependencies
cd backend
cp .env.example .env            # defaults already match docker-compose.yml
npm install                     # postinstall runs `prisma generate`

# 3. Apply the database schema and seed demo data
npx prisma migrate deploy       # applies all migrations to the DB
npm run db:seed                 # idempotent — safe to re-run

# 4. Frontend dependencies (separate terminal)
cd ../frontend
cp .env.example .env.local      # optional; sensible defaults are built in
npm install
```

## Running

```bash
# Terminal 1 — backend API on http://localhost:3001
cd backend && npm run start:dev

# Terminal 2 — frontend on http://localhost:3000 (proxies /api/* to the backend)
cd frontend && npm run dev
```

Health check: `curl http://localhost:3001/health` → `{"status":"ok",...}`
(or through the proxy: `curl http://localhost:3000/api/health`).

**API docs (Swagger UI):** http://localhost:3001/api/docs (OpenAPI JSON at
`/api/docs-json`). Enabled in development; automatically disabled when `NODE_ENV=production`.

## Seeded login credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@shop.test` | `Admin123!` |
| Customer | `customer@shop.test` | `Customer123!` |

Seed data also includes 24 products across 5 categories (Apparel, Home, Electronics, Books,
Outdoors) — a couple on sale and a couple variant-bearing — 5 orders spanning every status, a
populated cart, a few customer reviews, two saved addresses, a 3-item wishlist for the customer,
and CMS content: 4 published journal articles (one category), 2 FAQ categories, and 5 static
content blocks (About / Privacy / Terms / Shipping / Returns).

## Payment (embedded Stripe Payment Element — Test Mode)

Checkout is **fully in-app** (Test Mode, no real charges): the customer enters shipping/billing
details and pays with an embedded **Stripe Payment Element** on `/checkout` and **never leaves the
site**. As before, **the order is only created after Stripe confirms payment**, never before, and
all amounts are computed server-side from the database.

How it works:

1. On `/checkout`, `POST /payments/payment-intent` creates a **PaymentIntent** whose `amount` is
   computed **from current database prices** (the client never sends prices/totals); `userId`/`cartId`
   go in the PaymentIntent metadata. The returned `clientSecret` mounts the Stripe Payment Element
   in the page.
2. The customer fills shipping + billing and submits. The browser calls
   `stripe.confirmPayment({ redirect: 'if_required' })` — card payments confirm **in-place**; only a
   step like 3-D Secure triggers a redirect (handled, see below). Shipping/billing are sent to Stripe
   (receipt + dashboard), not persisted in our DB.
3. The order is created **only** from a Stripe-confirmed payment. Fulfilment runs through the existing
   **transactional checkout core** — re-read products, validate stock, **recompute the total
   server-side, assert it equals the amount Stripe authorized**, decrement stock, create the order +
   items, clear the cart — all in one transaction. If any check fails (including an amount mismatch),
   **no order is created**. It is reached two ways, both idempotent on the PaymentIntent id (stored in
   the unique `stripeSessionId` column):
   - the page polls `GET /payments/payment-intent/:id`, which fulfils on the spot if Stripe reports the
     PaymentIntent `succeeded`; and/or
   - a signed **`payment_intent.succeeded`** webhook to `POST /payments/webhook`.
   Either path creates the order **exactly once**, so it works with or without a local webhook
   forwarder, and duplicate deliveries never double-create.
4. If a redirect *was* required (e.g. 3-D Secure), Stripe returns to `/checkout/success?payment_intent=…`,
   which polls the same endpoint and forwards to the order confirmation page (`/orders/:id`).

**Why embedded Elements:** the assessment calls for an in-app checkout where the user never leaves the
site, so the storefront uses the **Payment Element** (Stripe-hosted *iframes* embedded in our page —
card data still never touches our servers). The legacy hosted-Checkout endpoints
(`/payments/checkout-session`) remain in the codebase behind the same fulfilment core; see
[`NOTES.md`](./NOTES.md) for the migration and the trade-offs.

### Configuring Stripe (Test Mode)

Add your test keys to `backend/.env` and `frontend/.env.local`:

```bash
# backend/.env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...      # optional locally — see below
# frontend/.env.local  (the publishable key is used by Stripe.js in the browser)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

The success page reconciles directly with Stripe, so **webhook forwarding is optional** for local
dev. To exercise the webhook path too, run the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe listen --forward-to http://localhost:3001/payments/webhook
# copy the printed whsec_... into STRIPE_WEBHOOK_SECRET, then restart the backend
```

Pay with Stripe's test card **`4242 4242 4242 4242`**, any future expiry, any CVC and ZIP.
If `STRIPE_SECRET_KEY` is unset the app still boots, but any payment call returns **503**; if
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is unset the checkout page shows a clear "payments not
configured" message instead of the card form.

## Testing

Backend e2e tests (Jest + Supertest) run against a **dedicated test database** so they never
touch your dev data (the suite also refuses to run unless `DATABASE_URL` names a `*test*` DB).

```bash
cd backend
# one-time: create the test database
docker exec mini_ecommerce_db psql -U shop -d postgres -c "CREATE DATABASE mini_ecommerce_test;"
# run (pretest applies migrations automatically)
DATABASE_URL="postgresql://shop:shop@localhost:5432/mini_ecommerce_test?schema=public" npm run test:e2e
```

Current coverage: authentication & authorization (signup/login, invalid credentials,
invalid/expired JWT, logout, RBAC, **case-insensitive email normalization**), the product
catalog (active-only visibility, search/category/price filters, sorting, pagination boundaries,
404s), and the cart (add/merge/update/remove, stock & active validation, totals, and **cross-user
ownership isolation**), and checkout (transactional success, empty cart, payment decline,
insufficient stock & inactive-product rollback, snapshot immutability, order ownership), and the
admin panel (RBAC on every admin route, product create/edit/activate with duplicate-SKU &
validation handling, the order state machine with cancellation restock, and analytics
correctness), and recommendations (purchase-history / cart / top-seller strategies, owned- and
inactive-product exclusion, related-by-category, and refresh-after-purchase) — **57 e2e tests**.

Fast **unit tests** cover pure logic (the order state-machine transition matrix) and the **Stripe
webhook handler** (signature rejection, paid-event fulfilment, idempotent duplicate delivery,
out-of-stock acknowledgement, unrelated/unpaid events) — they run without a database or a live
Stripe account via `npm test` (20 tests).

**Frontend tests** (Vitest + Testing Library, jsdom — no server needed):

```bash
cd frontend && npm test
```

They cover the checkout address validation rules, money formatting + line-total summation (integer
cents, no float drift), and the **checkout page's render states** — including a **regression test**
for the first-load bug where the page got stuck on a skeleton on client-side navigation: the form
must render on the first render once the PaymentIntent is ready, plus the loading / empty-cart /
unauthenticated / error states (15 tests).

## API

Swagger UI documents every route at `/api/docs`. The full surface, grouped by access level:

### Public

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Liveness check |
| POST | `/auth/signup` | Register a customer (sets auth cookie) |
| POST | `/auth/login` | Authenticate (sets auth cookie) |
| POST | `/auth/logout` | Clear the auth cookie |
| POST | `/auth/forgot-password` | Request a reset link; always 200, never reveals if the email exists |
| POST | `/auth/reset-password` | Reset the password with a valid, unused, unexpired token |
| GET | `/products` | List active products (`search`, `category`, `minPrice`, `maxPrice` in cents, `sort`, `page`, `pageSize`) |
| GET | `/products/categories` | Distinct categories |
| GET | `/products/:id` | Single active product incl. gallery/variants/ratings/badges (404 if inactive/missing) |
| GET | `/products/:productId/reviews` | A product's reviews, newest first (paginated) |
| GET | `/reviews/featured` | Top-rated recent reviews across the catalog (`limit`) |
| GET | `/recommendations` | Suggestions: purchase history → cart → top sellers (personalized if signed in) |
| GET | `/recommendations/related/:productId` | Related products in the same category |
| GET | `/articles` | List published journal articles (`search`, `category`, `page`, `pageSize`) |
| GET | `/articles/categories` | Article categories with published articles |
| GET | `/articles/:slug` | A single published article by slug (404 otherwise) |
| GET | `/articles/:slug/related` | Related published articles (same category) |
| GET | `/faq` | FAQ grouped by category |
| GET | `/content/:key` | A static content block by key (e.g. `about`, `privacy`) |
| POST | `/contact` | Submit a contact / newsletter message (stored; generic ack) |
| POST | `/payments/webhook` | Stripe webhook (signed): `payment_intent.succeeded` / `checkout.session.completed` → fulfil |

### Authenticated (customer)

| Method | Route | Purpose |
|---|---|---|
| GET | `/auth/me` | Current user |
| POST | `/auth/change-password` | Change password (requires the current password) |
| GET | `/cart` | Current user's cart with computed totals |
| POST | `/cart/items` | Add units (merges into existing line; optional `variantId`) |
| PATCH | `/cart/items/:productId` | Set absolute quantity for a line |
| DELETE | `/cart/items/:productId` | Remove a line |
| DELETE | `/cart` | Clear the cart |
| POST | `/orders` | Mock checkout: create an order from the cart (transactional; retained, exercises rollback tests) |
| GET | `/orders` | Current user's order history |
| GET | `/orders/:id` | One of the user's own orders (404 otherwise) |
| POST | `/products/:productId/reviews` | Review a product (verified-purchase gated; one per product) |
| DELETE | `/reviews/:id` | Delete a review (author or admin only) |
| GET | `/wishlist` | Current user's wishlist (newest first) |
| POST | `/wishlist/items` | Add a product to the wishlist (idempotent) |
| DELETE | `/wishlist/items/:productId` | Remove a product from the wishlist (idempotent) |
| POST | `/wishlist/toggle` | Toggle a product on the wishlist |
| GET | `/addresses` | List the user's addresses (default first) |
| POST | `/addresses` | Create an address (first one / `isDefault` becomes default) |
| PATCH | `/addresses/:id` | Update an owned address |
| POST | `/addresses/:id/default` | Make an owned address the default |
| DELETE | `/addresses/:id` | Delete an owned address |
| POST | `/payments/payment-intent` | Create a PaymentIntent from the cart (embedded checkout); amount computed server-side |
| GET | `/payments/payment-intent/:id` | Reconcile a PaymentIntent → its order once fulfilled (idempotent) |
| POST | `/payments/checkout-session` | *(Legacy hosted Checkout)* create a Checkout Session from the cart |
| GET | `/payments/checkout-session/:id` | *(Legacy)* reconcile a Checkout Session → its order |

### Admin only

| Method | Route | Purpose |
|---|---|---|
| GET | `/users` | List users (sanitized) |
| GET | `/admin/products` | All products incl. inactive (`search`, `page`, `pageSize`) |
| POST | `/admin/products` | Create a product (409 on duplicate SKU) |
| PATCH | `/admin/products/:id` | Edit a product (SKU immutable) |
| PATCH | `/admin/products/:id/deactivate` | Soft-delete (deactivate) a product |
| PATCH | `/admin/products/:id/reactivate` | Reactivate a product |
| GET | `/admin/orders` | All orders (`status`, customer `search`, `page`, `pageSize`) |
| PATCH | `/admin/orders/:id/status` | Change status (state-machine enforced; cancel restocks) |
| GET | `/admin/analytics` | Dashboard: sales, order counts by status, top products, recent orders |
| GET | `/admin/articles` | List all articles incl. drafts (`search`, `page`, `pageSize`) |
| GET | `/admin/articles/categories` | List all article categories |
| POST | `/admin/articles/categories` | Create an article category (409 on duplicate slug) |
| GET | `/admin/articles/:id` | A single article incl. drafts |
| POST | `/admin/articles` | Create an article (409 on duplicate slug) |
| PATCH | `/admin/articles/:id` | Edit an article |
| PATCH | `/admin/articles/:id/publish` | Publish an article |
| PATCH | `/admin/articles/:id/unpublish` | Unpublish (revert to draft) |
| DELETE | `/admin/articles/:id` | Delete an article |
| POST | `/admin/faq/categories` | Create a FAQ category |
| PATCH | `/admin/faq/categories/:id` | Update / reorder a FAQ category |
| DELETE | `/admin/faq/categories/:id` | Delete a FAQ category (items cascade) |
| POST | `/admin/faq/items` | Create a FAQ item under a category |
| PATCH | `/admin/faq/items/:id` | Update / move / reorder a FAQ item |
| DELETE | `/admin/faq/items/:id` | Delete a FAQ item |
| GET | `/admin/content` | List all static content blocks |
| GET | `/admin/content/:key` | A single content block by key |
| PUT | `/admin/content/:key` | Create or replace a content block by key |
| DELETE | `/admin/content/:key` | Delete a content block by key |
| GET | `/admin/contact` | List contact messages (paginated, newest first) |
| PATCH | `/admin/contact/:id` | Mark a contact message handled / unhandled |
| DELETE | `/admin/contact/:id` | Delete a contact message |

## Useful commands (backend)

| Command | Purpose |
|---|---|
| `npm run start:dev` | Run the API with watch mode |
| `npm run build` | Compile the API |
| `npm run db:seed` | (Re)seed demo data — idempotent |
| `npm run prisma:studio` | Inspect the database at http://localhost:5555 |
| `npx prisma migrate dev` | Create + apply a migration during development |

## Environment variables

**backend/.env**

| Var | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign JWTs (keep out of source control) |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`) |
| `PORT` | API port (default 3001) |
| `NODE_ENV` | `development` / `production`. Gates Swagger UI **and** the dev-only echo of the password-reset token in the `/auth/forgot-password` response (echoed only when `!== 'production'`) |
| `AUTH_THROTTLE_LIMIT` | Max auth attempts (signup/login/forgot/reset) per 60s window per IP (default 10) |
| `FRONTEND_ORIGIN` | Allowed CORS origin (default `http://localhost:3000`) |
| `STRIPE_SECRET_KEY` | Stripe Test Mode secret key (server-only). Blank disables payments (calls return 503) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret; every incoming webhook signature is verified against it |
| `STRIPE_CURRENCY` | ISO 4217 currency for Checkout line items, lowercase (default `usd`) |

**frontend/.env.local**

| Var | Description |
|---|---|
| `BACKEND_ORIGIN` | Origin the `/api/*` proxy targets (default `http://localhost:3001`) |

Real secrets live only in `.env` files, which are git-ignored. `.env.example` files document
the required variables.

## Project structure

```
backend/    NestJS API (Prisma schema, migrations, seed, modules)
frontend/   Next.js App Router app (storefront + admin), Tailwind design system
docker-compose.yml   Local PostgreSQL
CLAUDE.md   Project-context file driving the agentic workflow
NOTES.md    Architecture, agent workflow, assumptions, trade-offs
```
