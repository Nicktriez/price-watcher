// Background jobs run inside the app server runtime (one process — the same
// one you deploy). The raw-node scheduler can't resolve `~`/server-only
// imports and crash-loops, so both workers start from this module, which the
// middleware chain loads once per process (see src/middleware.ts). Their
// polls are idempotent.
//
// - Receipt OCR worker (Task 038r): poll for pending receipt scans.
// - Ingest scheduler: offer ingestion (~6h cadence) + daily fuel refresh.
//   fuel.ts is a plain module (no `"use server"`), so its functions are safe
//   to call from background timers.
import { startReceiptWorker } from "./receipt-worker";
import { startScheduler } from "./ingest-scheduler";

// Guard on globalThis so dev-server module re-evaluation (HMR) can't
// double-start the workers within one process.
const g = globalThis as typeof globalThis & { __skujegJobsStarted?: boolean };
if (!g.__skujegJobsStarted) {
  g.__skujegJobsStarted = true;
  startReceiptWorker();
  startScheduler();
}
