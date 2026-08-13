# Task 016 — Refine OCR Recovery Classifier (Phase 3 GATE)

**Repo:** `~/price-watcher` (app code) — research reference in `~/grocery-price-watcher-research/research/ocr_receipts.py` + `research/notes/ocr-receipts.md` (Run 1 + Run 2)
**Plan source:** `docs/reference/build-plan.md` → Phase 3 verification gate

## Objective

Fix the `item_recovery` metric and separate the OCR failure modes. **This is a hard gate — the plan requires it before the OCR→parse pipeline (Task 011/012) is treated as reliable.**

## Why this gate exists

The Phase 0 spike's `item_recovery` metric is inconsistent with its own definition and collapses distinct failure modes into one percentage:

- It counts a **name-only** item (price=None) as "clean" (`qual >= 0.5 and clean_words(name)`, `ocr_receipts.py` line ~302) — but the report defines clean as **name AND price** both recovered.
- It collapses distinct failure modes into one number, which understates recoverable data and overstates genuine loss.
- **Run 2 (2026-08-13, 10 receipts) added a 4th mode — the top priority:** Netto's footer/boilerplate lines are counted as `kind=item`. This is a **parser classification bug, not an OCR bug** — Tesseract reads the footer perfectly (confirmed by Nick against the physical receipt).

## The four failure modes (classify separately, never blend)

| Mode | What's happening | Recoverable? |
|---|---|---|
| **clean** | name AND price both recovered | — |
| **garbled** | degraded photo (Lidl-type) — price genuinely unreadable | **No** — real loss |
| **wrapped** | SPAR-style long name, price on the next line (parser gap) | **Yes** — line-joining fix |
| **crumple** | price visible but receipt crumpled at that spot (REMA/SPAR-type) | **Yes** — crop-and-retry / ask user to flatten |
| **footer** | Netto boilerplate (URLs, legal/returns, hours, brand lines) counted as items | **N/A — must be filtered, not scored** |

## What to build (in priority order)

1. **`kind=footer` filter — TOP PRIORITY.** Detect and exclude non-product boilerplate lines BEFORE item scoring. Deterministic rules, not fuzzy OCR:
   - URLs / `WWW.*` / `www.*` (e.g. `KIG FORBI WWW.NETTO.DK`, `WWW.SUPPORT.NETTO.DK`)
   - brand-ownership / group lines (`Netto er en del af Salling Group`, `Salling Fondene...`)
   - legal / returns-policy text (`Varer kan returneres op til 14 dage efter køb`)
   - opening hours (`7-22 ALLE UGENS 7 DAGE`)
   - This is the single biggest accuracy lever on Netto receipts. It inflates `item_recovery` today because footer lines score as "clean names."
2. **Fix `item_recovery`** — count as clean ONLY items where name AND price are both recovered. A name-only item (price=None) is NOT clean. Footer lines are excluded entirely (never scored, never counted).
3. **Classify the modes separately** — report clean / garbled / wrapped / crumple / footer as distinct counts, not one blended percentage.
4. **Wrapped-line recovery** — SPAR-style long-name items: add a line-joining step so the price on the next line is recovered and the item classified clean (not wrapped-loss). Converts "lost" data into recovered data.
5. **Crumple handling** — when a fold/crease is suspected, support crop-and-retry of the folded region or flag for user re-photograph/flatten (do not silently report as clean).

## Important

- **Trigger / readiness: MET (2026-08-13).** ≥10 receipts with multiple samples per mode are gathered (10 receipts: REMA×3, SPAR×2, Netto×2, Lidl×1, crumpled SPAR×2). Mode coverage: wrapped (2 ✅), crumple (3 ✅), degraded-photo (2 🟡 thin), footer (2 ✅). Coop layout unrepresented — future want, not a gate blocker.
- The research repo's `ocr_receipts.py` is the reference implementation; this task is the **app-side TypeScript** version (or a direct fix to the research metric if OpenCode is working there — match whatever repo the task is running in).
- **Honest measurement** — the point is an accurate recovery rate, not an inflated one. If the corrected metric shows LOWER recovery than the old one (because footer lines are no longer counted as clean), that's correct and expected. `115152`'s honest product-recovery is near zero once footer is filtered — that is the truthful number.

## Acceptance criteria

- [ ] Footer/boilerplate lines (URLs, legal, returns-policy, hours, brand-ownership) are classified `kind=footer` and excluded from item counts
- [ ] `item_recovery` counts name+price-both as clean (name-only is NOT clean); footer is never scored
- [ ] clean / garbled / wrapped / crumple / footer are reported as separate counts
- [ ] SPAR wrapped-line items have a line-joining step; the price on the next line is recovered
- [ ] Crumple case has a crop-and-retry / re-photograph path (no silent clean)
- [ ] The verdict reflects the corrected, honest recovery rate (Netto lower than pre-filter, correctly)
- [ ] A test parses the 10 research-repo fixture receipts and reports per-receipt + per-mode results
- [ ] `vp check` + `vp test` pass
