---
description: Improve a module's structure (reuse, clarity, layering) with zero behaviour change, locked by the existing test suite.
argument-hint: <module/area, e.g. "extract shared product-where builder">
---

# /refactor-module

Refactor **$ARGUMENTS** to improve clarity, reuse, and layering **without changing behaviour**.
Behaviour-preservation is the whole contract — the test suite is your safety net.

## Workflow

1. **Lock behaviour first.** Confirm the affected paths are covered by tests; if coverage is thin,
   add characterization tests (**testing-engineer**) **before** refactoring so any drift is caught.
   Record the current `npm test` + `npm run test:e2e` result as the baseline (must be green).

2. **Identify the smell.** Name it concretely:
   - duplicated logic (e.g. the active-product predicate, or a `bySku.get + throw` pattern → extract
     a helper, as the seed did with `requireProduct`);
   - business logic leaking into a controller → push into the service;
   - a fat function doing several things → split along the existing seams;
   - inconsistent naming/imports vs [`project-conventions`](../skills/project-conventions/SKILL.md);
   - a missing `to*Response` mapper; an `any` that should be typed.

3. **Refactor in small steps**, mirroring established patterns
   ([`clean-architecture`](../skills/clean-architecture/SKILL.md)). After each step, re-run the
   gates. Respect deliberate duplication that exists for module isolation (CartModule intentionally
   doesn't depend on ProductsModule — don't "DRY" that away without cause; check NOTES.md).

4. **Hold the line on invariants.** The refactor must not alter: status codes, the error envelope,
   money-in-cents, the transactional checkout core, ownership scoping, or the trust boundary. If a
   "cleaner" shape would change any of these, it's not a refactor — stop and escalate.

5. **No `any`, no TS suppression.** Improve types as you go.

6. **Verify equivalence** (**supervision-verifier**). The **same** tests pass unchanged; both apps
   build/typecheck; behaviour identical through the proxy. If a test had to change, the refactor
   changed behaviour — reconsider.

7. **Commit** as `refactor:` per [`commit-discipline`](../skills/commit-discipline/SKILL.md), in
   small reviewable steps.

## Definition of Done

- Structure improved (less duplication, correct layering, better names/types).
- **Zero behaviour change**: the pre-existing tests pass unmodified; gates green.
- Invariants and deliberate design choices preserved; `refactor:` committed in small steps.
