# `.claude/` — Agentic Development Workspace

This directory turns the Mini E-Commerce repo into an **AI-first engineering workspace**. It is
the operational layer that sits on top of [`CLAUDE.md`](../CLAUDE.md) (the authoritative project
context) and [`NOTES.md`](../NOTES.md) (the decision log). Everything here is written **for this
repository specifically** — a NestJS 11 + Prisma 6 + PostgreSQL backend and a Next.js 15 (App
Router) + Tailwind v4 frontend, sharing one server-authoritative API.

> **Read order for any agent starting work:** `CLAUDE.md` → the relevant `skills/` → the
> `agents/` definition you are acting as → the `commands/` workflow you were invoked with.

## How the three pieces fit together

| Piece | What it is | When it's used |
|---|---|---|
| **`agents/`** | Specialist personas (system prompts) with a strict scope, an explicit "never modify" list, and a Definition of Done. | Spawned via the `Agent` tool for focused, bounded work (e.g. "implement this service", "review this module"). |
| **`commands/`** | Reusable, ordered workflows invoked as `/command-name`. They orchestrate agents and skills against this project's architecture. | When you want a repeatable procedure (ship a feature, fix a bug, add an endpoint, generate tests). |
| **`skills/`** | The shared rulebook — best practices, examples, and anti-patterns grounded in this codebase. Agents and commands cite them. | Loaded as reference whenever a task touches that domain (API contracts, security, UI consistency, …). |

Mental model: **commands** are the *procedures*, **agents** are the *who*, **skills** are the
*how*. A command like `/create-feature` runs the `backend-engineer` and `frontend-engineer`
**agents**, both of which obey the `clean-architecture`, `api-contract`, and `security`
**skills**.

## The ground truth this workspace is built on

These facts are non-negotiable and every file here reflects them. They are verified against the
actual source, not the aspirational stack:

- **Money is integer cents (`Int`) end-to-end.** Never floats. `formatPrice(cents)` divides by
  100 only at the render edge ([frontend/src/lib/format.ts](../frontend/src/lib/format.ts)).
- **The server is the only trust boundary.** Totals, stock changes, and authorization are
  computed/enforced server-side from authoritative DB values. The client validates for UX only.
- **Business logic lives in services**, never controllers. Controllers are thin and delegate.
- **DTOs + `class-validator`** with a global `ValidationPipe({ whitelist, forbidNonWhitelisted,
  transform })`; validation failures are **422** via the global exception filter.
- **Checkout is one interactive Prisma transaction** with an **atomic conditional stock
  decrement** (`updateMany WHERE stock >= qty`) as the real oversell guard
  ([backend/src/orders/orders.service.ts](../backend/src/orders/orders.service.ts)).
- **Order line items snapshot** product name/image/category/price; **products are soft-deleted**
  (`isActive=false`), never hard-deleted.
- **Auth is a JWT in an httpOnly cookie** (`access_token`); the frontend is same-origin via the
  Next.js `/api/*` rewrite proxy. Guards are global (`JwtAuthGuard` + `RolesGuard`); routes opt
  out with `@Public()` and lock down with `@Roles(Role.ADMIN)`.
- **The order state machine has one source of truth**
  ([backend/src/orders/order-state-machine.ts](../backend/src/orders/order-state-machine.ts)),
  mirrored read-only on the client
  ([frontend/src/lib/orderTransitions.ts](../frontend/src/lib/orderTransitions.ts)).
- **Frontend state:** TanStack Query only (no Redux/Zustand). Mutations are **not optimistic** —
  they write the server's recomputed response into the cache.
- **Forms are controlled `useState` + HTML5 validation.** There is **no Zod or React Hook Form**
  in the frontend; do not introduce them without updating `CLAUDE.md`.
- **Design system is custom ("Pine & Parcel"):** Tailwind v4 `@theme` tokens in
  [globals.css](../frontend/src/app/globals.css), consumed through `cn()`-composed primitives in
  [components/ui/](../frontend/src/components/ui/). **No off-the-shelf UI kit / shadcn.**
- **Real quality gates (there is no committed ESLint/Prettier config):**
  - Backend: `npm run build` (tsc via nest), `npm test` (unit), `npm run test:e2e` (Supertest,
    `--runInBand`, against a `*test*` DB only).
  - Frontend: `npm run typecheck` (`tsc --noEmit`) and `npm run build` (`next build`).
  - **`any` is banned; never disable TypeScript.**

## Directory index

```
.claude/
├── README.md                      ← you are here
├── agents/                        12 specialist personas
│   ├── backend-engineer.md        NestJS services, controllers, DTOs, modules
│   ├── frontend-engineer.md       Next.js App Router, TanStack Query, primitives
│   ├── ui-ux-designer.md          Layouts, flows, states, responsive behaviour
│   ├── design-system.md           Pine & Parcel tokens + UI primitives
│   ├── api-architect.md           Endpoint shape, contracts, status codes
│   ├── database-engineer.md       Prisma schema, migrations, seed, integrity
│   ├── testing-engineer.md        Jest + Supertest e2e and unit suites
│   ├── integration-agent.md       End-to-end wiring across both surfaces
│   ├── performance-engineer.md    Query/index/bundle/runtime performance
│   ├── security-engineer.md       AuthN/Z, trust boundary, payments, secrets
│   ├── documentation-agent.md     README / NOTES / Swagger / inline docs
│   └── supervision-verifier.md    Final gate: build, run, prove behaviour
├── commands/                      8 reusable workflows
│   ├── create-feature.md
│   ├── review-module.md
│   ├── implement-api.md
│   ├── fix-bug.md
│   ├── optimize-performance.md
│   ├── generate-tests.md
│   ├── refactor-module.md
│   └── next-module.md
└── skills/                        11 domain rulebooks
    ├── project-conventions/       structure, naming, imports, money, gates
    ├── clean-architecture/        layering, services-not-controllers, DI
    ├── api-contract/              response shape, validation, errors, paging
    ├── data-integrity/            transactions, atomic stock, snapshots, cents
    ├── security/                  trust boundary, authZ, cookies, Stripe, IDOR
    ├── ui-consistency/            tokens, spacing, typography, primitives
    ├── accessibility/             semantics, labels, focus, motion
    ├── performance/               indexes, query shape, bundle, caching
    ├── testing/                   e2e/unit patterns, DB guard, FK teardown
    ├── commit-discipline/         Conventional Commits, branches, PRs, review
    └── code-review/               the self-review checklist before "done"
```

## Conventions for editing this workspace

- When the architecture changes, update **`CLAUDE.md` first**, then reconcile the affected files
  here. This workspace must never contradict `CLAUDE.md`.
- Keep every file **specific to this repo**. If a statement would be equally true of any random
  project, it does not belong here.
- Cross-reference real files with clickable paths; cite the skill that owns a rule rather than
  restating it.
