---
name: performance
description: Performance practices for this stack — Prisma query shape, index coverage, transaction batching, bounded lists, frontend bundle, and TanStack Query caching — without weakening integrity. Load when something is slow or a query/bundle regresses.
---

# Performance

Fast at this catalog's scale, never at the cost of correctness. The existing code sets the bar;
match it. Always **measure before and after**.

## Database / Prisma

- **No N+1.** Fetch relations with `include`/`select` or aggregate with `groupBy`, not per-row
  reads in a loop. Recommendations rank in-memory over a bounded candidate set (one `groupBy` +
  one `findMany`), not per-product round trips — mirror that.
- **Bound every list** with pagination (`skip`/`take`); never return an unbounded `findMany`.
- **One round trip** where possible: co-locate data + count in a single `$transaction([...])` (the
  catalog and admin lists do this), and batch independent aggregates with `Promise.all`/
  `$transaction` (the analytics service issues its aggregates in parallel).
- **Index the access path.** A filter/sort predicate must be covered by an index — the composite
  `(isActive, category)`, `(isActive, createdAt)`, `(isActive, priceCents)`, `(userId, createdAt)`,
  and `status`/`productId` indexes exist for exactly the queries that run. Add an index (via
  database-engineer) before rewriting a query into something unreadable.
- **Trim payloads:** `select`/`include` only the fields the response DTO uses.

## Frontend

- **Keep heavy deps where they belong:** Recharts is admin-only (~225 kB first load on the admin
  dashboard is acceptable; the storefront stays lean ~124–126 kB). Don't import admin/chart code
  into store routes; dynamic-import heavy modules.
- **Images:** plain `<img>` with lazy/async loading (a deliberate choice over `next/image` to avoid
  remote-host config and stay resilient offline); skeletons limit CLS.
- **TanStack Query caching:** sensible `staleTime` (global default 30s in
  [providers.tsx](../../../frontend/src/app/providers.tsx), `['me']` at 60s),
  `refetchOnWindowFocus: false`, `retry: 1`. Don't trigger refetch storms; reuse cached lists.
- **Mutations write the server response into cache** (non-optimistic) and invalidate dependents —
  efficient and correct.

## Integrity guardrails (never cross these for speed)

- The checkout stays **one transaction** with the **conditional atomic decrement** — no caching of
  authoritative stock/price that could oversell.
- Totals stay **server-recomputed**; don't precompute/denormalize without a documented refresh
  path (the recommendations NOTES describe how a real rollup would be introduced).
- Don't drop validation/whitelisting to save time.

## Method

1. Reproduce and capture a baseline number (query count/time, response latency, `next build` first
   load).
2. Identify the bottleneck with evidence (query log, `EXPLAIN`, bundle output).
3. Apply the smallest fix; keep it readable.
4. Prove behaviour unchanged (tests green) and report **before/after**.

## Anti-patterns

- ❌ Querying inside a `.map`/loop (N+1).
- ❌ An unbounded list query.
- ❌ Adding a query whose predicate/sort no index covers.
- ❌ Separate round trips for data and its count.
- ❌ Recharts (or other heavy deps) leaking into the storefront bundle.
- ❌ Caching authoritative stock/price, or precomputing totals, in a way that can drift/oversell.
- ❌ "Optimizing" by guess, with no measurement.
