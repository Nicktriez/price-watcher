# Task 016 — Refine OCR Recovery Classifier (Phase 3 GATE)

**Repo:** `~/price-watcher` (app code) — research reference in `~/grocery-price-watcher-research/research/ocr_receipts.py` + `research/notes/ocr-receipts.md`
**Plan source:** `docs/reference/build-plan.md` → Phase 3 verification gate

## Objective

Fix the `item_recovery` metric and separate the three OCR failure modes. **This is a hard gate — the plan requires it before the OCR→parse pipeline (Task 011/012) is treated as reliable.**

## Why this gate exists

The Phase 0 spike's `item_recovery` metric is inconsistent with its own definition:

- It counts a **name-only** item (price=None) as "clean" (`qual >= 0.5 and clean_words(name)`, `ocr_receipts.py` line ~302) — but the report defines clean as **name AND price** both recovered.
- It collapses three distinct failure modes into one percentage, which **understates SPAR and REMA** (recoverable data) and overstates the genuine loss on degraded photos.

The human-verified findings (in `research/notes/ocr-receipts.md`) separate them:

- **clean** = name AND price both recovered
- **garbled** = degraded photo, price genuinely unreadable (real loss)
- **wrapped** = SPAR-style long name, price on the next line (parser fix recovers it)

## What to build

1. **Fix `item_recovery`** — count as clean ONLY items where name AND price are both recovered. A name-only item (price=None) is NOT clean.
2. **Classify the three modes separately** — report clean / garbled / wrapped as distinct counts, not one blended percentage.
3. **Implement the wrapped-line recovery** — for SPAR-style receipts where a long name wraps and the price is on the next line, add a line-joining step so the price is recovered and the item classified clean (not wrapped-loss). This is the highest-value fix: it converts "lost" data into recovered data.

## Important

- **Trigger / readiness:** the plan says refine when **≥10 receipts with multiple samples per failure mode** are gathered (don't overfit on 6 / 1-per-mode). If fewer than 10 are available, build the classifier fix anyway (it's correct regardless) but note it's not yet tuned against a full variety set.
- The research repo's `ocr_receipts.py` is the reference implementation; this task is the **app-side TypeScript** version (or a direct fix to the research metric if OpenCode is working there — match whatever repo the task is running in).
- **Honest measurement** — the point is an accurate recovery rate, not an inflated one. If the corrected metric shows lower recovery than the old one, that's correct and expected.

## Acceptance criteria

- [ ] `item_recovery` counts name+price-both as clean (name-only is NOT clean)
- [ ] clean / garbled / wrapped are reported as separate counts
- [ ] SPAR wrapped-line items have a line-joining step; the price on the next line is recovered
- [ ] The verdict reflects the corrected, honest recovery rate
- [ ] `vp check` + `vp test` pass
