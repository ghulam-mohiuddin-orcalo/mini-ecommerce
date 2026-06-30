---
name: accessibility
description: Accessibility rules for the frontend — semantic markup, labelled controls, keyboard/focus, alerts, images, and reduced motion — grounded in this app's primitives. Load when building or reviewing any UI.
---

# Accessibility

Accessible by construction, using the patterns already in the codebase. Aim for WCAG AA;
accessibility is part of "done", not a later pass.

## Forms & controls

- Every input has an associated `<label htmlFor>` (the login/signup pages do this) — placeholders
  are **not** labels.
- Use native semantics: real `<button>` (the `Button` primitive sets `type="button"` by default;
  set `type="submit"` for form submit), `<a>`/`<Link>` for navigation, `<form onSubmit>` with
  `e.preventDefault()`.
- Use correct input types and `autoComplete` (`type="email" autoComplete="email"`,
  `type="password" autoComplete="current-password"`), and `required`/`min` for native validation.
- Disable submit while pending and reflect it in the label (`disabled={mutation.isPending}` →
  "Signing in…").

## Errors & status

- Render form/error messages in a container with `role="alert"` so they're announced (see the
  login page's error paragraph).
- Don't rely on color alone for status — pair the `OrderStatusBadge` color with its text label.

## Keyboard & focus

- Everything interactive must be reachable and operable by keyboard.
- Keep the **visible focus ring** every primitive defines (`focus-visible:ring-2 …` on `Button`,
  `focus:ring-[3px] ring-brand-500/15` on fields) — never `outline:none` without a replacement.
- Preserve a sensible DOM/tab order; don't trap focus.

## Images & media

- Meaningful images get descriptive `alt`; purely decorative images (e.g. the login brand photo)
  use `alt=""` so screen readers skip them.

## Motion

- Respect `prefers-reduced-motion` — the `pp-rise`/shimmer animations already no-op under it in
  globals.css. Don't add motion that ignores this.

## Color contrast

- Use the token pairings that already meet contrast: `ink`/`ink-soft` on `paper`/`surface`, white
  on `brand-600`, the soft-pill `*-ink` on `*-soft`. Don't put `muted`/`faint` text on a colored
  fill where it fails contrast.

## Anti-patterns

- ❌ A clickable `<div>`/`<span>` instead of a `<button>`/`<a>`.
- ❌ Placeholder-as-label, or an input with no label.
- ❌ Removing focus outlines without a visible replacement.
- ❌ Conveying state with color only (no text/label).
- ❌ `alt` text on decorative images (or missing `alt` on meaningful ones).
- ❌ Motion that ignores `prefers-reduced-motion`.
