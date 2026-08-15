# Task 038j — Split Multi-Product Offers into Separate Selectable Products

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 4 (lists/basket). Found **2026-08-15** (Nick): on the lists page, "Coca-Cola, Coca-Cola Zero eller Fanta" appears as a single selectable product. **Decision (Nick, 2026-08-15): Option B — split multi-product offers into separate products.**

## Objective

Make multi-product offers selectable as **separate products**. Danish supermarket offers frequently sell several alternatives in one deal — "Coca-Cola, Fanta eller Tuborg Squash 24-pak — 69 kr" means "pay 69 kr, pick whichever." Currently each such offer becomes **one** `product` row (the whole heading), so a user can't add just "Coca-Cola" — they get "Coca-Cola, Fanta eller Tuborg Squash 24-pak" as one item, and the basket prices a mixed-choice deal as a single line.

## Root cause (verified 2026-08-15)

`src/lib/tjek-ingest.ts` creates **one product per offer heading** (`upsertProduct(dealerId, offer.heading)`, line 84), with a deterministic UUID derived from the heading (`productUuid`). A multi-product heading ("Coca-Cola, Fanta eller Tuborg Squash 24-pak") becomes a single `product`. **28% of the catalog (744 of 2,657 products) has "eller" in the name** — this is common, not an edge case.

Note: this is NOT a `linkProducts`/matching bug — those products are genuinely distinct headings. The split must happen at **product creation** (ingestion), not in the matching step.

## What to build

1. **Split multi-product offer headings at ingestion** in `src/lib/tjek-ingest.ts` `upsertProduct`. When an offer heading lists multiple alternatives (contains "eller" and/or comma-separated brand/product names), create **one product per alternative** instead of one for the whole heading.

2. **How to split the heading** (Nick to confirm the exact parser, but this is the shape):
   - Split on the Danish "eller" (either/or) and on commas within the alternative list.
   - Example: "Coca-Cola, Fanta eller Tuborg Squash 24-pak" → ["Coca-Cola", "Fanta", "Tuborg Squash 24-pak"].
   - Keep the **shared suffix** (size/quantity like "24-pak", "6x0.5l") on the last/named alternatives as appropriate — the deal price applies to the whole pack regardless of choice.
   - A non-multi offer (no "eller", no alternative list) is unchanged — one product.
   - Guard: don't split a genuine single product that happens to contain "eller" (e.g. a name that legitimately includes it) — confirm the split heuristic only triggers on clear alternative-list patterns (comma + "eller", or multiple known brand tokens).

3. **Each split product shares the offer's price/unit** — the deal is "any of these for 69 kr", so each alternative product links to the same `offer` (same price). The `offer` row itself stays as-is (it's one Tjek offer); only the **product** rows multiply, and the offer→product link points to each split product. (Decide the cleanest representation: either the offer links to multiple products, or the offer is duplicated per product — Nick/implementer confirms against how `offer.product_id` is used. The key requirement: each alternative is independently selectable and prices at the deal price.)

4. **Idempotency preserved** — re-running ingestion must not duplicate. The split products need stable deterministic UUIDs (e.g. derived from the offer UUID + the alternative index/name), so re-ingest upserts rather than re-inserts.

5. **The lists-page search then returns the individual alternatives** — "Coca-Cola" search returns "Coca-Cola" (and "Coca-Cola Zero", "Fanta" as their own rows), not the whole mixed heading. Verify via the existing `searchProducts` (`name ILIKE %query%`).

## Important

- **This is a data-model change to ingestion** — it affects how new offers are turned into products. Existing rows (already ingested, including the 744 multi-product ones) need a **re-ingest / re-split** so the current catalog gets fixed, not just future offers. Include a migration/backfill or a re-run path. Flag this explicitly.
- **Don't break the cross-chain matching** — after splitting, "Coca-Cola" (from the 24-pak deal) and a standalone "Coca-Cola" offer should still be able to link as the same product across chains. Test that the split doesn't fragment products that should unify.
- **Don't break receipt/baseline matching** — `matchProductName` uses `normalizeName`; splitting shouldn't cause a receipt line to match the wrong alternative.
- **Price semantics honesty** — each alternative inherits the deal price. A single Coca-Cola from a "24-pak" deal shows 69 kr. That's accurate if you buy the pack, but flag it so the UI can note "fra blandet 24-pak" if needed — do NOT silently present it as a single-bottle price.
- Plain Danish for any user-facing text (e.g. if the product name needs a "blandet pakke" hint).

## Acceptance criteria

- [ ] "Coca-Cola, Fanta eller Tuborg Squash 24-pak" becomes 3 selectable products (Coca-Cola, Fanta, Tuborg Squash 24-pak) — each selectable on the lists page, each pricing at the deal price
- [ ] `searchProducts("Coca")` returns the individual alternatives, not the whole mixed heading
- [ ] Non-multi offers unchanged (one product)
- [ ] Idempotent: re-running ingestion doesn't duplicate the split products
- [ ] Existing catalog backfilled/re-ingested so the current 744 multi-product rows are split
- [ ] Cross-chain matching still works (split "Coca-Cola" links with standalone "Coca-Cola" across chains)
- [ ] No regression on receipt/baseline matching (`vp test` green)
- [ ] Deal-price semantics surfaced honestly (no silent single-bottle price from a 24-pak)
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified live on `beta.skujeg.dk`
