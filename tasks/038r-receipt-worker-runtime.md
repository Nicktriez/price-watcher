# Task 038r — Receipt Worker Must Run in the SolidStart Runtime (fix 038q's scheduler crash)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7c (receipt upload). **Found 2026-08-15 (Ultron, deploy):** the 038q receipt worker crash-loops the scheduler in production. **Deploy-blocking regression.**

## The bug (verified 2026-08-15)

Task 038q added a receipt OCR worker to the **scheduler process** (`src/server/ingest-scheduler.ts`):

```ts
import { claimAndProcessReceipts } from "./receipt-upload.ts";  // ← the problem
// ...
setInterval(() => {
  void claimAndProcessReceipts().catch(...);
}, RECEIPT_POLL_MS);
```

The scheduler runs as `node src/server/ingest-scheduler.ts` (raw Node). But `receipt-upload.ts` is a **SolidStart server function** (`"use server"`) — importing it drags in `@solidjs/start`'s HTTP runtime, which:

1. Uses the `~/*` path alias (raw Node can't resolve tsconfig paths → `ERR_MODULE_NOT_FOUND`)
2. Imports `server-only`, which **throws by design** outside the SolidStart/React server context: `"This module cannot be imported from a Client Component module"`

Result: the scheduler **crash-loops** (`errored`, 16 restarts), taking down offer ingest AND the receipt worker together. This is an architecture problem — no dependency install or Node loader can fix it, because `server-only` is intentionally guarded.

**Current state on the box:** Ultron reverted the scheduler to the pre-038q version to restore offer ingest. The receipt worker is **disabled** in production until this is fixed. The box's `ingest-scheduler.ts` diverges from git (local revert).

## The fix

The receipt worker must run **inside the SolidStart app runtime** — NOT the raw-node scheduler. Options (Nick/implementer picks):

1. **Recommended — run the worker in the app process.** The app server (`src/server/` entry or the SolidStart server lifecycle) already has the full SolidStart runtime. Add the `setInterval` poll there, so `claimAndProcessReceipts` runs in a context where `server-only` + `~` alias work. The scheduler (`ingest-scheduler.ts`) reverts to offer/fuel-only.

2. **Alternative — a separate worker process via the toolchain.** Run the worker as its own process through something that resolves the SolidStart context (e.g. a Vite+ build step or a dedicated entry bundled with the app's runtime). Heavier; only if the app-process option has issues.

**Either way:** the worker must still process **one receipt at a time** (038q's design) and the scheduler must return to offer/fuel-only (it worked before 038q).

## Important

- **This is a deploy-blocking regression from 038q** — the scheduler crash is a production outage. Priority.
- **The app process (Nitro) runs fine** — only the standalone raw-node scheduler breaks. So the fix is about _where_ the worker lives, not rewriting the worker.
- **`server-only` + `~` alias are the two blockers** — they only work inside the SolidStart build/runtime. Confirm the worker's new home has both.
- **Restore the scheduler to offer/fuel-only** (pre-038q behavior) as part of this — do NOT keep the receipt import in the raw-node scheduler.
- **No behavior change to the worker** — still serial, one receipt at a time, image deleted after parse (GDPR), statuses pending/processing/processed/failed.
- Plain Danish for user-facing states (unchanged from 038q).

## Acceptance criteria

- [ ] The scheduler (`node src/server/ingest-scheduler.ts`) runs stably with NO crash — offer ingest + fuel scheduler work
- [ ] The receipt worker runs in the SolidStart runtime and processes queued receipts (one at a time)
- [ ] The `~` alias + `server-only` resolve in the worker's new home
- [ ] No double-processing (status=pending atomic claim intact)
- [ ] Image deleted after parse (GDPR) — unchanged
- [ ] The box's `ingest-scheduler.ts` matches git (the local revert is reconciled)
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified live: scheduler stable for 10+ minutes, offer ingest runs, a queued receipt processes in the background
