# Task 021 — Basket Cost per Store (the math)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 4 (Task 3)

## Objective

The heart of the product: **"what would this basket cost at each store this week?"** Given a user's `List`, compute the basket total per store — summing current offers for matched items, and **falling back to a stored baseline price** (from Phase 3 receipts) for items with no current offer. This is the number that produces the store ranking (Task 022) and the madplan (Task 023).

## Context

Two price sources combine:

- **Offers** (Tjek feed, Phase 1/2): current, official, but only cover _offer_ items — the ~20% of a basket that's on sale.
- **Baseline prices** (`price_point` with `source='receipt'`, Phase 3): cover non-offer items from real user receipts.

An item with **no** offer and **no** baseline has no price — flag it honestly (don't fake it). The basket math needs unit-price handling (Phase 2 task 4: kg/liter normalization) so "500 g at 20 kr" and "1 kg at 35 kr" compare correctly.

**Sequencing:** depends on Lists (Task 018) and the baseline data (Phase 3). Pure computation — should be testable without a running server.

## What to build

1. **A pure basket-cost function** (e.g. `src/lib/basket-cost.ts`): input = list items, output = per-store cost breakdown. No I/O in the core math — pass in the offer/baseline lookups, make it unit-testable.

2. **Per-store cost:**
   - For each list item, find the best current offer at that store (product-linked items only; free-text items can't be priced)
   - **Normalize unit price** (Phase 2's logic): compare "500 g @ 20 kr" vs "1 kg @ 35 kr" on price-per-kg, not shelf price
   - Items with no offer **fall back to the baseline price** (`price_point`, source='receipt') for that product at that store, if one exists
   - Items with **neither** → flagged "no price" (honest), excluded from the total, counted separately

3. **Return shape:** per store — `{ storeId, basketTotal, offerItems, baselineItems, noPriceItems }`. Enough to power both the ranking (022) and the offer-vs-baseline visual distinction (below).

4. **Offer vs baseline distinction** — the total must be able to show _which part_ came from offers vs baselines (the plan's verification requires "offer-only items and baseline items are visibly distinguished in the total").

## Important

- **Pure function, testable** — the basket math must run against fixtures without a DB. Inject the price lookups; don't hardcode DB calls in the core.
- **Unit-price normalization is mandatory** — comparing shelf prices across different pack sizes is wrong (a 500 g and a 1 kg "both at 20 kr" are not equal). Reuse Phase 2's normalization.
- **Honest "no price"** — an item with no offer and no baseline is flagged, not silently priced at 0 or guessed.
- **Product-linked items only** get priced; free-text items are excluded from cost but must not break the computation.
- **Don't build the store comparison UI or madplan here** — those are Tasks 022/023. This is the math layer.

## Acceptance criteria

- [ ] A pure function computes basket cost per store from list items + offer/baseline lookups
- [ ] Unit prices are normalized (kg/liter) so different pack sizes compare correctly
- [ ] Offer items and baseline items are tracked separately (distinguishable in the total)
- [ ] Items with no offer and no baseline are flagged "no price," not guessed
- [ ] Free-text items don't break the math (excluded from cost, not crash)
- [ ] The function is unit-tested with fixtures (incl. a 10-item list producing a per-store breakdown)
- [ ] `vp check` + `vp test` pass
