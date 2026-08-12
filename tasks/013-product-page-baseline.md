# Task 013 — Receipt-derived Prices on the Product Page

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 3 (verification: "Baseline prices appear on product pages and are visually distinguished from offers")

## Objective

Show **baseline prices** (from receipts) on the product page, visually distinguished from the weekly **offers** (from the Tjek feed). This is how the receipt data becomes visible value.

## Context

Phase 3's verification criteria: *"Baseline prices appear on product pages and are visually distinguished from offers."* The product page currently shows only offers (from `src/server/queries.ts` → `getProductById`). This task adds the receipt-derived baseline layer alongside it.

The distinction matters (it's the trust-tier / legal-boundary system made visible):
- **Offers** = official weekly deals (Tjek feed) — `trust_tier='official'`
- **Baseline** = crowd-sourced from receipts — `trust_tier='community'`/`'single'`

They must LOOK different so a user knows "this is a user-reported price" vs "this is the official offer."

## What to build

1. **Query** — extend `getProductById` (in `src/server/queries.ts`) to also return receipt-derived prices from `price_point` where `source='receipt'`, grouped by store. (Or a new query function.)

2. **UI** — on the product page (`src/routes/products/[id].tsx`), add a **"User-reported prices"** section, visually distinct from the offers:
   - different background/border/labeling
   - a trust-tier indicator per price (✓ official / ● community / grey user-reported — the plan's trust system made visual)
   - show store name + price + observed date

3. **Label honestly** — never imply a crowd/receipt price is an official offer. The Omnibus-compliant framing: call it "user-reported" or "receipt price," not "discount" (per the plan's compliance note).

## Important

- **Visual distinction is the whole point.** If baseline and offers look the same, this task failed — a user must be able to tell at a glance which is official and which is crowd-sourced.
- **Trust-tier indicator** — this is where the plan's three-tier system (official/community/single) becomes visible. Design it now, even if it's simple.
- Only show baseline prices that exist — empty state is fine ("No user-reported prices yet").
- Don't over-engineer the chart — a simple list/table is enough; the sparkline can come later.

## Acceptance criteria

- [ ] Product page shows both offers AND receipt-derived baseline prices
- [ ] Baseline prices are visually distinguishable from offers (different styling)
- [ ] Each price carries a trust-tier indicator (official/community/user-reported)
- [ ] Crowd prices are labeled "user-reported"/"receipt," not "discount"
- [ ] Empty state when no baseline prices exist
- [ ] `vp check` + `vp test` pass
