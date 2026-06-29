# Full-Stack Developer Assessment — Mini E-Commerce Platform

## Overview

You will build a complete e-commerce platform consisting of a **customer storefront** and an **admin panel**, sharing a single backend. The goal is a working, coherent application — not a polished, production-grade product.

**You are required to build this using agentic AI tools** — Claude Code, Cursor (agent mode), Windsurf, or a comparable agent-driven workflow. This is not an autocomplete-assisted exercise; we are specifically assessing how well you *drive an agent* to deliver real software: how you scope and instruct it, how you supervise and verify its work, and how you recover when it goes off track. Hand-writing the whole thing without agentic tooling defeats the purpose of the assessment.

**The UI/UX design must be your own, produced using design agents** — tools such as Claude Design, v0, Figma (with AI), or similar. You may not lift a ready-made template, theme, or UI kit and drop it in. We want to see you generate and shape the design yourself through design tooling: layout, visual style, and component design driven by you. Off-the-shelf component primitives (e.g. a headless UI library) are fine as building blocks, but the overall look and structure should be something you created, not downloaded.

**Format:** This is a **supervised, timed session** (~5–6 hours).

**Guiding principle:** *Working over polished. Coherent over complete.* If you run short on time, a smaller scope that works end-to-end and is well-reasoned beats a larger scope that's half-wired. Mock what you must, and document what you'd do with more time.

---

## Tech Stack

Use a stack you're productive in. Suggested (not mandatory):

- **Backend:** Node.js (NestJS)
- **Frontend:** React, Next.js
- **Database:** PostgreSQL, MySQL or MongoDB
- **Auth:** JWT or session-based — your choice

If you'd prefer we pin the stack to match our team, ask before starting. Otherwise, choose freely and tell us why in your notes.

---

## What to Build

The application has two sides backed by one API.

### Part 1 — Customer Storefront

