---
name: project-conventions
description: The structural conventions of this repo — folder layout, naming, imports, money handling, reusable components/hooks/utilities, and the real quality gates. Load whenever creating or moving files, naming things, or deciding where code belongs in the NestJS backend or Next.js frontend.
---

# Project Conventions

How this repository is organized and named. Match it exactly — consistency is what lets agents and
humans navigate the codebase without surprises.

## Repository layout

```
backend/    NestJS 11 API — Prisma, services, guards, DTOs   (port 3001)
frontend/   Next.js 15 App Router — storefront + admin        (port 3000, proxies /api/* → 3001)
docker-compose.yml   local PostgreSQL 16
CLAUDE.md   authoritative project context (rules override defaults)
NOTES.md    incremental decision log + verification + mistakes caught
README.md   setup/run, API table, seeded credentials
```

## Backend structure (feature modules)

Each feature is a folder under `backend/src/<feature>/` containing:

```
<feature>.module.ts        wiring: providers, controllers, imports/exports
<feature>.service.ts       ALL business logic
<feature>.controller.ts    thin HTTP layer: routes + guards + Swagger only
dto/                        request + response DTOs (and to*Response mappers)
<feature>.spec.ts           colocated unit specs for pure logic (optional)
```

Shared building blocks live in `backend/src/common/`: `guards/`, `decorators/` (`@Public`,
`@Roles`, `@CurrentUser`, `@NormalizeEmail`), `filters/` (the global exception filter), `types/`,
`exceptions/`. Prisma access is the injectable `PrismaService` (`prisma/`).

**Naming:** files are kebab-case with a role suffix (`orders.service.ts`, `create-product.dto.ts`,
`order-state-machine.ts`, `jwt-auth.guard.ts`). Classes are PascalCase (`OrdersService`,
`CreateProductDto`). Response mappers are `to<Entity>Response`.

## Frontend structure (App Router + lib)

```
src/app/
  (store)/    customer surface: page.tsx, products, cart, checkout, orders, login, signup, profile…
  (admin)/    role-gated admin surface: layout.tsx + admin gate, dashboard, products, orders
  layout.tsx, providers.tsx, loading.tsx, error.tsx, not-found.tsx, globals.css
src/components/
  ui/         base design-system primitives (Button, Input, Select, Badge, Skeleton, States, …)
  store/      storefront feature components (ProductCard, CatalogFilters, RecommendationsSection…)
  admin/      admin feature components (AdminProductForm…)
src/lib/
  api.ts          apiFetch, ApiError, toQueryString
  types.ts        shared response interfaces (mirror backend DTOs)
  format.ts       formatPrice (cents→currency), formatDate
  cn.ts           cn() = clsx + tailwind-merge
  orderTransitions.ts   read-only mirror of the server state machine
  hooks/          use*.ts TanStack Query hooks (useCart, useAuth, useProducts, useAdmin…)
```

**Naming:** components and hooks PascalCase/`useXxx` (`ProductCard.tsx`, `useCart.ts`); route
folders lowercase; route groups in parens `(store)`/`(admin)`. Import via the `@/` alias
(`@/lib/api`, `@/components/ui/Button`) — never long relative `../../..` chains.

## Money

Integer **cents** everywhere — DB columns, DTOs, types, computations, query params
(`minPrice`/`maxPrice`). Convert only at the edge: `formatPrice(cents)` to display, and
multiply/divide by 100 explicitly when a form collects dollars. **Never** use floats for money.

## Reuse rules

- **Backend:** add a method to an existing service before creating a new service; share a
  controller's resource across surfaces via admin-specific methods (`findAllForAdmin`), not a
  duplicate stack. Some duplication is *intentional* for module isolation (CartModule doesn't
  import ProductsModule) — check NOTES.md before "DRY-ing" it.
- **Frontend:** compose existing primitives (`components/ui`) and hooks (`lib/hooks`); extend a
  primitive's `variant`/`size` API before making a new component; reuse `ProductGrid`/`ProductCard`
  for any product list.

## Quality gates (there is no committed ESLint/Prettier config)

| Surface | Gates (authoritative) |
|---|---|
| Backend | `npm run build` (tsc via nest) · `npm test` (unit) · `npm run test:e2e` (`*test*` DB, `--runInBand`) |
| Frontend | `npm run typecheck` (`tsc --noEmit`) · `npm run build` (`next build`) |

`npm run lint` (`eslint --fix` / `next lint`) scripts exist but no config is committed — treat
**typecheck + build + tests** as the real gates. **`any` is banned; never disable TypeScript.**

## Anti-patterns

- ❌ Long relative imports (`../../../lib/api`) — use `@/`.
- ❌ Business logic in a controller or a page component.
- ❌ A new top-level folder outside the established module/route-group structure.
- ❌ Floats or formatted currency strings flowing through the API.
- ❌ Adding a dependency the stack doesn't use (e.g. Zod, React Hook Form, a UI kit) without
  updating CLAUDE.md.
- ❌ Declaring "done" on a green build without running it (see `code-review` + `testing`).
