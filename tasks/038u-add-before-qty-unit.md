# Task 038u — Fix "Tilføj et produkt": Don't Add Before the User Sets Antal/Enhed

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 4 (lists). Found **2026-08-15** (Nick): on `beta.skujeg.dk/lists/[id]`, clicking a product under "Tilføj et produkt" adds it **immediately**, before the user can input "Antal" and "Enhed".

## The problem

In `src/routes/lists/[id].tsx`:

- The `qty`/`unit` inputs (lines 194–207) sit **above the search results**, visually part of the search box, holding **shared global state**.
- Clicking a search result calls `addProduct(p.id)` (line 217), which **adds immediately** with `quantity: qty() ? Number(qty()) : null, unit: unit() || null` (lines 67–68).
- So the natural flow — _search → see product → want to set how much → add_ — is broken: the product is added the instant the user clicks, with empty qty/unit. The shared inputs only work if the user happens to fill them **before** clicking, which no one does (the mental model is "pick product, then set quantity").

## The fix

Move qty/unit into **each result row**, so the flow is **search → see product → set Antal/Enhed + click "Tilføj" on that row**. No shared global state, no premature add.

Concretely, in `src/routes/lists/[id].tsx`:

1. **Remove the shared qty/unit inputs** (lines 194–207) from above the results — they're the source of the confusion.
2. **Each result row** gets its own inline qty/unit inputs + a "Tilføj" button, e.g.:

   ```
   [product name] [size]
   [Antal] [Enhed]  [Tilføj]
   ```

   Clicking "Tilføj" on a row calls `addProduct(p.id)` with that row's qty/unit. Clicking elsewhere on the row does NOT add.

3. **`addProduct` stays the same** — it already accepts qty/unit; it just needs to receive per-row values instead of shared state.

## Design points

- **Per-row state:** each result row has its own local qty/unit (a `createSignal` per row, or lift into a map keyed by product id). Don't reuse the shared `qty`/`unit` signals.
- **"Tilføj" button is the only add action** — clicking the product name/size does nothing (or is not clickable). This removes the accidental-immediate-add entirely.
- **Enter to add:** pressing Enter in the row's qty or unit field should add that product (submit the row's form), matching user expectation.
- **Keep the product size label** (from 038t) — still show name + brand + size, then the qty/unit/Tilføj controls below.
- Plain Danish ("Tilføj", "Antal", "Enhed" — already the labels used). Minimal diffs.
- Mobile: the row controls must stack cleanly at narrow widths (the site is mobile-first).

## Acceptance criteria

- [ ] Clicking a product name does NOT add it (no accidental immediate add)
- [ ] A "Tilføj" button per result adds that product with the row's own Antal/Enhed
- [ ] Empty qty/unit on "Tilføj" adds the product with null qty/unit (same as today's default)
- [ ] Enter in the row's qty/unit field adds that product
- [ ] Product size label (038t) still visible in each row
- [ ] Works on mobile (rows stack cleanly)
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified live: on `beta.skujeg.dk/lists/[id]`, a user can set Antal/Enhed before the product is added
