# Task 038n — Basket Math: Use Product Measurement When List Item Has No Unit

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 4 (basket) + 038m (product measurements). Found **2026-08-15** (Nick): added NUTELLA (linked product, not free text) to a list, but the compare page says "Ingen butikker har priser på disse varer endnu" even though NUTELLA is discounted at MENY.

## Objective

Fix the basket math so a product-linked list item **prices correctly even when the list item has no unit/quantity of its own** — by falling back to the **product's measurement** (e.g. NUTELLA → 350 g), which 038m now stores on the product.

## Root cause (verified 2026-08-15)

- NUTELLA offer exists in the DB and the offer query finds it: MENY, 36 kr, `unit_price` = 102.86, `unit_price_unit` = **kr/kg**, size 350 g. ✅
- The list item correctly links to the NUTELLA product (`product_id` set), but its **`unit` column is NULL** (and quantity is NULL). ✅ correct data.
- `src/lib/basket-cost.ts` `pickBestOffer` requires:
  ```ts
  convertToUnit(1, item.unit, unitCategory(o.unitPriceUnit)) !== null;
  ```
  With `item.unit = null`, `convertToUnit(1, null, "kg")` returns **null** (it can't convert an unknown unit). So the NUTELLA offer is **filtered out of `comparable`**, `pickBestOffer` returns null, and the item prices as "no-price".
- **Affects every product-linked item whose list entry has no unit.** Verified: all 3 linked list items in the beta DB have `unit IS NULL`. This is the gap 038m created: the product now carries `unit`/`size` (350 g), but the basket math never falls back to it for list items that don't set their own unit.

## What to build

1. **Fall back to the product's measurement** when a list item has no unit/quantity of its own. The list item links to a product which (post-038m) has `unit` (g/kg/ml/l/cl) and `size`. When `item.unit` is null, use the linked product's `unit` and `size` as the item's effective unit/quantity so the unit-price conversion can run:
   - NUTELLA (product: g/350) → item effectively "1 × 350 g" → prices at 102.86 kr/kg × 0.35 kg = 36 kr. ✅
   - A product with `size_to` (range) uses the `size` (minimum) — consistent with 038m's display.

2. **Where:** the basket item assembly — `getBasketCosts` (src/server/lists.ts) builds items as `{ productId, quantity, unit }` from `list_item`. It must **join the product** and, when the list item has null unit/quantity, default from the product's `unit`/`size`. Ensure `computeBasketCostsForItems` receives the product's measurement in this case. (The product measurement is now on the product row — the join gives it.)

3. **Don't break explicit units.** If a user set a quantity/unit on the list item (e.g. "Spaghetti 500 g × 2"), that must still win over the product default. Only fall back when the list item's unit/quantity is null.

4. **Verify the count-based case still works** — `convertToUnit` for `stk`/count (empty unit) should still behave (a product with no size/measurement, or a stk product, prices by count). Don't force a gram conversion on a count product.

## Important

- **This is the missing link between 038m and the basket** — 038m added product measurements but the basket never used them as the fallback. That's the whole bug.
- **Keep `priceItem`/`computeBasketCosts` honest** — don't invent a price; just give the item a unit so the existing kr/kg / kr/l conversion can run.
- **Consistency with 038m's range handling** — variable-size products use `size` (minimum), matching the product page.
- This is a correctness bug in the core M1 flow (a user's basket must price real offers) — pre-beta priority.
- Plain, careful — regression risk: don't break items that DO have explicit units, or count-based pricing.

## Acceptance criteria

- [ ] A list with NUTELLA (product-linked, no explicit unit) shows MENY at 36 kr on the compare page
- [ ] A list item with an explicit unit/quantity (e.g. 500 g × 2) still prices using its own values
- [ ] Count-based products (stk / no measurement) still price correctly
- [ ] Variable-size products use `size` (minimum), consistent with product page
- [ ] No regression on free-text items (still shown as unpriced — 038g behavior)
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified live on `beta.skujeg.dk` (the NUTELLA-only list shows MENY 36 kr)
