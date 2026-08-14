# Task 038 — Screenshot-Worthy Store Comparison + Madplan

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7b (Task 3)

## Objective

Polish the **store comparison** (Phase 4 Task 022) and the **madplan** (Phase 4 Task 023) to be **screenshot-worthy** — clean, shareable, and aligned with the winning design system (Task 036). These are the "screenshot-for-distribution" moments and the single most shareable asset (feeds the "madplan for 500 kr" blog content engine).

## Context

These two screens are what Nick will screenshot and share (build-in-public blog posts, social). They must look intentional in the polished design, not just functional.

## What to build

1. **Store comparison page** — clean ranked table (cheapest-first), readable verdict + savings line, offer-vs-baseline split visually clear, trust badges correct, no visual clutter. Screenshot at a sensible width should look deliberate.
2. **Madplan page** — the weekly plan (meals, basket, store, total, budget cap respected) presented cleanly. This is the flagship shareable; it should read as a product screenshot at a glance.
3. Both aligned to the **design-system tokens** (Task 036) — not a separate style.

## Important

- **These are the shareables** — prioritize visual polish over feature additions. No new functionality unless it's needed to make the screenshot clean (e.g. empty states).
- **Honest labeling intact** — offer vs. baseline (receipt/crowd) items stay visibly distinguished; trust badges stay correct. A screenshot must not misrepresent.
- **Budget respect visible** — the madplan shows it stayed under the budget cap (that's the point of "madplan for 500 kr").
- **Danish copy** — screenshot content is Danish (products, prices, labels).

## Acceptance criteria

- [ ] Store comparison renders as a clean, deliberate, shareable table (screenshot-worthy at a standard width)
- [ ] Madplan renders cleanly as the flagship shareable, showing budget respect
- [ ] Both use the design-system tokens; offer/baseline + trust distinctions remain visually correct
- [ ] Danish copy throughout
- [ ] `vp check` + `vp test` pass
