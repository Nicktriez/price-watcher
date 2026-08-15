import { pathToFileURL } from "node:url";
import cron from "node-cron";
import { ingestAllChains } from "../lib/tjek-ingest.ts";
import { claimAndProcessReceipts } from "./receipt-upload.ts";
import { startFuelPriceScheduler } from "./fuel.ts";
import { createRunLock, isSchedulerEnabled } from "./ingest-lock.ts";

const SCHEDULE = "15 */6 * * *";
const RECEIPT_POLL_MS = 30_000;

const runLock = createRunLock();

export async function runOnce(): Promise<void> {
  if (!runLock.tryAcquire()) {
    console.log("[ingest] previous run still in progress, skipping this tick");
    return;
  }
  try {
    const results = await ingestAllChains();
    const ok = results.filter((r) => r.ok).length;
    const failed = results.length - ok;
    console.log(
      `[ingest] done: ${ok}/${results.length} chains ingested${failed > 0 ? `, ${failed} failed` : ""}`,
    );
  } catch (error) {
    console.error("[ingest] run failed, will retry on next tick:", error);
  } finally {
    runLock.release();
  }
}

export function startScheduler(): void {
  if (!isSchedulerEnabled()) {
    console.log("[ingest] scheduler disabled (DISABLE_INGEST_SCHEDULER=1)");
    return;
  }
  cron.schedule(SCHEDULE, () => {
    void runOnce();
  });
  startFuelPriceScheduler();
  // Receipt OCR worker (Task 038q): poll for queued receipts and process them
  // one at a time so the user never waits on OCR. Serial by design; scale-up
  // to a job queue + N workers is a clean, isolated change later.
  setInterval(() => {
    void claimAndProcessReceipts().catch((e) => console.error("[receipt-worker] poll failed:", e));
  }, RECEIPT_POLL_MS);
  console.log(
    `[ingest] scheduler started, cadence ${SCHEDULE} + receipt worker ${RECEIPT_POLL_MS}ms`,
  );
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isMain) {
  startScheduler();
}
