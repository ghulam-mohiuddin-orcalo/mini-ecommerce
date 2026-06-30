---
description: Profile and fix a performance problem (query/index/round-trip/bundle/cache) with evidence, without weakening any integrity guarantee.
argument-hint: <slow path, e.g. "admin orders list is slow" or "catalog N+1">
---

# /optimize-performance

Make **$ARGUMENTS** faster the disciplined way: measure, find the real bottleneck, fix minimally,
and prove behaviour is unchanged. Owned by **performance-engineer**. Read the
[`performance`](../skills/performance/SKILL.md) skill.

## Workflow

1. **Establish the baseline.** Reproduce the slow path and capture a number: query count/latency
   (Prisma query logging / `EXPLAIN`), endpoint response time, or `next build` first-load size.
   No optimization without a baseline.

2. **Find the bottleneck with evidence.** Classify it:
   - **N+1 / unbounded query** — per-row reads in a loop; a list without pagination.
   - **Missing index** — a filter/sort predicate not covered by a composite index
     (`(isActive, …)`, `(userId, createdAt)`, `status`, `productId`).
   - **Round-trips** — independent reads not batched (`$transaction([...])` / `Promise.all`, as the
     analytics service does).
   - **Payload** — `include`-ing more than the response needs.
   - **Bundle** — heavy deps in the wrong place (Recharts must stay admin-only, not in the
     storefront).
   - **Cache** — wrong `staleTime`/`refetchOnWindowFocus` causing refetch storms.

3. **Fix minimally.**
   - Replace per-row reads with `include`/`groupBy`; always paginate lists.
   - If a predicate isn't indexed, **add the index via database-engineer** before contorting the
     query.
   - Batch independent reads; trim `include`/`select` to what's returned.
   - Frontend: dynamic-import heavy admin-only modules, keep images lazy, tune `staleTime`.

4. **Protect integrity** ([`data-integrity`](../skills/data-integrity/SKILL.md)). Do **not**:
   cache authoritative stock/price in a way that could oversell; move totals off the server;
   precompute without a documented refresh path; or drop validation. The checkout transaction and
   conditional atomic decrement are untouchable.

5. **Prove equivalence** (**supervision-verifier**). Results identical; the **full** test suite
   stays green; both apps build. Re-measure and report **before/after** numbers.

6. **Document** material changes (a new index, a precompute strategy) in NOTES.md via
   **documentation-agent**.

## Definition of Done

- Bottleneck identified with a measurement; minimal fix applied.
- Behaviour provably unchanged (suite green); integrity invariants intact.
- Before/after numbers reported; notable changes documented.
