// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";
import { startReceiptWorker } from "./server/receipt-worker.ts";

// Receipt OCR worker (Task 038r): the worker MUST run inside the SolidStart
// runtime — the raw-node scheduler can't resolve `~`/server-only and crash-loops.
// This module is the SSR server entry, imported once per app process, so the
// poll (idempotent) starts with the app. Offer/fuel scheduling stays in the
// standalone scheduler (`src/server/ingest-scheduler.ts`).
startReceiptWorker();

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
