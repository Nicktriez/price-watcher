# Task 004 — Basic UI: Offers Index + Product + Store Pages

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → "What to code — Phase 1" (UI section)

## Objective

Three server-rendered routes showing the ingested data. Minimal, real, Tailwind-styled. No client state — server-rendered with SolidStart `createAsync` + Kysely queries.

## Routes to create

- `src/routes/index.tsx` — offers index. List current offers with a `<select>` chain filter (populate from `chain` table). Each entry: name + price + image thumb.
- `src/routes/products/[id].tsx` — product page. The offer's fields + a tiny 30-day price history line from `price_point` (once data exists — render nothing/placeholder if empty).
- `src/routes/stores/[id].tsx` — store page. That store's current offers.

## Requirements

- **Server-rendered only.** Use SolidStart `createAsync` + Kysely queries. No client-side state management.
- **Filter only** — the chain `<select>` filters the offers list. No search, no pagination UI yet.
- Tailwind for all styling (the project uses Tailwind 4).
- "Current" offers = those where `valid_to >= now()` (the Tjek weekly window). Don't show expired offers on the index.
- Show the chain name on each offer (join to `chain`).

## Data notes

- Offers join to `product` for the name and `chain` for the chain name.
- Use `internal=false`-agnostic queries here — for Phase 1, all offers are feed (`internal=true`) and that's fine; the UI just shows current offers. (The `internal` flag matters for _publishing_ decisions later, not for showing offers in Phase 1.)
- Image: use `offer.image_url` (the Tjek `images.view` URL).

## Acceptance criteria

- [ ] Home lists current offers, filterable by chain
- [ ] Product page shows an offer's fields + (if present) a price-history line
- [ ] Store page shows that store's current offers
- [ ] Expired offers are excluded from the index
- [ ] All three render server-side (no client state)
