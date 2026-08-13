import { pathToFileURL } from "node:url";
import cron from "node-cron";
import { ingestAllChains } from "../lib/tjek-ingest.ts";
import { startFuelPriceScheduler } from "./fuel.ts";
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

export function startScheduler(): void {
  if (!isSchedulerEnabled()) {
    console.log("[ingest] scheduler disabled (DISABLE_INGEST_SCHEDULER=1)");
    return;
  }
  cron.schedule(SCHEDULE, () => {
    void runOnce();
  });
  startFuelPriceScheduler();
  console.log(`[ingest] scheduler started, cadence ${SCHEDULE}`);
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isMain) {
  startScheduler();
}
