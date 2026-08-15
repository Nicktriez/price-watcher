# Task 038q — Receipt OCR Too Slow (2.5 min → interactive)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 3 (OCR) + Phase 7c (beta upload flow). Found **2026-08-15** (Nick): clicking Upload "does nothing" on `beta.skujeg.dk`. Root cause: **OCR takes 156 seconds per receipt**, so the upload hangs and no result renders.

## Objective

Make receipt upload interactive. A user should get a result (or a clear "processing" state) within a reasonable time — target well under 30s, ideally a few seconds. 2.5+ minutes of silence reads as "the button is broken."

## Root cause (verified 2026-08-15)

- **Box:** 2 vCPU, 3.7 GB RAM (CX23). Tesseract 5.5.0 + dan/eng/osd installed. ✅
- **Pipeline (`src/lib/receipt-ocr.ts`):** runs **8 serial Tesseract passes** — 4 rotations × 2 PSM modes — on the **full-resolution image** (3.2 MB receipt). Measured: **156 seconds** for one receipt.
- The client (`src/routes/upload.tsx`) does `setResult(await uploadReceipt(file))` with no progress/loading state. During those 156s the page shows nothing → "the button does nothing."
- Note: this is NOT the missing-tools issue (that was a separate deploy gap, fixed). This is performance.

## What to build (options — Nick/implementer to pick the combination)

1. **Downscale before OCR.** The receipt is 3.2 MB but Tesseract doesn't need full resolution — thermal receipts OCR fine at ~1200–2000px on the long edge. Downscaling 3–4× could cut OCR time dramatically (Tesseract scales roughly with pixel count). Biggest, cheapest win.

2. **Fewer, smarter passes.** 8 serial passes is brute force. Options:
   - Run rotations in **parallel** (Promise.all) — the 2 vCPUs can do ~2 at once, roughly halving wall time.
   - **Early-exit:** stop once a rotation/PSM scores well, instead of always running all 8.
   - **Prune rotations:** if the image has no EXIF orientation, skip redundant passes (0 vs 180 are often both readable).

3. **Honest loading state (essential regardless).** The client must show a "Vi læser din kvittering…" spinner while processing, and handle errors gracefully. Even at 30s, the user needs feedback — silent-wait is the actual bug the user hit. This part is non-negotiable.

4. **Async/queue (only if needed later).** If OCR still can't be interactive, move it to a background job with a "we'll email/notify you" flow. **Defer this** — try downscale + parallel + loading state first; don't build a job queue until the cheap wins are exhausted.

## Important

- **Measure before/after.** Time the full `ocrReceipt` on the SPAR Broby receipt (currently 156s) — the acceptance gate is a concrete number, not "feels faster."
- **Don't degrade accuracy** — the downscale/parallel changes must not regress the 6 receipt OCR fixtures (Task 011/012) or the SPAR fixture recovery that 038p improved.
- **The loading state is the user-facing fix** — even if OCR stays slow, the user must not see silence. That's what "the button does nothing" means.
- This is a **core beta flow** (Phase 7c asks users to upload 3–5 receipts) — pre-beta priority.
- Plain Danish for the loading/error copy.

## Acceptance criteria

- [ ] Uploading the SPAR Broby receipt returns a result in a target time (Nick sets the bar; aim < 30s, ideally a few seconds)
- [ ] The upload page shows a clear "processing" state while OCR runs (no more silent wait)
- [ ] Errors are handled gracefully (no silent nothing)
- [ ] No regression on the 6 OCR test fixtures (accuracy preserved)
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified live on `beta.skujeg.dk` (upload shows progress + returns in target time)
