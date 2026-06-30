---
description: Ship a vertical feature end-to-end across the NestJS API and Next.js app, the way this repo builds (plan → reuse → implement → verify).
argument-hint: <feature description, e.g. "wishlist for customers">
---

# /create-feature

Deliver **$ARGUMENTS** as one coherent vertical slice — schema → API → types → hooks → UI →
tests → docs — following this project's milestone discipline ("working over polished, coherent
over complete"). Do not write code until the plan is explicit.

## Workflow

1. **Understand the requirement.** Restate $ARGUMENTS in one paragraph: who it's for (customer vs
   admin surface), the data it touches, and the integrity rules that apply (money in cents,
   ownership, soft-delete, transactional stock). Ask only blocking questions.

2. **Analyze the existing implementation.** Search for the closest existing feature and reuse its
   shape:
   - Backend: a sibling module under `backend/src/**` (controller/service/DTO/module + `to*Response`
     mapper).
   - Frontend: a sibling page in `app/(store)`/`app/(admin)`, a hook in `lib/hooks`, types in
     `lib/types.ts`, and components in `components/**`.
   List the files you'll touch and the patterns you'll mirror. Read the relevant **skills**
   (`project-conventions`, `clean-architecture`, `api-contract`, `data-integrity`, `security`,
   `ui-consistency`).

3. **Design the contract** (delegate to **api-architect**, and **database-engineer** if the data
   model changes). Lock routes, request/response DTOs (money as cents), the status-code matrix,
   access level (`@Public`/authenticated/`@Roles(ADMIN)`), and any new fields/indexes/migrations.
   If a migration is needed, land it first via **database-engineer** (new forward migration,
   clean-room verified).

4. **Reuse existing components and services.** Before adding anything new, confirm no existing
   service method, hook, or primitive already does it. Extend (`findAllForAdmin`-style methods, a
   new `Button` variant) before creating.

5. **Implement the backend** (**backend-engineer**): service logic (transactional where it mutates
   stock/orders), thin controller with guards + Swagger, validated DTOs, `to*Response` mapper. No
   business logic in controllers; server is the trust boundary.

6. **Implement the frontend** (**frontend-engineer**): update `lib/types.ts` to match the DTO, add
   a TanStack Query hook (array key, `enabled` gating, non-optimistic cache writes + invalidation),
   and build the UI from existing primitives with loading/empty/error states. Get layout/state
   design from **ui-ux-designer** and any new token/primitive from **design-system** first.

7. **Integrate** (**integration-agent**): reconcile types both sides, wire cache invalidation, and
   confirm the flow works **through the `/api` proxy** with the httpOnly cookie.

8. **Write tests** (**testing-engineer**): e2e for the HTTP/DB behaviour (success + 422 + authz +
   conflict/rollback + ownership 404) and a unit spec for any pure logic. Keep suites
   order-independent and FK-safe.

9. **Verify lint & types.** Backend `npm run build`; frontend `npm run typecheck`. (There is no
   committed ESLint config — `tsc`/`next build` are the real gates; `next lint`/`eslint` may be run
   but treat type+build as authoritative.) Fix every error; no `any`, no suppression.

10. **Verify behaviour** (**supervision-verifier**): boot the server, run `npm test` +
    `npm run test:e2e`, and exercise the feature through the proxy. Prove the integrity outcomes
    (rollback unchanged; total == Σ lines), not just status codes.

11. **Update docs** (**documentation-agent**): README API table + NOTES.md decision/rationale/
    verification. CLAUDE.md only if a rule changed.

12. **Request review** (`/review-module` + the [`code-review`](../skills/code-review/SKILL.md)
    skill), then commit with a Conventional Commit per [`commit-discipline`](../skills/commit-discipline/SKILL.md).

## Definition of Done

- Vertical slice works end-to-end through the proxy; integrity invariants proven.
- Both apps build/typecheck; `npm test` + `npm run test:e2e` green.
- Types match across the boundary; loading/empty/error states present.
- README/NOTES updated; committed with a conventional message.
