# Task 024 — Store Geocoding (lat/lon for every store)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 5 (Task 1)

## Objective

Give every store real coordinates so travel cost (Task 025) can compute driving distance. The `Store` table already has `lat`/`lon`/`address`/`city`/`zip` columns from Phase 1 — this task **populates them** from store addresses. Without coordinates, OSRM routing has nothing to route between.

## Context

Phase 2's ingestion populated the `store` table (name, chain, address/city/zip) but **not** lat/lon. Geocoding turns each store's address into coordinates. This is a one-time backfill plus a rule that new stores get geocoded on ingest.

**Sequencing:** depends on the store data existing (Phase 2). Standalone from the other Phase 5 tasks but required by Task 025 (routing).

## What to build

1. **Geocode each store** — use **Nominatim** (OpenStreetMap, free, no API key) via the `maps` skill, or a thin HTTP call: query by address/city/zip, take the top result's `lat`/`lon`. Store into the existing `store.lat` / `store.lon` columns.
   - Handle Danish addresses: "Føtex, Nørregade 10, 5000 Odense C" → look up by zip+city+street.
   - **Rate-limit politely** — Nominatim has a 1 req/s rule and requires a valid User-Agent. Don't hammer it; batch slowly.

2. **Backfill task/script** — a one-off job (`src/server/geocode-stores.ts` or similar) that finds stores with `lat IS NULL`, geocodes them, and fills the columns. Idempotent (skip stores already geocoded).

3. **On-ingest rule** — new stores ingested in future get geocoded too (call the same function from the ingestion path). Don't let ungeocoded stores accumulate.

4. **Failure handling** — a store that can't be geocoded (address too vague, lookup fails) keeps `lat`/`lon` NULL and is flagged, not silently left broken or guessed. The travel-cost view (Task 028) must handle missing coordinates honestly (no distance = no fuel cost, not a crash).

## Important

- **Reuse the `maps` skill** if available — it wraps geocoding cleanly. Otherwise a thin Nominatim HTTP call is fine.
- **Rate limit + proper User-Agent** — Nominatim blocks abusive clients. Slow and honest.
- **Idempotent** — re-running the backfill must not duplicate or re-geocode already-done stores.
- **Danish addresses** — the lookup must handle "Odense C", zip formats, and store-brand names.
- **Don't build routing or fuel here** — that's Tasks 025/026. This is coordinates only.
- **Missing coordinates are honest** — a store without lat/lon is flagged and skipped, never faked.

## Acceptance criteria

- [ ] A script/task geocodes stores with NULL lat/lon from their address, using Nominatim (rate-limited, proper User-Agent)
- [ ] Danish store addresses geocode to correct-looking coordinates (spot-check several)
- [ ] Backfill is idempotent (re-run doesn't re-geocode or duplicate)
- [ ] New stores get geocoded on ingest (or the next backfill run picks them up)
- [ ] Ungeocodable stores stay NULL and are flagged, not guessed
- [ ] `vp check` + `vp test` pass
