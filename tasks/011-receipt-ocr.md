# Task 011 — Receipt OCR + Line-Item Parser (app-side)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 3 (Task 1, Task 2) + the research spike in the research repo `research/ocr_receipts.py` + `research/notes/ocr-receipts.md`

## Objective

Build the receipt OCR + parse logic into the app. This is the engine that turns a receipt image into structured `receipt` + `receipt_item` rows (Task 010's schema). It runs AFTER a user uploads an image (the upload flow is Task 012) — this task is the OCR/parse logic itself.

## The research you're porting

The Phase 0 spike (in `grocery-price-watcher-research`) already proved Tesseract works and produced a working reference implementation:

- `research/ocr_receipts.py` — grayscale + 4×90° rotation, `-l dan` under `--psm 3` and `--psm 6`, best orientation auto-picked, per-field merge with confidence downgrade on variant disagreement.
- `research/notes/ocr-receipts.md` — the human-verified findings, especially the **three failure modes**:
  - **clean** = name AND price both recovered
  - **garbled** = degraded photo (price genuinely unreadable) — real loss
  - **wrapped** = SPAR-style long name, price on the next line — a **line-joining parser fix** recovers it

**Read both files first.** Port the working logic; don't reinvent it.

## What to build

1. **A TypeScript OCR module** (e.g. `src/lib/receipt-ocr.ts`): takes an image path → runs Tesseract (via `node-tesseract-ocr` or by shelling to `tesseract` CLI) with `-l dan` → returns per-field results:
   - store (from receipt content, never filename)
   - date
   - line items (name + price, or flagged)
   - total
   - per-field confidence (high/medium/low)

2. **Line-item parsing with the four-way status** (per the spike, incl. Run 2):
   - `clean` — name AND price both recovered
   - `garbled` — degraded, price unreadable (real loss, flagged honestly)
   - `wrapped` — SPAR-style: name wraps, price on the next line → **implement line-joining** to recover the price
   - `footer` — Netto-style boilerplate (URLs, legal/returns, hours, brand lines) → **filter out, never count as an item** (see Task 016 — this is the top-priority classifier fix)
   - This maps to the `receipt_item.status` column from Task 010.

3. **Confidence logic** — the spike found cross-variant disagreement is a reliable low-confidence signal. Run ≥2 PSM modes / rotations and downgrade confidence when variants disagree on a value.

4. **Store extraction from content** — the spike proved store is always recoverable from the receipt header/footer (including the tricky Lidl case where the store is in a marketing footer, and the "og spar" verb must not be misread as the SPAR chain). Port that logic.

## Important

- **Run the two PSM modes + rotations** and merge per field — the spike showed `--psm 6` is essential for dense REMA rows, `--psm 3` for sparse SPAR/Lidl. Don't use a single mode.
- **Store from content, never filename.** This is a hard rule from the corrected framing.
- **Nothing fabricated.** A garbled line stays garbled (`status='garbled'`), never guessed. This is a recovery-measurement engine, not a hallucinator.
- **This is app code** in `~/price-watcher`, but you can reference the research repo's implementation for the port. Do not copy the whole Python script — port the _logic_ to TypeScript, adapted for the app.
- Tesseract must be installed (the research repo spike installed it on the research machine; the app machine needs it too — the upload task's setup may handle this).

## Acceptance criteria

- [ ] `src/lib/receipt-ocr.ts` (or similar) runs Tesseract with `-l dan`, both PSM modes, multiple rotations
- [ ] Returns store, date, line items, total with per-field confidence
- [ ] Line items classified `clean`/`garbled`/`wrapped`/`footer` matching the spike's failure modes
- [ ] **Wrapped SPAR items get line-joined** (the price on the next line is recovered)
- [ ] **Footer/boilerplate lines are filtered out** (never counted as items)
- [ ] Store extracted from receipt content, never filename
- [ ] `vp check` + `vp test` pass
- [ ] A test parses the 10 real receipts from the research repo fixture and reports results per receipt
