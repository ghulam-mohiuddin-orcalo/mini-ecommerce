---
description: Plan and kick off the next milestone the way this assessment is built — scoped, planned-before-code, independently verifiable, approved before the next.
argument-hint: [optional focus, e.g. "product reviews"]
---

# /next-module

Pick up the next milestone for the Mini E-Commerce build and run it through this project's
milestone discipline (see NOTES.md "Agent workflow"). Milestones are small, independently
verifiable, and each ends with explicit approval before the next begins.

## Workflow

1. **Establish where we are.** Read [NOTES.md](../../NOTES.md) and the README API table to see what's
   shipped (scaffold → DB → auth → catalog → cart → checkout → admin → dashboard → recommendations →
   tests/docs → Stripe). Check git log for the latest milestone. Identify the **next** coherent
   slice — using $ARGUMENTS as the focus if provided, otherwise the smallest valuable increment.

2. **Plan before code.** Produce a short blueprint (the project requires this): requirements
   breakdown, data-model impact, API design (routes + DTOs + status codes), security checklist,
   edge cases, risks, and the files you'll touch. Map it to the relevant **agents** and **skills**.

3. **State what and why, then list files.** Explain the scope and the reasoning, enumerate the
   files to add/change on both surfaces, and call out integrity concerns (cents, ownership,
   transactional stock, soft-delete) up front.

4. **Get approval.** Present the plan and **wait for explicit go-ahead** before implementing —
   this is a hard rule of the workflow. Ask only blocking questions.

5. **Implement the slice** via [`/create-feature`](./create-feature.md) (or
   [`/implement-api`](./implement-api.md) for an API-only increment): contract → schema → backend →
   frontend → integrate.

6. **Self-review** ([`/review-module`](./review-module.md)) and **test**
   ([`/generate-tests`](./generate-tests.md)), covering integrity/authz/negative cases.

7. **Verify** (**supervision-verifier**): build both apps, boot, run both suites, exercise through
   the proxy, prove integrity outcomes. A green build alone is not acceptance.

8. **Document & commit.** Update README/NOTES (**documentation-agent**) with the decision and
   verification; commit with a Conventional Commit. Then **pause for approval** before the next
   milestone.

## Definition of Done

- Next milestone chosen and scoped to an independently verifiable slice.
- Blueprint produced and **approved before coding**.
- Slice implemented, reviewed, tested, and verified through the proxy.
- README/NOTES updated; conventional commit made; paused for approval on what's next.
