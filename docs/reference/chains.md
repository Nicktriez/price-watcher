# Chain technical notes (URL structure · anti-bot · format · cadence)

Field-tested 2026-08-11. All chains except Lidl's own viewer publish through
Tjek.com (`squid-api.tjek.com`), which is treated as the primary surface.

---

## Salling Group — Netto · Bilka · Føtex

**Shared infra, two sub-platforms:**

- **Netto** — Next.js (App Router) + Tjek Incito. Avis = page images on
  `image-transformer-api.tjek.com` (signed `s=…` URLs), metadata embedded in RSC flight data.
- **Bilka / Føtex** — Nuxt SSR + **SAP Commerce** + Magnolia CMS. Avis = Magnolia image
  banners; tilbud category pages are client-rendered. Their own commerce API
  (`api.sallinggroup.com/v1/ecommerce/{site}`) requires a bearer token found in the frontend
  JS bundle and only answers registered routes → **not a public surface**.

### Netto

- Avis: `https://netto.dk/netto-avisen/` · sitemap `netto.dk/sitemap.xml` (open)
- Dealer `9ba51`. Week 33 = 219 + 57 offers. PDF via Tjek `/v2/catalogs/{id}/download`.
- Cadence: weekly, publish Thu 05:00 UTC. Format: JSON (primary), PDF/images (fallback).

### Bilka / Føtex

- Bilka: `bilka.dk/tilbudsavis`, PLPs `bilka.dk/tilbud/{cat}/pl/{slug}/`
- Føtex: `foetex.dk/tilbudsavis` (note: **foetex**, not fotex), PLPs same pattern
- Sitemaps: `bilka.dk/sitemap/sitemap-index.xml`, `foetex.dk/sitemap/sitemap-index.xml`
- Dealers: Bilka `93f13`, Føtex `bdf5A`. Week 33 = Bilka 218+373, Føtex 422.
- Cadence: weekly, publish Thu 08:00 UTC. Føtex can run 2-week aviser ("uge 32/33").
- Format: JSON (Tjek), PDF (Tjek), image banners on own site (avoid).

---

## Coop — Kvickly · SuperBrugsen · 365discount (+ Brugsen)

All Coop banners use a shared `catalog.js` viewer on their own domains over Tjek images,
and are fully present on Tjek with per-banner dealer ids.

| Chain        | Dealer id | Avis URL                        | Week-33 offers           |
| ------------ | --------- | ------------------------------- | ------------------------ |
| Kvickly      | `c1edq`   | kvickly.dk/tilbudsavis          | 227 (62 p.)              |
| SuperBrugsen | `0b1e8`   | superbrugsen.dk/tilbudsavis     | 151 (46 p.)              |
| 365discount  | `DWZE1w`  | 365discount.coop.dk/tilbudsavis | 150+168 (two live weeks) |
| Brugsen      | `d311fg`  | (via coop.dk)                   | 71 (sporadic)            |

- Coop hub: `coop.dk/tilbudsavis` (aggregates all banners).
- Cadence: **Thu–Thu** for Kvickly/SuperBrugsen; **Wed–Wed** for 365 (offset week). SuperBrugsen
  offers a `pdf/?cid=…` per-catalog PDF. Coop Plus member prices are not in the feed.
- Format: JSON (Tjek), PDF/image on own site (avoid).

---

## REMA 1000

- Avis: `rema1000.dk/avis` — Nuxt + Tjek Incito; **embeds `tjek.api_key`, `business_id:11deC`,
  `core_url:squid-api.tjek.com`** in the page config (this key works for the
  `get_offer_products` RPC).
- `robots.txt` disallows `/api/*`, `/konto/*`; its private `/api/*` routes 404 — not usable.
- Week 33 = 111 offers, **100% coverage**. Cadence: weekly, publish Fri 08:00 UTC.
- Format: JSON (Tjek) + RPC product mapping (article no. `external_id`, sometimes GTIN).

---

## Lidl

- Own viewer: `lidl.dk/tilbudsavis` → pages are **PNGs on Schwarz Group's
  `imgproxy.leaflets.schwarz`** (signed proxy, base64 S3 path `s3://leaflets/images/{uuid}/page-NN.png`).
  Image-only; no on-page JSON. **Avoid** — use Tjek.
- Tjek dealer `71c90`: Tilbudsavis uge 33 (212) + Weekendavis (210) + "fast-lav-pris" LPs.
- Cadence: weekly avis Thu/Fri + **weekend avis** Fri–Sun + long-running LPs. Poll all three.
- Format: JSON (Tjek), PNGs (Schwarz, fallback).

---

## Secondary/incidental

- SPAR `88ddE` (Uge 33, 108), MENY `267e1m` (Uge 33, 156), Min Købmand `603dfL` (60),
  nemlig `7Rwpw5` (0 — nemlig is online-only, no avis feed).
- VIN&CO (Coop wine) catalogs exist under `eQeo00` but parse 0 offers.
- All above are reachable with the same collector (`tjek_collector.py`).

---

## Cross-cutting facts

- **Format:** JSON everywhere (primary); PDF per catalog (ground truth); images only where
  noted. No HTML scraping or OCR required for offer data.
- **Anti-bot:** none observed on `squid-api.tjek.com` (no auth, no rate limit; 20× parallel
  OK). Chain websites are standard SSR/SPA. Only Salling's own commerce gateway and Lidl's
  leaflets proxy are gated/signed.
- **Cadence:** weekly; run windows start Thu/Fri (mostly), 365 Wed; published 05:00–08:00 UTC.
  Offers API serves only the current window — **capture weekly**; there is no history endpoint.
