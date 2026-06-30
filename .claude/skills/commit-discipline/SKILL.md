---
name: commit-discipline
description: Version-control conventions for this repo — Conventional Commits, small milestone-scoped commits, branch naming, PR rules, and the pre-commit review checklist. Load before committing, branching, or opening a PR.
---

# Commit Discipline

Small, coherent, conventional history. The git log already follows this (`feat: integrate Stripe
Checkout…`, `feat: implement StoreAccessGuard…`); match it.

## Conventional Commits

`type(scope): summary` in the imperative mood. Common types here:

- `feat:` — a new capability (endpoint, page, milestone slice).
- `fix:` — a bug fix (reference the regression test).
- `refactor:` — behaviour-preserving structure change.
- `test:` — adding/adjusting tests only.
- `docs:` — README/NOTES/Swagger/`.claude` docs only.
- `chore:` — tooling/deps/config.

Scope is optional but helpful (`feat(cart):`, `fix(checkout):`). Keep the summary ≤ ~72 chars; put
the *why* and trade-offs in the body when non-obvious (and in NOTES.md for decisions).

## Commit size & cadence

- **One coherent change per commit**, scoped to a milestone slice — not a giant dump and not a
  fix-up storm. The build is done feature-by-feature; commits mirror that.
- A feature commit includes its code **and** its tests and doc updates, so each commit is a
  consistent, verifiable state.
- Don't commit secrets — `.env` is gitignored; only `.env.example` is tracked.

## Branching & PRs

- Work on a topic branch off `main` (recent examples: `redesign`, `stripe-payment`); open a PR into
  `main` and merge (the history shows `Merge pull request …`).
- PR description: what changed, why, how it was verified (build + boot + tests through the proxy),
  and any trade-offs — mirroring the NOTES.md verification voice.
- Don't merge red: both apps must build/typecheck and `npm test` + `npm run test:e2e` must pass.

## Pre-commit / pre-PR checklist

- [ ] Self-review done ([`code-review`](../code-review/SKILL.md)): no bugs, missing validation,
      duplicated logic, security gaps, broken imports, type errors, architecture smells.
- [ ] No `any`, no TS suppression; backend `build` + frontend `typecheck`/`build` clean.
- [ ] `npm test` + `npm run test:e2e` green; behaviour verified through the `/api` proxy.
- [ ] README API table / NOTES.md updated for the change; CLAUDE.md only if a rule changed.
- [ ] Conventional message; change scoped to one coherent slice; no secrets staged.

## Anti-patterns

- ❌ `update`, `wip`, `fix stuff` — non-conventional, contextless messages.
- ❌ A mega-commit spanning several unrelated features.
- ❌ Committing code without its tests/doc updates.
- ❌ Merging with a failing build or red suite.
- ❌ Staging `.env` or any secret.
