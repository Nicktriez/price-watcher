# Task 007 — Unit-Price Normalization

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 2 (Task 4) + `src/lib/__fixtures__/rema1000.offers.json` (real `quantity` shapes)

## Objective

Make prices comparable across different package sizes. **The basket math (Phase 4) dies without this** — REMA sells 250g, Bilka sells 500g, so "12 kr" isn't comparable until both are expressed as price-per-kg or price-per-liter. This task normalizes every offer into a unit price.

## The data you're normalizing

Each offer has a `quantity` block (raw Tjek fields already mapped into `offer`):

- `unit` — `g`, `kg`, `l`, `stk` (the `quantity.unit.symbol`)
- `size_from` / `size_to` — the size in the unit's base measure (e.g. grams)
- `pieces_from` / `pieces_max` — piece counts

From the REMA fixture, `quantity` looks like:

```json
"quantity": { "unit": { "symbol": "g" }, "size": { "from": 470, "to": 1080 }, "pieces": { "from": 1, "to": 1, "max": 6 } }
```

## What to build

1. **A `unit_price` + `unit_price_unit` on the `offer` table** (migration). E.g. `unit_price = 25.53`, `unit_price_unit = 'kr/kg'`.
2. **A normalization function** `computeUnitPrice(offer)`:
   - `g` → convert to kg (size_from / 1000) → price per kg
   - `kg` → price per kg directly
   - `l` → price per liter
   - `stk` / pieces → price per piece
   - Handle the `size` range: use **`size_from`** (the base size) as the divisor — it's the reliable lower bound.
   - **No unit / no size → `null` unit_price** (can't compute; don't guess).
3. **Wire it into ingestion** — `ingestChain()` computes and stores `unit_price` for every offer it writes.

## Important

- Store the **computed** `unit_price` (a number) and its unit separately from the raw `price`. `price` stays the shelf price; `unit_price` is the comparable one.
- Don't round to a pretty number — keep precision; rounding happens at display.
- **Null-safe:** offers without usable size/unit get `unit_price = null`, never a wrong number.

## Acceptance criteria

- [ ] `offer` has `unit_price` + `unit_price_unit` columns (migration)
- [ ] `computeUnitPrice` converts g→kg, kg, l, and stk correctly (test against the REMA fixture)
- [ ] A 250g and a 500g version of the same product produce comparable `kr/kg` values
- [ ] No-unit / no-size offers → `unit_price = null` (no crash, no guess)
- [ ] Ingestion stores `unit_price` for every offer

## Testing approach

- `computeUnitPrice(offer)` is a **pure function** — feed it offers from the REMA/Netto fixtures, assert the resulting `kr/kg`/`kr/l`/`kr/stk`. No DB, no network. This is the unit-tested core.
- The "ingestion stores `unit_price`" part is verified by the integration check (run ingest, then a quick `psql` query confirming `unit_price` is populated), NOT a unit test against a DB.
- The migration that adds the columns is verified by running `pnpm db:migrate`.
