# Task 038m — Add Measurement (grams/liters) to Products

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 2 (product schema) + Phase 4 (basket). Found **2026-08-15** (Nick): products like "Coca-Cola" and "NUTELLA" should carry a measurement (e.g. "1,5 L", "400 g") so users know the size they're comparing.

## Objective

Populate the **measurement (unit + size)** on products so a user sees "Coca-Cola 1,5 L" or "NUTELLA 400 g" — not just the bare name. Currently `product.unit` and `product.size_grams` columns exist but are **always null** in ingestion; the measurement data is already available on the offer but never propagated.

## Root cause (verified 2026-08-15)

- `src/db/schema.ts` — `product` has `unit: string | null` and `size_grams: number | null` (lines 38–39). The fields exist.
- `src/lib/tjek-ingest.ts` `upsertProduct` (line 38) hardcodes them to `null`: `.values({ id, name, brand: null, ean: null, unit: null, size_grams: null })`.
- But the **offer already carries the measurement**: `offer.quantity.unit.symbol` (e.g. "g", "kg", "ml", "l") and `offer.quantity.size.from`/`to` (e.g. 400, 1.5). Verified in real fixtures: "Schulstad brød" g/470–1080, "REMA 1000 Bologna Italiensk is" ml/750, "Hakket dansk oksekød" g/400.
- So the data exists upstream but is thrown away at product creation.

## What to build

1. **Propagate measurement from the offer to the product in `upsertProduct`** (src/lib/tjek-ingest.ts). When creating/updating a product from an offer, set:
   - `unit` from `offer.quantity.unit.symbol` (e.g. "g", "kg", "ml", "l", "stk") when meaningful.
   - `size_grams` — the representative size. For a single size (`from === to`), use that value. For a range (`from < to`, e.g. 400–500 g meat), use `from` (the minimum, conservative) and store the unit. Do NOT hardcode to null.

2. **Handle the unit→size representation honestly.** The `size_grams` column name implies grams, but sizes come in g, kg, ml, l, stk. Decide the cleanest representation (Nick/implementer confirms):
   - Option A: normalize everything to a single unit for comparisons (e.g. convert kg→g, l→ml) so `size_grams` is truly comparable.
   - Option B: keep `unit` + raw size and rename/extend the column to `size` + `unit` so "1,5 L" and "400 g" are stored as-is and displayed as-is.
   - The product page and basket math should then be able to display "1,5 L" / "400 g" from the product.
   - **Do NOT silently mix** — a "1,5 L" Coca-Cola and a "400 g" Nutella must be comparable on the product page, and unit-price logic (already in `unit-price.ts`) must stay consistent.

3. **Display the measurement on the product.** The product page (`src/routes/products/[id].tsx`) should show the measurement next to the name (e.g. "Coca-Cola — 1,5 L") so the user sees what they're comparing. Keep the current offers list working.

4. **Consider unit-price composition.** The offers already compute `unit_price` (kr/g, kr/l via `unit-price.ts`) — the product's `unit`/`size` should align with that so a user comparing "Coca-Cola 1,5 L" vs "Coca-Cola 0,5 L" sees which is cheaper per liter. Verify the product page surfaces this if it doesn't already.

## Important

- **The data is already upstream on the offer** — this task is about _not throwing it away_ and _displaying it_. Don't invent measurements; propagate what Tjek provides.
- **Handle the "no meaningful measurement" case** — products where unit is "stk" (count) or size is null should stay without a measurement (a single product with no size is fine). Don't fabricate.
- **Ranges:** a product with `from < to` (variable weight meat, 350–800 g) — use `from` (minimum) as the representative and note it's variable if the UI needs to. Don't show a single misleading number as exact.
- **Schema change (if Option B) needs a migration** — `size_grams` → `size` + preserve `unit`. If Option A (normalize to grams), no column rename but be careful about ml/l.
- **Don't break basket math or matching** — `normalizeName` strips size suffixes from headings; storing the size separately on the product is additive, must not break `matchProductName` or `computeBasketCosts`.
- Plain Danish for any new UI labels.

## Acceptance criteria

- [ ] Coca-Cola and NUTELLA products show a measurement (e.g. "1,5 L", "400 g") on the product page
- [ ] `product.unit` + size populated from the offer, not hardcoded null
- [ ] Products with no meaningful measurement (stk / null size) correctly show none
- [ ] Variable-size products (ranges) represented honestly (minimum, not a fake exact number)
- [ ] Product page + offers list display the measurement; unit-price comparison works
- [ ] No regression in basket math, matching, or `normalizeName`
- [ ] Migration (if schema changes) is clean and idempotent
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified live on `beta.skujeg.dk` (Coca-Cola shows L, Nutella shows g)
