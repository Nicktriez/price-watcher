import { pathToFileURL } from "node:url";
import cron from "node-cron";
import { ingestAllChains } from "../lib/tjek-ingest.ts";
import { refreshFuelPrices, startFuelPriceScheduler } from "./fuel.ts";
import { createRunLock, isSchedulerEnabled } from "./ingest-lock.ts";

const SCHEDULE = "15 */6 * * *";

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

const STARTED_KEY = "__ingestSchedulerStarted";

/**
 * Start the offer/fuel ingestion poll. Runs in the SolidStart/Nitro app
 * runtime (invoked from the server entry) — NOT a separate process. Since
 * fuel.ts is a plain module (no `"use server"`), its functions are safe to
 * call from a background timer. Idempotent — a process-wide flag prevents
 * double-scheduling if the entry module is re-evaluated.
 *
 * Receipt OCR deliberately does NOT run here — it lives in
 * src/server/receipt-worker.ts (Task 038r), started from the same server
 * entry. The `"use server"` receipt module crash-loops if imported into a
 * raw-node process (`~` alias + server-only are SolidStart-build-only).
 */
export function startScheduler(): void {
  if (!isSchedulerEnabled()) {
    console.log("[ingest] scheduler disabled (DISABLE_INGEST_SCHEDULER=1)");
    return;
  }
  const g = globalThis as Record<string, unknown>;
  if (g[STARTED_KEY]) return;
  g[STARTED_KEY] = true;
  cron.schedule(SCHEDULE, () => {
    void runOnce();
  });
  startFuelPriceScheduler();
  console.log(`[ingest] scheduler started, cadence ${SCHEDULE}`);
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isMain) {
  if (process.argv.includes("--once")) {
    // One-shot manual run (e.g. `pnpm ingest:run`) — forces an ingest + fuel
    // refresh now instead of waiting for the cron tick.
    void runOnce().then(() => {
      void refreshFuelPrices();
    });
  } else {
    startScheduler();
  }
}
