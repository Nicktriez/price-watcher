# Task 038k — Add Product Search to the Offers Page

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 4 (core product). Found **2026-08-15** (Nick): the offers page can't be searched by product name.

## Objective

Add a **text search** to the offers page (`/offers`), so a user can search current offers by product name (e.g. "coca", "mælk", "kartofler"). Currently `/offers` only has a chain filter + pagination — there's no way to find a specific product in the offer catalog. This is a core-usability feature for the beta (Phase 7c Task 0: a user should be able to find a product they're shopping for).

## Context

- `/offers` (src/routes/offers.tsx) currently: chain `<select>` filter + `?page=` pagination, driven by `getCurrentOffersPage(chain, page)` in `src/server/queries.ts` (PAGE_SIZE 100).
- The codebase already has `searchProducts(query)` in `src/server/lists.ts` (name `ILIKE %query%`, limit 10) — used in add-item, report, and recipe-import flows. This task is **different**: it searches _current offers_ (with prices/chain), not the product catalog, and returns paginated results on the offers page.
- Search must compose with the existing chain filter (search within a chain if one is selected).

## What to build

1. **Add a search input to the offers page** — a text field (`?q=`) beside the existing chain `<select>`. Plain Danish placeholder (e.g. "Søg på varenavn…"). It should work with the existing GET form + query params (consistent with how `chain` works today), so search results are URL-addressable (`/offers?q=coca&chain=netto`).

2. **Extend the server query** — add a `query` param to `getCurrentOffersPage` (or a new query function) that filters offers by product name `ILIKE %q%` when `q` is set, in addition to the existing chain filter. Match on the offer heading / product name. Keep pagination working with the search (search across all pages, not just page 1).

3. **Compose with chain filter** — if both `q` and `chain` are set, apply both. Empty `q` = no search filter (current behavior). Empty results show the existing "Ingen aktuelle tilbud." empty state (or a clearer "Ingen tilbud matcher din søgning." if a query is active — Nick confirms wording).

4. **Clear the search** — a way to reset (empty field + submit, or a "Ryd" link) so the user isn't stuck in a narrow search.

## Important

- **This searches offers (with prices), NOT the product catalog** — it's the `/offers` browsing experience, not `searchProducts`. Do not reuse `searchProducts` (that's for list-add/report where you pick a product to link). Don't conflate them.
- **Keep it server-side + URL-addressable**, like the existing chain filter — no client-side-only filtering of the current page (that would break pagination). The search should filter at the query level.
- **This relates to 038j** (multi-product offer splitting): once 038j lands, a search for "coca" should return the split individual products (Coca-Cola, Coca-Cola Zero, Fanta separately). If 038j isn't done yet, the search still works on the current headings — just note the interaction so they compose.
- **Plain Danish**, honest copy, no English leakage.
- **Mobile-friendly** (the search field should not overflow — consistent with 038d: stack on mobile if needed).
- Basic usability, not design-system polish.

## Acceptance criteria

- [ ] `/offers` has a search input that filters current offers by product name (`?q=`)
- [ ] Search composes with the chain filter (both applied when both set)
- [ ] Search is server-side + URL-addressable; pagination works within search results
- [ ] Empty search = current behavior (all offers); active search with no matches shows a clear message
- [ ] Clear/reset affordance works
- [ ] Plain Danish, no English leakage; mobile-friendly
- [ ] Composes correctly with 038j once landed (search returns split individual products)
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified live on `beta.skujeg.dk`
