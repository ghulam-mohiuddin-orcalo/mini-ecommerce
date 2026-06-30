---
name: code-review
description: The self-review rubric used before any change is "done" in this repo — bugs, validation, duplication, security, imports, types, architecture smells, and run-time verification. Load during /review-module and before committing.
---

# Code Review

The project rule (CLAUDE.md #3): after each feature, self-review for bugs, missing validation,
duplicated logic, security gaps, broken imports, type errors, and architecture smells — and fix
them before moving on. This skill is that rubric. The overriding lesson from NOTES.md: **a green
build is not a working run — verify behaviour.**

## Review checklist

### Architecture & layering ([`clean-architecture`](../clean-architecture/SKILL.md))
- [ ] Business logic is in the **service**; the controller only routes + guards + Swagger.
- [ ] Responses go through `to*Response` mappers; no entity/`passwordHash`/live-field leakage.
- [ ] Module wiring correct; no circular deps; cross-module reuse via DI, honoring intentional
      isolation (e.g. CartModule).

### Data integrity ([`data-integrity`](../data-integrity/SKILL.md))
- [ ] Money is integer cents end-to-end; totals computed server-side.
- [ ] Stock/order mutations are transactional; stock uses the conditional atomic decrement with
      `count === 1`; rollback leaves state unchanged.
- [ ] Order lines snapshot product fields; deletes are soft (`isActive`); Stripe fulfilment is
      idempotent.

### API contract ([`api-contract`](../api-contract/SKILL.md))
- [ ] Correct status codes (422/401/403/404/409/402/429); `{ data, meta }` for lists; consistent
      error envelope; Swagger annotations accurate.

### Security ([`security`](../security/SKILL.md))
- [ ] Guards correct (`@Public`/`@Roles(ADMIN)`); customer data scoped by `req.user.id`; by-id
      404 for non-owners; no client `userId`.
- [ ] No secret leakage; Stripe webhook signature-verified; no stack traces to clients.

### Frontend ([`ui-consistency`](../ui-consistency/SKILL.md), [`accessibility`](../accessibility/SKILL.md))
- [ ] `apiFetch` only; `lib/types.ts` matches the DTO; non-optimistic mutations + correct
      invalidation; loading/empty/error states present.
- [ ] Tokens via `cn()`; money via `formatPrice`; labelled, keyboard-reachable controls; visible
      focus; reduced-motion respected.

### Hygiene
- [ ] **No `any`, no `@ts-ignore`/`eslint-disable`.** No dead code, no duplicated logic, no broken
      imports.
- [ ] No dead UI (don't ship a button whose backend doesn't exist yet — M3 lesson).
- [ ] Naming/structure/imports follow [`project-conventions`](../project-conventions/SKILL.md)
      (`@/` alias, kebab-case files, role suffixes).

### Tests ([`testing`](../testing/SKILL.md))
- [ ] Integrity/authz/negative cases covered; suites self-sufficient and FK-safe.

### Run-time verification (the non-negotiable gate)
- [ ] Backend `npm run build`; frontend `npm run typecheck` + `npm run build` — clean.
- [ ] Server **boots**; the change works **through the `/api` proxy** with the cookie, with the
      right status codes.
- [ ] `npm test` + `npm run test:e2e` green; integrity outcomes re-proven (stock/total/cart).

## Findings format

Categorize and act:
- 🔴 **must-fix** — bug, security gap, integrity violation, type error, broken build/run. Fix or
  delegate before "done".
- 🟡 **should-fix** — duplication, missing state, weak naming, missing test.
- 🟢 **nit** — style/clarity.

## Lessons baked in (from NOTES.md "mistakes caught")

- Compile ≠ run — a missing peer dep crashed boot on a green build. **Boot it.**
- Adding files can shift the compiler's `rootDir` and break `start:prod`. **Verify the built run.**
- When a test and a live check disagree, **suspect the test** and read the real status code.
- Shared-DB e2e suites must be self-sufficient and FK-safe — **don't rely on run order.**
- Check migration state (`prisma migrate status`); don't assume the dev DB is current.

## Anti-patterns

- ❌ Declaring done on a green build without booting/running it.
- ❌ Silencing a type error with `any`/`@ts-ignore` instead of fixing it.
- ❌ Shipping a feature without its loading/empty/error states or its negative-path tests.
- ❌ Leaving a non-obvious decision out of NOTES.md.
