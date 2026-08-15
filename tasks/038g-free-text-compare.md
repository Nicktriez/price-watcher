# Task 038g — Compare Page: Don't Silently Drop Free-Text List Items

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7b/c (beta usability). Found **2026-08-15** (Nick): items added to a list via "Eller tilføj fritekst" do not appear on the compare page at all.

## Objective

Fix the compare page silently dropping free-text list items. When a user adds items via "Eller tilføj fritekst" on the list detail page, those items have `product_id = NULL`. The compare verdict query excludes them entirely, so the compare page shows no result and no explanation — a cold user (Phase 7c Task 0) reads it as "the site is broken." This task makes free-text items **visible and honestly labeled as unpriced** on the compare page, so the user understands _why_ there's no comparison. **Scope: layer 1 only** (decided 2026-08-15). Free-text→product name-matching so they can actually price is a separate, later feature — NOT this task.

## Root cause (verified 2026-08-15)

`src/server/lists.ts` → `getBasketCosts` (line 336):

```ts
const rows = await db
  .selectFrom("list_item")
  .select(["product_id", "quantity", "unit"])
  .where("list_id", "=", listId)
  .where("product_id", "is not", null) // ← drops every free-text item
  .execute();
```

Free-text items (`product_id = NULL`) are filtered out before pricing. They never reach `computeBasketCosts`, so the compare verdict (`getStoreVerdicts` → `getBasketCosts`) never sees them. Note: even if the filter were removed, `priceItem()` in `src/lib/basket-cost.ts` prices only by `productId`, so free-text items would be "no-price" — they cannot currently be priced. That's expected; this task is about _showing them_, not pricing them.

## What to build

1. **Stop dropping free-text items in `getBasketCosts`.** Remove the `product_id IS NOT NULL` filter (or restructure) so free-text items flow into the basket computation alongside product-linked ones. They will price as `source: "no-price"` (that's correct — they have no productId).

2. **Surface unpriced free-text items on the compare page honestly.** The compare page (`src/routes/compare/[id].tsx`) already has a `noPriceEverywhere` counter and a note ("{n} var{i} i din kurv kunne ikke prissættes…"). Ensure that:
   - Free-text items count toward that unpriced count (so the user sees "2 varer i din kurv kunne ikke prissættes").
   - If ALL items in the list are free-text/unpriced, the page shows a **clear, plain-Danish message** explaining that the list items can't be compared yet because they were added as free text and have no price — with a pointer to the list page (add the same items as real products, or a template) rather than the current generic "Ingen butikker har priser på disse varer endnu" which is misleading (prices may exist; the items just have no product link).
   - If SOME items price and some are free-text/unpriced, the existing partial-coverage behavior works but the unpriced note should make clear which items are free-text (e.g. the `noPriceEverywhere` note covers it; verify the wording isn't misleading).

3. **Trace `getList` items too** — the compare page renders `d().list.items.length` for the empty state. Confirm free-text items show up in the compare's own empty-state logic correctly (they're included in `getList` already, so verify the empty-state message is accurate when the list has only free-text items).

## Important

- **Do NOT add free-text→product matching.** That's a separate feature (analogous to `030b` free-text grouping for crowd reports). This task only makes free-text items visible + honestly unpriced. Resist the scope creep.
- **Do NOT change `priceItem()`/`computeBasketCosts`** to invent prices for free-text items. They are genuinely unpriced; the fix is honest labeling, not fake numbers.
- **Plain Danish**, honest copy — the note must explain the real reason (free-text = no product link = no price), not a generic "no prices."
- **Keep the compare table working** — don't break product-linked pricing or the store ranking. Free-text items are unpriced; they just add to the unpriced count, they don't break the ranking.
- Preserve the existing `noPriceEverywhere` count semantics (it's used to show how many items couldn't be priced); this task makes free-text items count toward it.

## Acceptance criteria

- [ ] Free-text list items are no longer filtered out of `getBasketCosts` — they reach the basket computation as `no-price`
- [ ] Adding 2 free-text items to a list → compare page shows them counted as unpriced (e.g. "2 varer … kunne ikke prissættes")
- [ ] A list containing ONLY free-text items shows a clear Danish message explaining they can't be compared yet (free text = no product link) + a pointer to fix it — not the generic "no stores have prices"
- [ ] A mixed list (some product-linked, some free-text) still ranks stores correctly, with the unpriced count reflecting the free-text items
- [ ] `priceItem`/`computeBasketCosts` unchanged (no invented prices, no matching feature)
- [ ] Plain Danish, honest copy
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified live on `beta.skujeg.dk` (free-text items visible/counted on compare)
