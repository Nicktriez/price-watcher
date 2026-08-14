# Task 040 — Design System (Tailwind tokens from winning variant)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 9 (Task 1)

## Objective

Build a **consistent design system** — colors, typography, spacing, component styles — across all routes, using the **winning variant's tokens from Task 039**. This replaces the current ad-hoc Tailwind class soup.

## Context

Currently each route uses ad-hoc Tailwind classes (`text-gray-900`, `mx-auto max-w-3xl p-4`, etc. scattered per page). This task unifies them into one system. **Prerequisite: Task 039 done and Nick has picked the winner** — do NOT start before the winning tokens are documented.

## What to build

1. **A token layer** — define the palette (a fresh/grocery-appropriate scheme, not childish), type scale (display/body/label sizes), spacing scale, and radii. Where it fits the stack (Tailwind 4 via `@tailwindcss/vite`), express these as CSS custom properties / a theme, per the winning variant's tokens. No arbitrary values sprinkled inline.
2. **Shared component styles** — unify repeated elements into consistent classes/components: buttons, badges (incl. the trust-tier / user-reported badges), cards, tables (the store-comparison table), inputs. The goal: the same element looks the same everywhere.
3. **Apply across all routes** — sweep `src/routes/*` and `src/components/*` so every page uses the system, not per-page one-offs.

## Important

- **Use the winning tokens, not new ones** — Task 039 documented them. If a route needs something the tokens don't cover, extend the token layer, don't hardcode.
- **Preserve the honest/compliance labels** — the trust-tier "user-reported"/"Community" badges must remain visually distinct (green ✓ Official / yellow Community / grey user-reported) and Omnibus-clean after the restyle. Do NOT lose them in the redesign.
- **Keep it a restyle, not a feature build** — no new functionality, no layout restructuring beyond what the winning direction implies.
- **Mobile stays usable** — the receipt upload flow (Task 043 checks mobile) must not regress.

## Acceptance criteria

- [ ] A token layer exists (palette, type, spacing, radii) matching the winning variant
- [ ] Repeated elements (buttons, badges, cards, tables, inputs) are unified across routes — no ad-hoc class soup
- [ ] All routes/components use the system
- [ ] Trust-tier badges remain distinct + Omnibus-clean after the restyle
- [ ] `vp check` + `vp test` pass
