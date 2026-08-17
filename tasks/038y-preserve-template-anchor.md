# Task 038y — Template Backfill: Preserve free_text Anchor (don't destroy the link source)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 4 (lists). Found **2026-08-15** (Ultron, verifying 038x): the 038w template backfill set `free_text = NULL` on every linked item, **destroying the original term that the resolver anchors on** — so a wrong/frozen link can't be re-resolved later.

## The bug (verified)

`src/server/backfill-template-products.ts` (line ~137) links a template item with:

```ts
.set({ product_id: chosen.id, free_text: null })
```

This destroys the original `free_text` term (e.g. "Kaffe"). Consequence (observed live):

- 038w linked "Kaffe" → "Starbucks protein-drik med kaffe" (wrong, fixed by 038x's affinity ranking).
- **All 43 linked template items now have `free_text = NULL`.** The backfill re-run anchors on the item's _current product name_ (which always matches itself exactly), so it can't recover the original term — the links are effectively **frozen** to whatever they currently point at, and a future resolver/offer change can't re-anchor them.
- The Kaffe item only got fixed because Ultron manually restored `free_text='Kaffe'` before re-running.

## The fix

**The template item must keep its original `free_text` as the anchor** — `product_id` is the resolution, `free_text` is the human term (and, per 038w, useful as a display label). So:

1. **Don't null `free_text` on link.** Change the backfill to set `product_id` and leave `free_text` as the original term (it already is, or is re-anchored from the product name only when the item never had a real free_text).
2. **Restore the destroyed anchors on the box:** for the 43 linked items with `free_text = NULL`, recover the original term. This is the hard part — the term is gone. Options:
   - **Best:** if any template list was ever created from these templates, `list_item.free_text` for items that were free_text may still hold the original term → recover from there.
   - **Else:** re-derive a reasonable anchor from the product name (strip brand/size) — imperfect but better than NULL.
   - **Else:** a curated map (template_id + position → original term) for the 48 fixed items, since it's a fixed set.
3. **Verify the display still works** — the lists-page rows render `productName ?? freeText`; once `product_id` is set the product name shows, so keeping free_text doesn't hurt display, it just preserves the anchor.

## Important

- **The anchor must outlive the link.** A template item's `free_text` is the _source of truth_ for "what the user meant"; `product_id` is the _current resolution_. Don't conflate them.
- **This is a data-integrity fix** — without it, template links are frozen and any future resolver improvement can't be applied to existing templates.
- **Re-run the backfill** after the fix and verify the Kaffe→protein-drink case stays correct AND all anchors are preserved.
- Keep the 038x affinity ranking (that fix is correct and stays).
- No user-facing copy changes.

## Acceptance criteria

- [ ] `backfill-template-products.ts` no longer nulls `free_text` on link (it preserves the original term)
- [ ] The 43 linked template items on the box have their `free_text` anchor restored (recoverable, not NULL)
- [ ] Re-running the backfill re-anchors on the original term (Kaffe stays → real coffee, not frozen)
- [ ] Display unchanged (product name still shows on lists once linked)
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified on `beta.skujeg.dk`
