# Task 038q — Background Receipt OCR (don't make the user wait)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 3 (OCR) + Phase 7c (beta upload). Found **2026-08-15** (Nick): OCR takes 156s per receipt and the user waits silently. **Decision (Nick, 2026-08-15): don't make the user wait — scan the receipt in the background and let the user leave.**

## Objective

Change receipt upload from **synchronous** (user waits 2.5 min for OCR) to **background processing**: the upload returns immediately, the receipt is queued, a worker scans it, and the user can leave and check back later. The user gets immediate feedback ("we're reading your receipt") instead of a frozen page.

## Why this replaces the "speed it up" approach

The original 038q plan (downscale + parallel) makes OCR faster but still synchronous — the user still waits (just less). Nick's decision is better: **decouple the scan from the request entirely.** Even a fast OCR benefits from backgrounding (no request timeout risk, user can leave).

## Current state (verified 2026-08-15)

- `src/server/receipt-upload.ts` `uploadReceipt` does OCR **inline** (`ocrReceipt`), then inserts the receipt + items + price points, all in the request. Takes 156s → request hangs → "nothing happens."
- The uploaded image is written to a **temp dir** and **deleted in a `finally`** (line 144) — the DB stores `image_path: null` (line 242). **Background processing requires persisting the image** until the worker reads it.
- The **scheduler process** (`src/server/ingest-scheduler.ts`) already runs on the box with DB access (it ingests offers on a cron). **It's the natural worker** — it can poll for pending receipts and process them.
- `receipt` table has **no status column** — needs `status: pending | processed | failed` (or similar).
- There's a `RECEIPTS_DIR` concept already (used in tests) — a persistent upload dir is needed on the box.

## What to build

1. **Schema: add a `status` column to `receipt`** (migration): `pending` → `processed` | `failed`. Default `pending`. Also add `error` text (nullable) for failed scans.

2. **Split `uploadReceipt` into two parts:**
   - **`queueReceipt(file)`** (called by the upload route, fast): validate the image, persist it to a persistent `RECEIPTS_DIR` (NOT a temp dir that gets deleted), insert a `receipt` row with `status=pending` and `image_path` pointing at the saved file, return immediately with `{ ok: true, receiptId }` + "Vi læser din kvittering — du får besked, når den er klar." No OCR.
   - **`processPendingReceipt(receiptId)`** (called by the worker): read the persisted image, run OCR, parse, insert `receipt_item` + `price_point` rows, award points, mark `status=processed` (or `failed` + error). This is the current OCR + insert logic, extracted.

3. **Worker: process pending receipts in the scheduler.** Add a poll loop (e.g. every ~30s or on the existing cron tick) to the scheduler process: find `status=pending` receipts, call `processPendingReceipt` on each. The scheduler already has DB access.

4. **Persist + cleanup the image.** Save uploads to `RECEIPTS_DIR` (persistent). **Privacy policy says "receipt images deleted after parse"** — so `processPendingReceipt` must **delete the image file after successful parsing** (keep the parse results, delete the picture, matching the existing GDPR promise). On failure, keep it (or the error) for retry.

5. **Surface the status to the user.**
   - The upload page (after queueing): immediate confirmation + a link to check the receipt.
   - The receipts/spending pages: show `pending` receipts with a "bliver behandlet…" state (and a way to refresh), and `failed` with a clear "Kunne ikke læses — prøv igen" + retry affordance.
   - No silent wait anywhere — the user always gets feedback.

## Important

- **The user must never wait on OCR.** The upload route returns in milliseconds (queue only). Any lingering synchronous OCR is a regression.
- **Privacy promise is load-bearing:** image deleted after parse (the plan/Task 038 already committed to this). Persist only long enough for the worker to read it, then delete.
- **Dedup/points logic must still work** — it currently runs inline in `uploadReceipt`; move it into `processPendingReceipt` unchanged (dedup by fingerprint, points award, streak).
- **Concurrency:** the worker should process receipts one-at-a-time or with a lock, so two worker runs don't double-process the same receipt (guard on `status=pending` + atomic transition).
- **The scheduler is the worker** — reuse it; don't spin up a separate process unless needed.
- Plain Danish for user-facing copy (pending/failed/retry messages).
- This is a **core beta flow** (Phase 7c asks users to upload 3–5 receipts) — pre-beta priority.

## Acceptance criteria

- [ ] Uploading a receipt returns immediately (well under a second) with a "we're reading it" confirmation — no OCR in the request
- [ ] The scheduler worker processes the pending receipt and the results appear (items, price points, points) within a reasonable time
- [ ] The user can leave the upload page and the receipt still gets processed
- [ ] Receipts show a clear "processing" state, and "failed" + retry for failures
- [ ] The image file is deleted after successful parse (GDPR promise intact)
- [ ] Dedup + points + streak still work (moved into the worker unchanged)
- [ ] No double-processing (worker guards on status=pending)
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified live on `beta.skujeg.dk` (upload returns fast, receipt processed in background, appears in spending)
