# Kurven (Grocery Price Watcher)

**Denmark's grocery price watcher.** Build a shopping list (or a recipe, or a cleaning cupboard), and see **which store is cheapest for your whole basket this week** — with user-reported receipt prices filling in what the flyers don't cover.

Working name: **Kurven** ("the basket"). Codebase + repo still `price-watcher`.

## What it does

- **Lists** — create shopping lists, recipes, or cleaning cupboards. Items are product-linked (so they can be priced) or free-text with a structured quantity.
- **Recipe import** — paste a recipe, map its ingredients to products, save as a list. (Manual mapping, not AI parsing.)
- **Templates** — 8 curated Danish templates (lasagne, frikadeller, taco-fredag…) — "Use template" clones one into your own list.
- **Store comparison** — the core: for any list, which store is cheapest this week, and by how much. Offer prices and user-reported prices are shown separately.
- **Receipt scanning** — photograph a supermarket receipt, OCR extracts the line items, and they become baseline prices _and_ your personal spending history.
- **Your spending** — monthly total by store, from your own receipts.
- **Gamification** — points + streaks for uploading receipts. Points once per physical receipt; a cleaner re-scan upgrades, never re-awards.
- **Price vs. average** — each scanned receipt line shows whether you paid above or below the going rate.

## Stack

SolidStart 2 · Solid 1.9 · TypeScript · TailwindCSS 4 · Kysely · PostgreSQL · Vite+ (`vp` toolchain) · Nitro · Tesseract (Danish OCR) · node-cron

## Project status

- **Phase 0–3 done** — data access spike, ingestion pipeline, and the full receipt pipeline (OCR → upload → baselines → spending → gamification → price-vs-average). 74+ tests passing.
- **Phase 4 in progress** — lists, recipe import, templates, basket math, store comparison are done; the weekly madplan is the remaining task.
- **Roadmap** — travel cost, crowd trust tiers, closed beta, design polish, launch. See `docs/reference/build-plan.md`.

## Setup

```bash
vp install           # install dependencies (pnpm-managed via Vite+)
# create .env by hand (it's gitignored — no .env.example committed):
#   DATABASE_URL=postgres://nicklas:YOUR_PASSWORD@localhost:5432/price_watcher
#   TJEK_BASE_URL=https://squid-api.tjek.com
pnpm db:migrate      # run migrations
vp dev               # start the dev server
```

See `docs/setup-dev.md` for the full walkthrough (Postgres install, DB user creation, `.env`), and `docs/bootstrap-new-machine.md` for a blank-machine setup. Commands: `vp dev` (dev server) · `vp check` (format/lint/type) · `vp test` (tests) · `vp build` (production build).

## Routes you should visit

Everything under `PREFIX` (default: `http://localhost:3000`).

| Route            | What it is                                                                           | Sign-in  |
| ---------------- | ------------------------------------------------------------------------------------ | -------- |
| `/`              | **Current offers** — offers index, filter by chain                                   | public   |
| `/products/[id]` | **Product page** — current offers + user-reported baseline prices, trust-tier badges | public   |
| `/stores/[id]`   | **Store page** — a store's current offers                                            | public   |
| `/about`         | About page                                                                           | public   |
| `/signin`        | **Magic-link sign-in** — request an email OTP code                                   | —        |
| `/upload`        | **Upload a receipt** — photograph → OCR → line items → baselines + points            | required |
| `/spending`      | **Your spending** — monthly total, by store, recent receipts                         | required |
| `/lists`         | **Your lists** + the templates to start from                                         | required |
| `/lists/import`  | **Recipe import** — paste a recipe, map ingredients, save as a list                  | required |
| `/lists/[id]`    | **List detail** — add/edit/remove/reorder items                                      | required |
| `/compare/[id]`  | **Store comparison** — cheapest store for this list + savings                        | required |
| `/receipts/[id]` | **Receipt detail** — line-by-line price vs. average                                  | required |

**The two to try first:** `/` (current offers) and, once signed in, `/lists` → pick a template → `/compare/[id]` to see the store ranking. `/upload` + `/spending` show the receipt/retention loop.

## Data & honesty

- **Offer prices** come from the Tjek.com read API (all Danish chains). **User-reported prices** come from real receipts and are labeled as such — never presented as official offers or "discounts."
- Feed data is internal-only; crowd/receipt data is the publishable layer. See the data & legal boundary in `docs/reference/build-plan.md`.

## Repo layout

```
src/routes/     SolidStart routes (offers, products, stores, lists, compare, receipts, upload, spending)
src/lib/        Pure logic: OCR classifier, receipt OCR, basket cost, recipe parsing, product matching, unit price, dedup, points
src/server/     Server handlers: auth, lists, receipt-upload, queries, ingestion scheduler
src/db/         Kysely schema + migrations
tasks/          Self-contained coding task files (implement these)
docs/           Setup, new-machine bootstrap, reference (build plan, chains)
```
