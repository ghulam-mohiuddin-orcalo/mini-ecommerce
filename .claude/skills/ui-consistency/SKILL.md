---
name: ui-consistency
description: The "Pine & Parcel" visual language — design tokens, spacing/typography, color usage, primitive composition, money/date formatting, and responsive rules. Load when building or restyling any frontend UI.
---

# UI Consistency — "Pine & Parcel"

A custom, deliberate identity (no off-the-shelf kit). Tokens live in
[globals.css](../../../frontend/src/app/globals.css) `@theme` and are consumed as Tailwind
utilities through `cn()`-composed primitives in
[components/ui/](../../../frontend/src/components/ui/).

## Tokens (use the utility, not raw hex)

- **Neutrals (warm paper):** `paper` (app bg), `paper-2` (banded sections), `surface` (cards/white),
  `field` (input fill), `ink` (primary text), `ink-soft` (body), `muted` (labels/meta), `faint`,
  `line` / `line-soft` (borders).
- **Brand (pine green ramp):** `brand-50 … brand-900`; primary actions use `brand-600`
  (hover `brand-700`).
- **Accent (brass):** `accent-400/500` — **sparing** highlights only.
- **Status:** `success`, `warning`, `danger`, plus soft pill fills (`warning-soft`/`warning-ink`,
  `danger-soft`/`danger-ink`).
- **Radius:** `rounded-md` (10px chips), `rounded-lg` (11px buttons/inputs), `rounded-xl` (16px
  cards), `rounded-2xl` (20px hero/large panels).
- **Shadows:** `--shadow-card`, `--shadow-lift`, `--shadow-btn`, `--shadow-summary`,
  `--shadow-panel` — applied via `shadow-[var(--shadow-card)]`.
- **Type:** one family — **Manrope** (`--font-sans`); weight + tracking do the work
  (`font-semibold`/`font-extrabold`, `tracking-tight`).

## Composition

- Always merge classes with `cn()` (clsx + tailwind-merge) so conflicting utilities de-dupe:
  `cn(base, variants[variant], className)`.
- Build from primitives — `Button` (variants `primary|secondary|ghost|danger`, sizes `sm|md|lg`),
  `Input`/`fieldClasses`, `Select`, `Badge`, `Skeleton`, `States`, `Icon`, `Toggle`. Compose them;
  don't restyle from scratch.
- Reuse feature components: `ProductGrid`/`ProductCard` for any product list,
  `RecommendationsSection` for suggestion strips (renders nothing when empty),
  `OrderStatusBadge` for status.

## Money & dates

- Display money with `formatPrice(cents)` ([format.ts](../../../frontend/src/lib/format.ts)) — never
  hand-format or divide inline in JSX. Dates via `formatDate(iso)`.

## States (every data region)

Render **all** of: loading (`Skeleton`/`pp-skeleton` shimmer), empty (`EmptyState`), error
(`ErrorState` with retry), success — see [States.tsx](../../../frontend/src/components/ui/States.tsx).
A view without these is incomplete.

## Motion

Quiet by default: `pp-rise`/`pp-rise-delay` for above-the-fold entrance, shimmer for skeletons. All
motion must disable under `@media (prefers-reduced-motion: reduce)` (already wired in globals.css).

## Responsive

Mobile-first. Stack to a single column on small screens; expand to grids at `sm`/`md`/`lg`
(`grid md:grid-cols-2`, catalog grids). Keep content max-widths and spacing rhythm consistent with
existing pages (`mx-auto max-w-… px-4 sm:px-6`). Admin is denser but uses the same language.

## Anti-patterns

- ❌ Raw hex / arbitrary colors instead of tokens (one-off decorative gradients that already exist
  in the codebase are the only exception).
- ❌ Concatenating className strings without `cn()` (Tailwind conflicts won't resolve).
- ❌ Introducing a second font, a new radius/shadow scale, or a UI kit/shadcn.
- ❌ Formatting money inline (`$${cents/100}`) instead of `formatPrice`.
- ❌ A data view missing its loading/empty/error states.
- ❌ Re-implementing a product card/grid instead of reusing `ProductCard`/`ProductGrid`.
- ❌ Adding a new base primitive inline instead of requesting one from the design-system owner.
