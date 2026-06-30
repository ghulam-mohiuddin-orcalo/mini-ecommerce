---
description: Add or change a NestJS endpoint with a locked contract — DTOs, guards, status codes, Swagger — and the frontend types/hook to consume it.
argument-hint: <endpoint, e.g. "GET /orders/:id/invoice (customer, own order only)">
---

# /implement-api

Implement **$ARGUMENTS** as a contract-first endpoint that fits this project's server-authoritative
REST surface (see the API table in [README.md](../../README.md)).

## Workflow

1. **Locate the namespace and sibling.** Decide where it belongs: public catalog (`/products`,
   `/recommendations`), authenticated customer (`/cart`, `/orders`, `/auth`), or admin (`/admin/*`).
   Find the nearest existing endpoint and mirror its controller/service/DTO shape.

2. **Design the contract** (**api-architect**). Specify:
   - Route + verb (respect Nest route ordering: static segments before `:id`).
   - Request DTO with `class-validator` rules; money fields are `@IsInt()` **cents**.
   - Response DTO field names/types (cents, nullables, enums) and the `to*Response` mapper.
   - Access level: `@Public()`, authenticated, or `@Roles(Role.ADMIN)`.
   - Full status-code matrix: 200/201/204, **422** validation, **401**/**403** authz,
     **404** not-found/IDOR, **409** conflict, **402** payment, **429** rate-limit.
   - Pagination/filtering via the `{ data, meta }` envelope if it's a list.
   - Swagger: `@ApiTags`, `@ApiOperation`, typed `@ApiOkResponse`, `@ApiCookieAuth` if protected.

3. **Schema check** (**database-engineer**). If new persisted fields/indexes are required, land a
   forward migration first; otherwise confirm none is needed.

4. **Implement** (**backend-engineer**). Logic in the service (transactional if it mutates
   stock/orders); thin controller with the decorators above; DTO validation; ownership scoping by
   `req.user.id` for customer data (by-id → `findFirst({ id, userId })` → 404 for non-owners). Let
   the global filter map errors (`P2002→409`, `P2025→404`); don't leak internals.

5. **Security review** (**security-engineer**) if it touches auth, ownership, payments, secrets, or
   admin scope — required before proceeding.

6. **Wire the client** (**frontend-engineer** + **integration-agent**). Add/extend the interface in
   `lib/types.ts` to match the DTO exactly, add a TanStack Query hook (`apiFetch`, array key,
   non-optimistic cache write/invalidation), and confirm it works through the `/api` proxy.

7. **Test** (**testing-engineer**). e2e covering success + 422 + authz + conflict/rollback +
   ownership; unit for any pure helper.

8. **Verify** (**supervision-verifier**). Backend `npm run build`; boot; hit the route via
   `:3000/api/...`; run `npm test` + `npm run test:e2e`; confirm the exact status codes.

9. **Document** (**documentation-agent**). Add the row to the README API table; record any
   non-obvious decision in NOTES.md; confirm Swagger renders.

## Definition of Done

- Contract locked and implemented; correct status codes; ownership/IDOR safe.
- `lib/types.ts` matches the DTO; hook consumes it through the proxy.
- Tests cover success + negatives; both build steps clean; README API table updated.
