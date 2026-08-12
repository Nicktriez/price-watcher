# Task 001 — Kysely Database Schema + Initial Migration

**Repo:** `~/price-watcher` (the SolidStart project, NOT the research repo)
**Plan source:** `docs/build-plan.md` → "What to code — Phase 1" (canonical copy in `/root/grocery-price-watcher-research`)

## Objective

Create the Kysely `Database` interface and the initial migration that establishes all core tables. This is the foundation everything else builds on — get the schema right and the rest of Phase 1 slots in.

## Steps

1. Install the DB deps (this task's one install): `pnpm add kysely pg` and `pnpm add -D @types/pg`. (`pg` is the Postgres driver Kysely needs.)
2. Create `src/db/schema.ts` — the Kysely `Database` interface with a row type per table.
3. Create `src/db/migrations/0001_init.ts` — a Kysely migration creating these tables:
   - `chain`, `store`, `product`, `offer`, `price_point`, `list`, `list_item`
4. Create `src/db/client.ts` — a single exported `Kysely<Database>` instance reading `DATABASE_URL`.
5. Create a migration runner (e.g. `src/db/migrate.ts`) that calls `migrateToLatest()` and a `package.json` script `"db:migrate": "node src/db/migrate.ts"` — Kysely does NOT auto-run migrations; a runner script is required for the acceptance check to be executable.

## Table schema (exact — copy these columns)

```ts
// chain
id: string (PK, slug e.g. "rema1000"); name: string; tjek_dealer_id: string; website: string|null; logo_url: string|null

// store
id: string (PK, uuid); chain_id: FK chain.id; name: string; address: string|null; city: string|null; zip: string|null; lat: number|null; lon: number|null

// product
id: string (PK, uuid); name: string; brand: string|null; ean: string|null; unit: string|null; size_grams: number|null

// offer
id: string (PK, uuid); product_id: FK product.id; store_id: FK store.id (nullable)
catalog_id: string; dealer_id: string; heading: string; description: string|null; catalog_page: number|null
price: numeric; pre_price: numeric|null; currency: string
unit: string|null; size_from: number|null; size_to: number|null; pieces_from: number|null; pieces_max: number|null
image_url: string|null
valid_from: timestamptz; valid_to: timestamptz; published_at: timestamptz|null
source: string ('tjek'|'crowd'|'receipt'); trust_tier: string ('official'|'community'|'single')
internal: boolean  // true = feed row (NOT publishable); false = crowd/receipt
raw_json: jsonb
created_at: timestamptz; updated_at: timestamptz

// price_point
id: string (PK); offer_id: FK offer.id; product_id: FK product.id; store_id: FK store.id
price: numeric; currency: string; observed_at: timestamptz  // dedupe on (offer_id, price, observed_at)

// list
id: string (PK); user_id: string|null (nullable until auth); name: string; kind: string ('recipe'|'cleaning'|'custom'); template_id: string|null

// list_item
id: string (PK); list_id: FK list.id; product_id: FK product.id (nullable); free_text: string|null; quantity: number|null; unit: string|null
```

## Important

- The `internal` flag on `offer` is the **legal-boundary flag** — feed rows (source='tjek') are `internal=true` and never publishable. Do not omit it.
- `list`/`list_item` are created now for schema stability but **not used in Phase 1** — just create the tables.
- `price_point` is where history accumulates from day one.

## Acceptance criteria

- [ ] `src/db/schema.ts` defines a `Database` interface covering every table above
- [ ] `0001_init.ts` migration creates all 7 tables with the exact columns
- [ ] `src/db/client.ts` exports a `Kysely<Database>` from `DATABASE_URL`
- [ ] `pnpm db:migrate` runs against a local Postgres without error (creates all tables)
- [ ] Re-running `pnpm db:migrate` is a no-op (Kysely tracks applied migrations)
