# Task 002 — Tjek API Client (typed)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → "What to code — Phase 1" + `src/lib/__fixtures__/rema1000.offers.json` (ground-truth payloads, local) + `docs/reference/chains.md`

## Objective

Create a typed fetch client for the Tjek.com read API. This is the single place all Tjek HTTP happens. No business logic here — just typed requests and typed responses.

## Endpoints to wrap

Base URL from env: `TJEK_BASE_URL` (default `https://squid-api.tjek.com`).

- `GET /v2/dealers?limit=100&offset={n}` → dealers (paginated)
- `GET /v2/catalogs?dealer_id={id}` → that dealer's catalogs
- `GET /v2/offers/search?query=*&catalog_id={id}&offset={n}&limit=100` → offers (paginated, max limit 100)
- `GET /v2/catalogs/{id}/download` → `{ "pdf_url": "..." }`

## Types (exact field paths from the real payload)

```ts
interface TjekOffer {
  id: string;
  heading: string;                       // product name
  description: string | null;
  catalog_page: number | null;
  pricing: { price: number; pre_price: number | null; currency: string };
  quantity: {
    unit: { symbol: string | null };     // g | kg | l | stk ...
    size: { from: number | null; to: number | null };
    pieces: { from: number | null; to: number | null; max: number | null };
  };
  images: { thumb: string | null; view: string | null; zoom: string | null };
  run_from: string; run_till: string; publish: string;  // ISO timestamps
  catalog_id: string; dealer_id: string;
}

interface TjekCatalog {
  id: string; label: string; page_count: number | null;
  offer_count: number; run_from: string|null; run_till: string|null; publish: string|null;
}

interface TjekDealer {
  id: string; name: string; website: string | null;
}
```

## Function signatures (suggested)

```ts
getDealers(): Promise<TjekDealer[]>
getCatalogs(dealerId: string): Promise<TjekCatalog[]>
getOffers(catalogId: string): Promise<TjekOffer[]>   // pages until <100 returned
getCatalogPdfUrl(catalogId: string): Promise<string | null>
```

## Important

- Set a browser-ish `User-Agent` header (research used `Mozilla/5.0 ... price-watcher-spike`).
- `getOffers` must loop `offset` by 100 until a page returns <100 items.
- Add a small delay between pages (research used ~150ms) to stay well under rate limits.
- No auth needed for these endpoints. Do NOT add the REMA `api_key` here (that's a Phase 2 concern for `get_offer_products`).

## Acceptance criteria

- [ ] All 4 endpoints wrapped as typed functions
- [ ] `getOffers` paginates correctly
- [ ] Types match the real payload field paths exactly
- [ ] A smoke call to `getCatalogs('11deC')` returns REMA's catalogs
