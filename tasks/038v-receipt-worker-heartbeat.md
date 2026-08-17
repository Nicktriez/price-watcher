# Task 038v — Receipt Worker: Heartbeat + Retry Cap (stop the recover-loop)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7c (receipt upload). Found **2026-08-15** (Nick, local dev): the terminal spams `[receipt-worker] recovered 1 stuck receipt(s) to pending` forever — a receipt loops `processing → pending → processing` without ever terminating.

## The bug (verified)

`src/server/receipt-worker.ts`:

- `recoverStuckReceipts()` (line 368) resets any `status='processing'` receipt whose `updated_at` is older than `STALE_PROCESSING_MS` (10 min) back to `pending`, on the assumption that "processing + 10 min old = the process died mid-OCR, retry it" (038s's orphan-recovery intent).
- BUT it cannot tell **"the process died"** from **"the OCR is still actively running but slow/hung (>10 min)."**
- When a receipt's OCR runs longer than 10 minutes (or hangs), the next poll's recovery **resurrects work that is still in flight**: `processing → pending`, the claim loop re-claims it → `processing` again → a **second OCR spawns on the same receipt**. Forever.
- `processPendingReceipt` never returns (it's stuck inside OCR), so the `markReceiptFailed` safety nets (lines 159/168/194/414/418) are **never reached** — the receipt never reaches a terminal state.

Trigger: any receipt whose OCR exceeds 10 minutes (slow local machine, huge/problematic image). Reproducible on Nick's laptop; possible on the box too.

## The fix — two parts

1. **Heartbeat while processing (root fix).** While `processPendingReceipt` is actively running OCR on a receipt, it must periodically touch `updated_at` (e.g. every ~60s) so that `recoverStuckReceipts` only fires for receipts whose process is **actually dead** (no heartbeat for `STALE_PROCESSING_MS`) — never for one that is simply slow. Concretely:
   - Add a heartbeat inside the OCR loop (or around the long-running `ocrReceipt` call) that updates `updated_at` (or a dedicated `processing_started_at`/`heartbeat_at`) on the receipt while it's still running.
   - `recoverStuckReceipts` should only reset to `pending` receipts whose heartbeat is stale (older than `STALE_PROCESSING_MS`) — i.e. genuinely abandoned, not merely in progress.

2. **Retry cap.** Even with a heartbeat, a receipt that keeps failing to process should eventually stop looping. Add a retry limit (e.g. recover→pending at most 3 times, then mark `failed` with `"interrupted after N retries"`). Without a counter column, a lightweight approach: track recovery attempts in the `error` field or add a `processing_count`/`retry_count` column (migration) — implementer picks the cleanest that doesn't break the existing claim.

## Important

- **The worker must NEVER loop on a slow/hung OCR.** Whatever the fix, a single receipt must always reach a terminal state (`processed` or `failed`) within bounded retries, even if OCR is pathologically slow.
- **Don't break the serial one-at-a-time claim** or the atomic `status=pending→processing` guard (038q/038r/038s). The heartbeat is an _additional_ signal, not a replacement for the claim.
- **Don't break GDPR image deletion** (image removed after successful parse).
- **A genuinely-crashed process must still be retried** (038s's intent) — only distinguish "dead" from "slow" via the heartbeat, don't lose orphan recovery entirely.
- Verify on the exact repro: a receipt whose OCR takes >10 min must NOT loop.
- Plain — this is a worker-internal fix; no user-facing copy unless a `failed` state needs a retry affordance (038q already added "Prøv igen").

## Acceptance criteria

- [ ] A receipt whose OCR takes >10 minutes does NOT loop (heartbeat keeps it in `processing`, not resurrected)
- [ ] A receipt whose process genuinely crashed IS recovered to `pending` and retried (orphan recovery preserved)
- [ ] A receipt that repeatedly fails reaches `failed` after the retry cap (bounded, no infinite loop)
- [ ] Serial one-at-a-time processing + atomic claim unchanged
- [ ] GDPR image deletion unchanged
- [ ] `vp check` + `vp test` pass (with a test for the heartbeat/no-loop behavior)
- [ ] Deployed + verified on the box: no `recovered ... to pending` spam; a stuck receipt terminates
