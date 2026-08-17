# Task 038w — Link Template Items to Actual Products (make templates priceable)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 4 (lists) + Phase 7c (beta). Found **2026-08-15** (Nick): templates are dead-ends — all 48 template items are `free_text` (`product_id = NULL`), so using a template creates a list that can't be priced on compare.

## The problem (verified 2026-08-15)

- The 8 templates (`Lasagne`, `Taco-fredag`, `Ugens grøntsager`, `Frikadeller + kartofler`, `Burger-fredag`, `Kødsovs`, `Cleaning cupboard`, `Student-budget`) have **48 items total, all `free_text` with `product_id = NULL`**.
- Free-text items can't be priced (the 038g limitation), so **every template list is unpriceable** — "Start fra en skabelon" is a dead end.
- The store data is **not** the blocker: ~4,190 offers, 2,958 priceable products. E.g. template items "Mælk" (10 matching priceable products), "Løg" (21), "Kartofler" (13), "Æg" (61), "Lasagneplader" (3) all have real products in the DB. ("Hakket svinekød" exists but as "Dansk hakket grisekød"/"Coop hakket gris" — wording differs.)
- **Root cause:** template items were seeded as raw names, never linked to products. The schema already supports it (`list_template_item.product_id` is a nullable FK, schema.ts ~line 206).

## Objective

Link each template item to a real, priceable `product` so that using a template produces a list whose items can be priced on compare. This is bounded and doable now — templates are a small, fixed set — and does NOT require the full free-text→product fuzzy layer (that's 038x/post-beta).

## What to build

1. **A name→product resolver for the template items** (`src/lib/` — reuse/extend `matchProductName` + `normalizeName` from `src/lib/product-matching.ts`). For each template item's `free_text`, resolve it to a real product:
   - Exact normalized match first (`normalizeName(free_text) === normalizeName(product.name)`)
   - Then fall back to a **substring/keyword match** for terms whose wording differs (e.g. "Hakket svinekød" → "Dansk hakket grisekød", "Coop hakket gris"). This is a _bounded_ fuzzy match, NOT the full free-text layer.
   - **Prefer a product that has a current priced offer** (a product with `offer.price` beats one with no offer) — a template item that resolves to a product with no offer is still unpriceable.
   - **When multiple products match** (e.g. "Løg" → 21 products), pick deterministically and honestly: prefer the cheapest-per-unit priced option, or the most specific name match. Record which was chosen.

2. **Backfill the template items** — set `product_id` on the existing 48 template rows. Idempotent (re-run skips already-linked). A `free_text` may stay as the display label; `product_id` is what makes it priceable.

3. **`useTemplate` already carries the link** — verified: `src/server/lists.ts` `useTemplate` already selects `product_id` (among `free_text`, `quantity`, `unit`) and copies it into the new list's `list_item` rows. **So the mechanism works** — the only reason template lists are unpriceable is that `product_id` is `NULL` on the template rows. Confirm this holds (don't assume), but the primary work is the resolver + backfill, not changing `useTemplate`.

## Important

- **This is the bounded version** — templates are a fixed set, so resolving 48 known names is tractable. Do NOT build the general free-text→product layer here (that's the post-beta 038x). If a template item genuinely can't be resolved, leave it `free_text` (honest "no price" on compare) rather than force a wrong link.
- **The link must survive `useTemplate` → `list_item`** — that's what actually makes templates work. Test this end-to-end.
- **Bounded resolution rules:** exact normalized match wins; then keyword/substring; prefer priced products; pick deterministically when several match. Document the chosen product for each template item (so a human can spot a wrong link).
- **Don't regress compare** — linked items must price correctly via the existing basket math (038n handles unit fallback once a product_id exists).
- No user-facing copy changes unless a resolved item's display needs disambiguation (keep the free_text as the label).

## Acceptance criteria

- [ ] Every resolvable template item has `product_id` set (backfilled, idempotent)
- [ ] `useTemplate` copies `product_id` into the new list's `list_item` rows (not just free_text)
- [ ] Using a template produces a list where linked items price on compare (verified end-to-end: a template list shows store prices)
- [ ] Unresolvable items stay `free_text` and show honestly as "no price"
- [ ] Deterministic, documented product choice when multiple match (e.g. "Løg")
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified on `beta.skujeg.dk`: "Brug skabelon" on e.g. Lasagne → the new list prices on compare
