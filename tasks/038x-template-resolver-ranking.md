# Task 038x — Template Resolver: Fix Wrong-Link Ranking (Kaffe → protein-drink)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 4 (lists). Found **2026-08-15** (Ultron, verifying 038w): the template resolver links some items to the **wrong product** because it ranks by raw unit price across incompatible products.

## The bug (verified)

`src/lib/template-products.ts` `resolveTemplateProduct` ranks keyword-match candidates by `unitPrice` (cheapest first). But unit price is only comparable **within the same product class**. When a generic term matches unrelated products, cheapest-per-kg picks nonsense:

- **"Kaffe"** resolves to **"Starbucks protein-drik med kaffe"** (unit_price 45.45) instead of "Merrild kaffe" / "Peter Larsen Kaffe" (unit_price ~105). A protein drink "wins" because its per-kg price is lower — but it's not coffee.
- Same risk for "Løg" → "Coop løg fra Månsson" (a specific branded product), "Mælk" → a specific organic brand, etc. Ranking by unit_price alone can't distinguish "the real product" from "a cheaper unrelated product that contains the keyword."

**This produces user-visible wrong links** ("why is my coffee a Starbucks protein drink?") on template lists.

## The fix

The resolver needs a better notion of "is this actually the product the term means," not just "cheapest thing containing the keyword." Options (implementer picks the clean combination):

1. **Title-case / whole-name affinity:** a candidate whose _whole_ name matches the term (or whose name is the term plus a small suffix like "økologisk") should rank far above a candidate where the term is a small part of a long brand name. E.g. "Kaffe" → "Peter Larsen Kaffe" beats "Starbucks protein-drik med kaffe" because "kaffe" is the whole/dominant token, not a trailing qualifier.
2. **Class compatibility guard:** don't rank across products that are clearly different classes. E.g. if the term is a food/drink noun, a candidate whose name contains a different leading noun ("protein-drik", "maskine", "kværn", "drik") shouldn't win. A blacklist of disqualifying tokens for common terms, or a token-position heuristic.
3. **Safer ranking within the top tier:** prefer `exact` and short-name keyword matches, and only use unit_price as a tiebreak **within** the same product class, never across classes.

**Add tests for the exact traps:** "Kaffe" must NOT resolve to "Starbucks protein-drik med kaffe"; "Løg" should prefer a plain onion over a branded one when one exists; "Mælk" prefers actual milk over a milk-drink.

## Important

- **A wrong link is worse than no link** (it misleads the user). Where the resolver is genuinely unsure, prefer staying `free_text` (honest "no price") over a wrong product.
- **Don't overfit** — keep the resolver bounded (038w's scope: the 48 fixed template items). This is a refinement, not the general free-text layer.
- **Re-run the 038w backfill** after the fix so the live template links update; verify the previously-wrong items (Kaffe, Løg, Mælk) now link to sensible products.
- No user-facing copy changes.

## Acceptance criteria

- [ ] "Kaffe" resolves to an actual coffee product (not a protein/milk drink, not a machine)
- [ ] "Løg"/"Mælk" prefer plain products over branded-but-cheaper-unrelated ones where a plain match exists
- [ ] Unit-price ranking is only used within the same product class, never across classes
- [ ] A genuinely-ambiguous item stays `free_text` rather than linking wrong
- [ ] New tests cover the Kaffe/Løg/Mælk traps
- [ ] 038w backfill re-run; the previously-wrong links are corrected live
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified on `beta.skujeg.dk` (template lists link to sensible products)
