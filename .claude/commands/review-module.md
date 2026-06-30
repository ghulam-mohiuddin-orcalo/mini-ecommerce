---
description: Run a rigorous self-review of a module against this project's architecture, integrity, and security rules before it's considered done.
argument-hint: <module/area, e.g. "checkout" or "admin orders">
---

# /review-module

Review **$ARGUMENTS** the way this project's self-review step works (CLAUDE.md rule #3): hunt for
bugs, missing validation, duplicated logic, security gaps, broken imports, type errors, and
architecture smells — and fix them before moving on. Use the
[`code-review`](../skills/code-review/SKILL.md) skill as the rubric.

## Workflow

1. **Gather scope.** List the module's files (controller/service/DTO/module + mappers on the
   backend; page/hook/types/components on the frontend) and read them. Note the contract it exposes
   and the invariants it must uphold.

2. **Architecture & layering** ([`clean-architecture`](../skills/clean-architecture/SKILL.md)).
   - Is **all** business logic in the service (controllers thin)?
   - Is module wiring correct (providers/exports/imports), no circular deps, no cross-module reach
     around DI?
   - Are responses mapped through `to*Response` (no entity/`passwordHash`/live-field leakage)?

3. **Data integrity** ([`data-integrity`](../skills/data-integrity/SKILL.md)).
   - Money is integer cents everywhere; totals computed server-side.
   - Stock/order mutations are transactional; stock uses the conditional atomic decrement and
     asserts `count === 1`; rollback leaves state unchanged.
   - Order lines snapshot product fields; deletes are soft (`isActive`).

4. **API contract** ([`api-contract`](../skills/api-contract/SKILL.md)).
   - Correct status codes (422/401/403/404/409/402); `{ data, meta }` for lists; consistent error
     envelope; Swagger annotations present and accurate.

5. **Security** ([`security`](../skills/security/SKILL.md)) — pull in **security-engineer**.
   - Guards correct (`@Public`/`@Roles(ADMIN)`); customer data scoped by `req.user.id`; by-id 404
     for non-owners; no client `userId`; Stripe path verified/idempotent if relevant; no secret
     leakage.

6. **Frontend specifics** (if applicable) ([`ui-consistency`](../skills/ui-consistency/SKILL.md),
   [`accessibility`](../skills/accessibility/SKILL.md)).
   - `apiFetch` only; types match the DTO; non-optimistic mutations + correct invalidation;
     loading/empty/error states; tokens via `cn()`; labelled, keyboard-reachable controls.

7. **Hygiene.** No `any`, no TS suppression, no dead/duplicated logic, no broken imports, no
   leftover TODOs or dead buttons (M3 lesson: don't ship a control whose backend doesn't exist).

8. **Tests** ([`testing`](../skills/testing/SKILL.md)). Are the integrity/authz/negative cases
   covered? Flag gaps to **testing-engineer**.

9. **Verify & report.** Run the gates (`npm run build`, frontend `typecheck` + `build`, `npm test`,
   `npm run test:e2e`). Produce a findings list: 🔴 must-fix / 🟡 should-fix / 🟢 nit. Fix the
   must-fixes (or delegate) and re-check.

## Definition of Done

- Findings categorized; all 🔴 resolved (fixed or delegated with a clear owner).
- Layering, integrity, contract, and security rules all satisfied; no `any`/suppression.
- Gates green; gaps in tests/docs handed to the owning agents.