1. **Product catalog**
   - Browse products with name, description, price, image, category, and stock quantity
   - Search by product name
   - Filter by category and price range
   - Sort by price and by newest
   - Paginate the product list (don't load everything at once)

2. **Product detail page**
   - Full product information
   - Add-to-cart action with quantity selection

3. **Shopping cart**
   - Add, remove, and update item quantities
   - Cart persists across sessions (a returning logged-in user sees their cart)
   - Cart shows line totals and an order total

4. **Checkout**
   - A checkout flow that captures the order and processes a **test/mock payment**
   - You may use Stripe **test mode** (recommended) or a clearly-mocked payment step — do not integrate real payments
   - On success, create an order and show an order confirmation

5. **Order history**
   - A logged-in customer can view their past orders and each order's status

6. **Authentication**
   - Signup and login
   - A customer can only see and act on their own cart and orders

### Part 2 — Admin Panel

1. **Product management**
   - Create, edit, and delete products
   - Support a product image (upload, or image URL — your call, document the choice)

2. **Order management**
   - View all orders
   - Update order status through its lifecycle: `pending → processing → shipped → delivered` (and a `cancelled` path)

3. **Admin dashboard**
   - A simple analytics view: total sales, order count by status, and top-selling products
   - Present at least one of these as a chart

4. **Access control**
   - The admin panel and its endpoints must be restricted to admin users
   - Regular customers must not be able to access admin functionality

---

## Cross-Cutting Requirements

These apply across the whole app and matter as much as the features above:

- **Design** — the UI/UX is your own, created through design agents (see Overview). Aim for a clean, coherent, usable interface across both storefront and admin — consistent layout, sensible navigation, and a deliberate visual style. We're not after pixel-perfection; we want evidence you can direct design tooling to produce something cohesive rather than generic.
- **Input validation** on both client and server — handle bad input gracefully, don't trust that the client always behaves
- **Error handling** — meaningful errors, sensible HTTP status codes, no raw stack traces leaking to users
- **Data integrity** — order totals, stock, and statuses should remain correct and consistent; think about what happens at edge cases (e.g. ordering more than is in stock, an item priced incorrectly)
- **Security** — authentication enforced where it should be, authorization checked properly, secrets kept out of the codebase, passwords never stored in plain text
- **Seed script** — a script that populates the database with sample products, at least one admin user, and one customer, so we can run the app immediately
- **README** — clear setup and run instructions: prerequisites, environment variables, how to start backend and frontend, seeded login credentials
- **Tests** — a few meaningful automated tests covering important logic (you choose what's most worth testing; quality over quantity)

---

## One Open-Ended Requirement

In addition to the above, implement the following:

> **Customers should be able to see product suggestions that are relevant to them.**

This requirement is intentionally open. There is no single correct interpretation. Decide what "relevant" means, implement a reasonable version of it, and **document your interpretation and reasoning** in your notes. We're interested in how you handle ambiguity, not in a specific answer.

---

## What to Submit

At the end of the session, submit a Git repository containing:

1. **The full source code** — backend, frontend, seed script, tests, README.

2. **Coherent Git history** — commit as you go, in logical increments with clear messages. Please do **not** end with a single "final commit" dump. The history is part of what we review; it shows how you and the agent worked through the build.

3. **A `NOTES.md` file** covering:
   - **Agent workflow** — which agentic tool(s) you used and how you drove them: how you scoped tasks, structured prompts/instructions, and managed context (e.g. a `CLAUDE.md` or equivalent project-context file, reusable prompts).
   - **Where the agent helped and where it failed** — places the agent got something wrong, subtly or obviously, and how you caught and corrected it. This is one of the most important things we look at.
   - **Supervision & verification** — how you checked the agent's output rather than accepting it blind.
   - **Design workflow** — which design agent(s) you used and how you directed them to produce the UI; how much you iterated on the look and structure.
   - **Assumptions** — every decision you made on anything ambiguous, including your interpretation of the open-ended requirement above.
   - **Trade-offs and scope** — what you built fully, what you mocked or simplified, and what you'd do with more time.

4. **Agent session transcripts/logs** — if your tool produces them (Claude Code does), include them. Combined with the observed session, these are central to how we assess your agentic workflow.

---

## How You'll Be Evaluated

You'll be scored across these dimensions:

- **Agentic workflow & orchestration** — how well you scoped work for the agent, instructed and steered it, managed context, iterated, and recovered when it went off track. This is the headline dimension for this assessment.
- **Verification & judgment** — clear evidence you reviewed and validated the agent's output rather than shipping it blind. Tests, caught mistakes, sound edge-case handling.
- **Correctness & completeness** — does it run from a clean clone and meet the spec?
- **Code quality & architecture** — is the structure coherent and maintainable, or stitched together?
- **Handling ambiguity** — did you make reasoned decisions and document them, or let the agent guess?
- **Design & UX** — is the interface cohesive, usable, and deliberately styled, and did you direct design agents to get there rather than dropping in a template?
- **Security & data integrity** — auth, authorization, secret handling, and correctness of money/stock/state.

A strong submission isn't necessarily the one with the most features. It's the one that runs, holds together, handles the tricky bits sensibly, and shows clear thinking about what was built and why.

---

## Ground Rules

- **Agentic workflow is required, not optional.** Drive the build through an agent. We're assessing that skill directly — there's no penalty for the agent doing the heavy lifting, only for driving it carelessly.
- **Own your code.** You should understand and be able to explain anything you submit, regardless of how much the agent wrote. We will ask you to walk through parts of it in a follow-up conversation.
- **Ask if blocked.** If a requirement is genuinely unclear (beyond the intentionally open one), ask rather than stall. Reasonable assumptions documented in `NOTES.md` are also fine.
- **Don't over-build.** Resist polishing one corner while leaving the app unwired. Breadth that connects end-to-end beats depth in one spot.

---

## Suggested Starting Checklist

Not required, just a sensible order if you want one:

1. Skim the whole spec and sketch your data model and endpoints before writing code.
2. Decide your stack and scaffold the project; get a "hello world" running on both ends.
3. Set up the database, models, and seed script early.
4. Build auth first — it underpins everything else.
5. Build the storefront read paths (catalog, detail, filtering) before the write paths (cart, checkout).
6. Then orders, then the admin side.
7. Add the open-ended feature and the dashboard.
8. Write your tests and your `NOTES.md` as you go, not at the end.
9. Do a clean clone into a fresh folder and follow your own README before submitting.

Good luck — build something that works, and show us how you think.
