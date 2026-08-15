# Task 038s — Receipt Worker: Handle Missing-Image + Stuck-Processing Receipts

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7c (receipt upload). Found **2026-08-15** (Ultron, deploying 038r): receipts can get stuck in `processing` forever.

## Objective

Fix the receipt worker so it never leaves a receipt stuck in `processing`. Two related gaps cause this:

## Gap 1 — Missing-image receipts never reach a terminal state

`src/server/receipt-worker.ts` `processPendingReceipt` (line 137):

```ts
if (!receipt || !receipt.image_path) {
  return { ok: false, reason: "ocr-failed" }; // ← returns WITHOUT updating status
}
```

The early return on a missing image / missing receipt **never updates the `receipt` status**. The caller (`claimAndProcessReceipts`) set it to `processing` before calling; this early return leaves it `processing` forever. The worker only re-claims `pending` receipts, so a missing-image receipt is stuck permanently. **Fix:** on this path, mark the receipt `failed` with a clear error (e.g. `"no image"`) before returning.

## Gap 2 — No recovery for stuck `processing` receipts

If the app restarts mid-OCR (a deploy, a crash), a receipt claimed as `processing` is orphaned — the worker never re-claims it (it only picks `pending`), and it never reaches `processed`/`failed`. **Fix options (Nick/implementer picks):**

- **Stale-claim recovery:** on each worker poll, reset any `processing` receipt older than a threshold (e.g. >10 min, well beyond the ~5 min max OCR time) back to `pending` (or `failed` with "interrupted") so it gets re-processed.
- **Claim heartbeat:** store `processing` + `started_at`, and reset receipts whose `started_at` is older than the max OCR time.

Either way: a receipt must always reach a terminal state (`processed` or `failed`), never linger in `processing`.

## Important

- **This is the receipt worker's robustness gap**, separate from 038r's runtime fix (which works). The worker is functional; it just has no stuck-state safety net.
- **Keep the GDPR image deletion** — an image that exists should still be deleted after parse. The fix is about status lifecycle, not image handling.
- **Don't break the serial one-at-a-time processing** — recovery resets must not cause two workers to claim the same receipt (the atomic `status=pending→processing` claim stays the guard).
- Plain, careful — a `failed` receipt should show a clear "Prøv igen" to the user (038q already added retry).
- Pre-beta priority (receipt upload is core to Phase 7c).

## Acceptance criteria

- [ ] A receipt with no `image_path` (or no row) is marked `failed` with a clear error — never stuck in `processing`
- [ ] A `processing` receipt older than the max OCR time is reset to `pending` (re-processed) or marked `failed` — never stuck forever
- [ ] The worker still processes receipts one at a time; no double-processing
- [ ] GDPR image deletion unchanged (image deleted after successful parse)
- [ ] A stuck/orphaned receipt eventually reaches `processed` or `failed`
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified live on `beta.skujeg.dk` (no receipt lingers in `processing`)
