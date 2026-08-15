# Task 038l — Fix Multi-Product Split Over-Splitting (hyphen-continuation)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 4. Found **2026-08-15** (Ultron, reviewing 038j live backfill).

## Objective

Fix a false-positive in the multi-product offer splitter. Task 038j's `splitOfferHeading` wrongly splits Danish **hyphen-continuation** names — a single product described with an "or" modifier — into multiple phantom products.

## Root cause (verified 2026-08-15)

`src/lib/offer-split.ts` `splitOfferHeading` treats any `eller` (spaced) as an alternative list. But Danish hyphen-continuation like:

> "Softkerne-**eller græskarkerner**ugbrød" — rye bread with soft OR pumpkin kernels

is **ONE product** (one kind of bread), not an either/or deal you pick between. The splitter produced phantom products from this: live backfill created **4 "Softkerne" rows + 1 "græskarkernerugbrød"** — junk products that now pollute the catalog and will surface in the Task 038k offers search.

The 038j test suite _asserts_ this behavior is correct (test: `"Softkerne- eller græskarkernerugbrød"` → `["Softkerne", "græskarkernerugbrød"]`) — that test encodes the bug and must be changed.

## The distinguishing rule

A **hyphen-continuation** (single product) vs a **real alternative list** (multi-product deal):

- **Hyphen-continuation:** the token before " eller " ends with a hyphen (`-`) and continues a compound modifier onto the shared noun. E.g. `Softkerne- eller græskarkernerugbrød` = "soft-kernel or pumpkin-seed rye bread" — one bread.
- **Real alternative list:** comma-separated distinct products + " eller " with no hyphen-continuation. E.g. `Coca-Cola, Fanta eller Tuborg Squash 24-pak` — three products, each a standalone name.

## What to build

1. **Fix `splitOfferHeading`** in `src/lib/offer-split.ts`: when the token immediately before " eller " ends in `-` (hyphen) _and_ is followed by a compound that continues a single noun (no comma separator before it), do **NOT** split — return the heading unchanged as one product. Only split on genuine comma-separated alternative lists with a standalone " eller ".

2. **Rewrite the wrong test** in `src/lib/offer-split.test.ts`: `"Softkerne- eller græskarkernerugbrød"` must return `["Softkerne- eller græskarkernerugbrød"]` (one product, unchanged) — NOT split into two. Keep the genuine split tests (Coca-Cola/Fanta, Carlsberg/Tuborg, KAREN VOLF list).

3. **Add a guard against the hyphen case in the "Important" heuristic** — document the rule in the code comment (one product with an "or" modifier vs a pick-one deal).

## Cleanup of already-split junk

The live backfill already created phantom products (e.g. "Softkerne" ×4, "græskarkernerugbrød"). The fix must include a way to clean these: a **re-run of the orphan-cleanup** (which removes products with no references) — but note the phantom "Softkerne" products DO have offers (1 each from the split), so orphan-cleanup alone won't remove them. The cleanup needs to: (a) merge/repair the over-split products back to the correct single product, or (b) delete the phantom fragments and re-point their offers. Decide the cleanest repair (Nick/implementer confirms) — the goal is zero phantom "Softkerne"-style products in the catalog.

## Important

- **Do NOT break the genuine splits** — Coca-Cola/Fanta/multi-pack deals must still split. Only the hyphen-continuation case changes.
- The distinguishing test is: does " eller " separate **standalone product names** (split) or a **hyphen-connected compound modifier** (don't split)?
- This is a correctness fix to ingestion; idempotency and cross-chain matching must still hold.
- Plain, careful — a wrong heuristic here either fragments the catalog (current bug) or fails to split real deals (regression). Test both directions.

## Acceptance criteria

- [ ] `splitOfferHeading("Softkerne- eller græskarkernerugbrød")` returns ONE product (unchanged)
- [ ] `splitOfferHeading("Coca-Cola, Fanta eller Tuborg Squash 24-pak")` still returns 3 alternatives
- [ ] The wrong 038j test is corrected; genuine split tests still pass
- [ ] Live catalog repaired: no phantom "Softkerne"-style single-fragment products remain
- [ ] Idempotent re-run; cross-chain matching intact
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified live on `beta.skujeg.dk` (no phantom fragments; genuine splits intact)
