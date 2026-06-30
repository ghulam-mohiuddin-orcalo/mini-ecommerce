# CLAUDE.md — Project Context for Agentic Development

This file is the persistent context I (the developer) use to drive the AI agent on this
project. It encodes the architecture, conventions, and guardrails so the agent stays
consistent across sessions and features. Keep it short, current, and authoritative.

## What this project is

A **Mini E-Commerce Platform**: a customer storefront + an admin panel sharing one API.
Built for a timed full-stack assessment. Guiding principle: **working over polished,
coherent over complete**. Breadth that connects end-to-end beats depth in one corner.

## Stack (decided, do not change without updating this file)

- **Backend:** NestJS 11 + TypeScript, Prisma + PostgreSQL.
- **Frontend:** Next.js 15 (App Router) + TypeScript, Tailwind CSS v4 + our own design system
  (no off-the-shelf UI kit/theme; classes composed via `cn()` = clsx + tailwind-merge).
- **Server state:** TanStack Query. **Charts:** Recharts. **Forms:** plain React `useState`
  with native HTML5 validation — there is **no form library** (no React Hook Form, no Zod).
- **Auth:** JWT in an httpOnly cookie. Frontend reaches the API same-origin via a Next.js
  rewrite proxy (`/api/*` → `http://localhost:3001/*`).
- **Payment:** mocked behind a swappable `PaymentService` interface (no real payments).
- **Money:** integer **minor units (cents)** everywhere. Never floats.
- **Tests:** Jest + Supertest (backend, focused on data-integrity-critical logic).

## Architecture rules (non-negotiable)

- Business logic lives in **services**, never in controllers.
- Use **DTOs + class-validator**; global `ValidationPipe({ whitelist, forbidNonWhitelisted,
  transform })`. The client validates for UX only (native HTML5 form validation); the
  **server (DTO) is the only trust boundary** and re-validates everything.
- **Never trust client data.** Order totals and stock changes are computed/applied
  **server-side only**, from authoritative DB values.
- **Stock decrement is transactional + atomic** (conditional decrement inside a Prisma
  transaction). Over-ordering returns 409 and changes nothing.
- **Order line items snapshot** product name + unit price at order time so historical orders
  survive product edits/deletes. Products are **soft-deleted** (`isActive=false`).
- **AuthZ:** `RolesGuard` + `@Roles(Role.ADMIN)` on every admin route. Customer resources are
  filtered by the authenticated user id and ownership-checked on fetch-by-id (no IDOR).
- Consistent error shape via a global exception filter; correct HTTP status codes; never leak
  stack traces to clients.
- **No `any`.** Do not disable TypeScript. Keep files modular and components reusable.

## Quality gates

There is **no committed ESLint or Prettier configuration** in this repo (the `lint` scripts and
the stray `eslint-disable` comments are vestigial — no config file or installed linter backs
them). Do **not** assume ESLint/Prettier exists, and do not add them without updating this file.
The authoritative gates are TypeScript compilation, the build, and the Jest suites:

- **Backend:** `npm run build` (TypeScript compile via `nest build`) · `npm test` (Jest unit) ·
  `npm run test:e2e` (Jest + Supertest, only against a `*test*` database).
- **Frontend:** `npm run typecheck` (`tsc --noEmit`) · `npm run build` (`next build`).
- "Done" means a clean type-check + build + green Jest suites, **verified at runtime** (boot the
  server and exercise it), not merely a successful compile.

## Layout

```
/backend   NestJS API (Prisma, services, guards, DTOs)
/frontend  Next.js App Router app (store + admin route groups)
docker-compose.yml   PostgreSQL for local dev
README.md  setup/run + seeded credentials
NOTES.md   agent workflow, assumptions, trade-offs (written incrementally)
```

## Ports

- Backend (NestJS): **3001**
- Frontend (Next.js): **3000** (proxies `/api/*` to the backend)

## Order status state machine

`PENDING → PROCESSING → SHIPPED → DELIVERED`, with a `CANCELLED` path.
- Only valid forward transitions allowed (no arbitrary jumps).
- `PENDING`/`PROCESSING` → `CANCELLED` **restocks** items.
- `SHIPPED`/`DELIVERED` cannot be cancelled.

## Open-ended requirement — interpretation

"Product suggestions relevant to them" = **hybrid personalized**: recommend popular products
from categories the user has previously purchased in (excluding already-owned). **Cold-start
fallback** (no history) → top sellers / newest. Product detail also shows same-category
related products. (Full reasoning in NOTES.md.)

## Working rules for the agent

1. Think before coding; plan the feature, list files, explain why, then implement.
2. Work feature-by-feature; keep commits small with conventional messages.
3. After each feature, self-review: bugs, missing validation, duplicated logic, security,
   broken imports, type errors, architecture smells. Fix before moving on.
4. Keep secrets out of the repo (`.env` gitignored, `.env.example` committed).
