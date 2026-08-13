# Task 022 — Store Comparison View

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 4 (Task 4)

## Objective

The visible payoff of the basket math: **"which store should I shop at this week for my basket?"** A table of stores with their basket totals and the savings vs. the most expensive option. This is the number users came for — the answer to "where do I shop this week?"

## Context

Task 021 computes per-store basket cost. This task turns that into a ranked comparison UI. It's the M1 action ("build a basket and get a store ranking") — the thing the Beta phase (Phase 7) measures retention on. So this view is the product's centerpiece, and it must be clear, honest, and fast.

**Sequencing:** depends on basket cost (Task 021). Does NOT depend on travel cost (Phase 5) — fuel-adjusted totals are added later, not here.

## What to build

1. **Store comparison view** (`src/routes/lists/[id]/compare.tsx` or similar): for the user's list, show a **table of stores**:
   - Store name, basket total, savings vs. most expensive
   - Sorted cheapest first (the "winner" on top)
   - Offer vs. baseline items visibly distinguished (per Task 021's output) — the user should see _why_ a store is cheap (current offers) vs. baseline prices

2. **The verdict line** — the "screenshot moment": a clear statement of the winner, e.g. "Your basket is cheapest at Netto — 74 kr, 38 kr less than the most expensive option." Plain Danish, no jargon.

3. **Baseline-only note** — stores where the total relies heavily on baseline (non-offer) prices should be marked honestly ("partly from user-reported prices"), consistent with the trust-tier / Omnibus framing from Tasks 014/017. Never present baseline prices as official offers.

4. **Empty/partial states:**
   - Empty list → prompt to add items or use a template (Task 020)
   - Items with no price → shown, but the store comparison is honest that not every item is priced everywhere

## Important

- **Clarity over cleverness** — this is the product's centerpiece. One clear winner, one clear number, honest about what's an offer vs. a baseline.
- **Offer vs. baseline distinction must be visible** — the plan's Phase 4 verification requires it. Don't collapse them into one opaque "total."
- **No travel cost here** — Phase 5 adds fuel-adjusted totals. Don't build it into this view yet; keep the baseline comparison clean. (A placeholder "driving cost" column is acceptable if it's clearly marked coming-soon.)
- **Honest about baseline prices** — never present user-reported prices as official offers (Omnibus).
- **Don't build the madplan here** — that's Task 023. This is the single-list store comparison.

## Acceptance criteria

- [ ] A 10-item list produces a store ranking (cheapest first) with basket totals
- [ ] Savings vs. most expensive is shown per store
- [ ] Offer items and baseline items are visibly distinguished in each store's total
- [ ] A clear verdict line states the cheapest store + the savings
- [ ] Stores relying heavily on baseline prices are marked honestly (user-reported, not official)
- [ ] Empty list → prompt to add items or use a template
- [ ] `vp check` + `vp test` pass
