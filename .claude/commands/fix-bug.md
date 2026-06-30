---
description: Diagnose and fix a bug with a reproduction-first, regression-tested workflow — without weakening integrity or the trust boundary.
argument-hint: <bug report, e.g. "cart total wrong after a product price change">
---

# /fix-bug

Fix **$ARGUMENTS** by reproducing it first, finding the true root cause, and locking it with a
regression test. Resist the urge to patch the symptom.

## Workflow

1. **Reproduce.** Turn the report into a concrete, failing observation: an HTTP call (via the
   `/api` proxy or directly to `:3001`), a UI step, or a failing test. Capture the **actual** vs
   expected status code/output. If you can't reproduce it, gather more detail before changing code.

2. **Localize.** Trace from symptom to source. Use the layering to narrow it: controller (wiring)
   → service (logic) → Prisma (data) on the backend; hook/type (`lib/`) → component (UI) on the
   frontend. Check whether the contract drifted (`lib/types.ts` vs the DTO).

3. **Find the root cause, and check the test first.** This repo's recurring lesson: **when a test
   and a live check disagree, suspect the test** (NOTES.md "mistakes caught #5"), and **a green
   build is not a working run** (#1). Read the real status code; confirm whether the bug is in app
   code, a test, migration state, or the contract.

4. **Write a failing regression test** (**testing-engineer**) that captures the bug before fixing —
   e2e for HTTP/DB behaviour, unit for pure logic. It must fail for the right reason.

5. **Fix at the right layer** (the owning agent: **backend-engineer** / **frontend-engineer** /
   **database-engineer**). Smallest change that addresses the cause. Preserve invariants: money in
   cents, server-side totals, transactional stock with atomic decrement, ownership scoping, and
   secure-by-default guards. **Never** move authoritative logic to the client or loosen validation
   to dodge an error.

6. **Security gate** (**security-engineer**) if the bug or fix touches auth, ownership, payments,
   or data exposure.

7. **Verify** (**supervision-verifier**). The regression test now passes; the **full** suite stays
   green (`npm test` + `npm run test:e2e`); both apps build/typecheck; reproduce the original
   scenario through the proxy and confirm it's gone. Re-check integrity outcomes if relevant
   (stock/total/cart unchanged on rollback paths).

8. **Document** (**documentation-agent**). If the bug was non-obvious or revealed a sharp edge, add
   a NOTES.md "mistakes caught" entry (cause → how caught → fix → lesson), matching the existing
   format.

9. **Commit** with `fix:` per [`commit-discipline`](../skills/commit-discipline/SKILL.md),
   referencing the regression test.

## Definition of Done

- Root cause identified (not just the symptom); regression test added and now passing.
- Full suite green; both apps build; original scenario verified fixed through the proxy.
- No integrity guarantee weakened; NOTES.md updated if the bug was instructive; `fix:` committed.
