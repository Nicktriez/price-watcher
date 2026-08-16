# Task 038t — Show Product Size/Unit in "Tilføj et produkt" Selector + List Rows

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 4 (lists). Found **2026-08-15** (Nick): the same product can be selected multiple times in "Tilføj et produkt" because variants differ in size (e.g. "hamburgerryg" comes as 80–150 g slices, 0,5 kg cut, 1–1,3 kg roast), but **nothing shows the user the size** — so they pick blindly and the basket prices whatever variant they clicked.

## The problem

- The selector lists products by **name only** (+ brand). Six "hamburgerryg" products (80 g → 1,3 kg) are indistinguishable.
- A user adds "hamburgerryg" not knowing which size they chose; the compare then prices that specific variant (possibly the worst kr/kg deal).
- **Scope decision (Nick): this task is the quick display fix only** — show the size so the user sees what they're picking. The bigger "abstract list item + cheapest-per-unit" model is deliberately OUT of scope (separate, post-beta).

## What to build

1. **`searchProducts` must return size/unit.** `src/server/lists.ts` line ~229 currently selects only `["id", "name", "brand"]`. Add `unit`, `size`, `size_to`. (038m added these columns to `product` — they exist and are populated, e.g. `unit=kg, size=0.5` or `unit=g, size=80, size_to=150`.)

2. **Show the size in the selector.** `src/routes/lists/[id].tsx` (~line 202) renders `{p.name}` + brand. Append the size, e.g. "hamburgerryg **0,5 kg**" / "hamburgerryg **80–150 g**", so the six variants are visually distinct.

3. **Show the size in the list rows too.** `src/routes/lists/[id].tsx` (~line 277) renders the item's product name + the _user-set_ quantity/unit. When the item has no explicit quantity, show the product's own size so a user sees which variant is on the list. (Check whether the list-row query returns product unit/size; if not, include it.)

## Design points

- **Use the existing `fmtSize`/size formatting** (038m added it) for consistent Danish output ("0,5 kg", "80–150 g"). Don't re-invent formatting.
- **Range display:** when `size_to` exists, show "min–max" (038m already does this on the product page — mirror it).
- **Don't change how the basket prices.** This is purely informational — the compare still prices the specific linked variant. The cheapest-per-unit logic is a separate future task.
- Plain Danish; minimal diffs; no behavior change to add/edit/remove.

## Acceptance criteria

- [ ] The selector shows the size/unit for each result — "hamburgerryg 80–150 g" vs "hamburgerryg 0,5 kg" are visually distinct
- [ ] The list rows show the product's size when no explicit quantity is set
- [ ] Formatting is consistent with 038m's `fmtSize` (Danish decimal, range when `size_to`)
- [ ] Basket/compare behavior unchanged
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified live: searching "hamburgerryg" in "Tilføj et produkt" shows distinct sizes
