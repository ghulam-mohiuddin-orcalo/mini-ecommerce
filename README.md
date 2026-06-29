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

## Seeded login credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@shop.test` | `Admin123!` |
| Customer | `customer@shop.test` | `Customer123!` |

Seed data also includes 14 products across 5 categories (Apparel, Home, Electronics, Books,
Outdoors), 5 orders spanning every status, and a populated cart for the customer.

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
