# Task 003 — Tjek Ingestion Worker (REMA first)

**Repo:** `~/price-watcher`
**Plan source:** `docs/build-plan.md` → "What to code — Phase 1" (the ingestion flow) + `src/lib/__fixtures__/rema1000.offers.json` (ground truth, local)

## Objective

Write the ingestion function that pulls REMA 1000's offers from the Tjek API into the `offer` + `price_point` tables. Must be **idempotent** — re-running the same week inserts nothing new. This is the single most important correctness requirement of Phase 1.

## Dependencies

Uses Task 001 (Kysely schema) and Task 002 (Tjek client). Do Task 002 first.

## The ingestion flow (exact)

```
ingestChain(dealerId):
  1. GET /v2/catalogs?dealer_id={dealerId}        -> catalogs[]
  2. filter: only catalogs with offer_count > 0   (skip editorial/seasonal zero-offer catalogs)
  3. for each catalog: GET offers, paged           (Task 002 getOffers)
  4. for each offer, map to a row:
       heading              -> product.name (and the product row)
       pricing.price        -> offer.price
       pricing.pre_price    -> offer.pre_price
       run_from / run_till  -> offer.valid_from / offer.valid_to
       publish              -> offer.published_at
       quantity.unit.symbol -> offer.unit
       quantity.size.from/to-> offer.size_from / offer.size_to
       quantity.pieces.max  -> offer.pieces_max
       images.view          -> offer.image_url
       (keep full payload)  -> offer.raw_json
  5. upsert offer by natural key = (dealer_id, catalog_id, tjek offer id)
     -> re-running the same week must NOT duplicate
  6. write a price_point per offer (history starts accruing now)
  7. set source='tjek', trust_tier='official', internal=true
```

## Key requirements

- **Product identity (v1):** create one `product` per unique `(heading, dealer_id)` pair. Do NOT attempt cross-chain dedup in Phase 1 — that's Phase 2. Just ensure the same heading from REMA maps to the same product row.
- **Idempotency:** key the offer upsert on the Tjek offer `id`. Re-running a week inserts nothing new. This is verified by running ingest twice and asserting identical offer counts.
- **Legal boundary:** every row written here must have `source='tjek'`, `trust_tier='official'`, `internal=true`. Feed rows are internal-only.

## Suggested function

```ts
ingestChain(dealerId: string): Promise<{ inserted: number; updated: number }>
ingestRema(): Promise<...>  // wrapper: ingestChain('11deC')
```

## Acceptance criteria

- [ ] `ingestChain('11deC')` pulls REMA's current-week offers into `offer` + `price_point`
- [ ] Running it twice produces identical offer counts (idempotency verified)
- [ ] Every inserted offer has `source='tjek'`, `trust_tier='official'`, `internal=true`
- [ ] `raw_json` holds the full original Tjek payload
- [ ] Zero-offer catalogs (editorial/seasonal) are skipped
