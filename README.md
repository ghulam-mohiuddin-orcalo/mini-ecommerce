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
| Styling | Tailwind CSS v4 + custom design system (no off-the-shelf UI kit) |
| Auth | JWT in an httpOnly cookie (frontend proxies `/api/*` to the backend, same-origin) |
| Money | Integer **minor units (cents)** everywhere |

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

Seed data also includes 14 products across 5 categories (Apparel, Home, Electronics, Books,
Outdoors), 5 orders spanning every status, and a populated cart for the customer.

## Payment (mock)

Checkout uses a **mock payment provider** — no real charges. It succeeds by default and returns
a synthetic reference. To exercise the failure path, the checkout page has a **"Simulate a
declined payment"** toggle (it sends the documented token `tok_decline`); a declined payment
rolls back the whole transaction — no order is created and no stock is changed. The provider sits
behind a `PaymentProvider` interface, so a real gateway (e.g. Stripe test mode) could be dropped
in without changing the checkout flow.

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
invalid/expired JWT, logout, RBAC), the product catalog (active-only visibility,
search/category/price filters, sorting, pagination boundaries, 404s), and the cart
(add/merge/update/remove, stock & active validation, totals, and **cross-user ownership
isolation**), and checkout (transactional success, empty cart, payment decline, insufficient
stock & inactive-product rollback, snapshot immutability, order ownership), and the admin panel
(RBAC on every admin route, product create/edit/activate with duplicate-SKU & validation
handling, the order state machine with cancellation restock, and analytics correctness), and
recommendations (purchase-history / cart / top-seller strategies, owned- and inactive-product
exclusion, related-by-category, and refresh-after-purchase) — 54 tests total.

## API (so far)

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/health` | public | Liveness check |
| POST | `/auth/signup` | public | Register a customer (sets auth cookie) |
| POST | `/auth/login` | public | Authenticate (sets auth cookie) |
| POST | `/auth/logout` | public | Clear the auth cookie |
| GET | `/auth/me` | authenticated | Current user |
| GET | `/users` | admin only | List users (sanitized) |
| GET | `/products` | public | List active products (`search`, `category`, `minPrice`, `maxPrice` in cents, `sort`, `page`, `pageSize`) |
| GET | `/products/categories` | public | Distinct categories |
| GET | `/products/:id` | public | Single active product (404 if inactive/missing) |
| GET | `/recommendations` | public (personalized if signed in) | Suggestions: purchase history → cart → top sellers |
| GET | `/recommendations/related/:productId` | public | Related products in the same category |
| GET | `/cart` | authenticated | Current user's cart with computed totals |
| POST | `/cart/items` | authenticated | Add units (merges into existing line) |
| PATCH | `/cart/items/:productId` | authenticated | Set absolute quantity for a line |
| DELETE | `/cart/items/:productId` | authenticated | Remove a line |
| DELETE | `/cart` | authenticated | Clear the cart |
| POST | `/orders` | authenticated | Checkout: create an order from the cart (transactional) |
| GET | `/orders` | authenticated | Current user's order history |
| GET | `/orders/:id` | authenticated | One of the user's own orders (404 otherwise) |
| GET | `/admin/products` | admin only | All products incl. inactive (`search`, `page`, `pageSize`) |
| POST | `/admin/products` | admin only | Create a product (409 on duplicate SKU) |
| PATCH | `/admin/products/:id` | admin only | Edit a product (SKU immutable) |
| PATCH | `/admin/products/:id/deactivate` | admin only | Soft-delete (deactivate) a product |
| PATCH | `/admin/products/:id/reactivate` | admin only | Reactivate a product |
| GET | `/admin/orders` | admin only | All orders (`status`, customer `search`, `page`, `pageSize`) |
| PATCH | `/admin/orders/:id/status` | admin only | Change status (state-machine enforced; cancel restocks) |
| GET | `/admin/analytics` | admin only | Dashboard: sales, order counts by status, top products, recent orders |

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
| `FRONTEND_ORIGIN` | Allowed CORS origin (default `http://localhost:3000`) |

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
