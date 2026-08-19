// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";
import { startReceiptWorker } from "./server/receipt-worker.ts";
import { startScheduler } from "./server/ingest-scheduler.ts";

// Background jobs run inside the SolidStart/Nitro app runtime (one process —
// the same one you deploy). The raw-node scheduler can't resolve `~`/server-only
// and crash-loops, so both workers start from this SSR entry, imported once per
// app process. Their polls are idempotent.
//
// - Receipt OCR worker (Task 038r): poll for pending receipt scans.
// - Ingest scheduler: offer ingestion (~6h cadence) + daily fuel refresh.
//   fuel.ts is a plain module (no `"use server"`), so its functions are safe to
//   call from background timers.
startReceiptWorker();
startScheduler();

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
