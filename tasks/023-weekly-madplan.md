# Task 023 — Weekly Madplan with Budget

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 4 (Task 5)

## Objective

The **culturally native Danish feature** and the screenshot-for-distribution moment: **"plan my week for under 500 kr."** The user picks a budget and number of days; the app assembles a week of meals from the templates (Task 020) and picks the cheapest store for the whole basket. Output: a **shareable weekly plan** (meals, basket, store, total) that respects the budget cap.

## Context

This is the feature PriceRunner-style sites don't have and the one most likely to be shared/screenshotted. It's also the repeatable content engine — a weekly "madplan for 500 kr" blog post (Phase 8's content lever) is this feature dogfooded. The constraint solver **starts simple: greedy fill from templates by budget, then cheapest-store assignment. No linear programming in v1.**

**Sequencing:** depends on templates (Task 020), basket cost (Task 021), and store comparison (Task 022). This assembles those into a week.

## What to build

1. **Madplan route** (`src/routes/madplan.tsx` or similar): inputs = budget (kr) + number of days (default 7). Danish UI.

2. **Greedy meal assembly** — pick meals from the templates (Task 020) day by day until the budget is filled or days run out:
   - Start with the cheapest meals, add until budget cap or day count reached
   - Each meal's cost = its basket cost at the cheapest store (Task 021/022)
   - **Greedy, not optimal** — don't build a linear-programming solver. A reasonable greedy fill that respects the budget is the v1 scope.
   - If the budget can't fill the days (e.g. 7 days under 300 kr), say so honestly and suggest raising the budget — don't silently overspend.

3. **Cheapest-store assignment** — for the assembled week's combined basket, pick the cheapest store (reuse Task 021/022).

4. **Output: shareable weekly plan** — meals, the combined basket, the chosen store, the total. Designed to be screenshotted: one clean view. A share link/copyable summary is a bonus if cheap.

5. **Budget-respecting** — the total must stay under the cap (greedy may not hit it exactly; it must not blow past it).

## Important

- **Greedy fill, no LP** — the plan is explicit: "constraint solver starts simple: greedy fill from templates by budget, then cheapest-store assignment. No linear programming in v1." Don't over-engineer.
- **Honest when it can't fit** — if the budget can't cover the requested days, surface it and suggest a raise, rather than returning an over-budget plan.
- **Reuse, don't rebuild** — templates (020), basket cost (021), store comparison (022). This task is the assembly layer on top.
- **This is the content engine** — a clean shareable output that doubles as the "madplan for 500 kr" blog post. Make it screenshot-worthy.
- **Don't build Phase 5 (travel cost) into this** — fuel-adjusted store choice is a later phase. The madplan picks the cheapest store by basket cost alone for now.

## Acceptance criteria

- [ ] User picks budget + number of days; a week of meals is assembled from templates
- [ ] The plan's total respects the budget cap (greedy fill; doesn't blow past it)
- [ ] The cheapest store is assigned for the week's combined basket
- [ ] When the budget can't fill the days, the UI says so honestly and suggests raising it
- [ ] Output is a shareable weekly plan (meals, basket, store, total) in one clean view
- [ ] `vp check` + `vp test` pass
