import { pathToFileURL } from "node:url";
import cron from "node-cron";
import { ingestRema } from "../lib/tjek-ingest.ts";

const SCHEDULE = "15 */6 * * *";

let running = false;

export async function runOnce(): Promise<void> {
  if (running) {
    console.log("[ingest] previous run still in progress, skipping this tick");
    return;
  }
  running = true;
  try {
    const result = await ingestRema();
    console.log(`[ingest] done: inserted=${result.inserted} updated=${result.updated}`);
  } catch (error) {
    console.error("[ingest] run failed, will retry on next tick:", error);
  } finally {
    running = false;
  }
}

export function startScheduler(): void {
  if (process.env.DISABLE_INGEST_SCHEDULER === "1") {
    console.log("[ingest] scheduler disabled (DISABLE_INGEST_SCHEDULER=1)");
    return;
  }
  cron.schedule(SCHEDULE, () => {
    void runOnce();
  });
  console.log(`[ingest] scheduler started, cadence ${SCHEDULE}`);
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isMain) {
  startScheduler();
}
