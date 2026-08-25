// The router instance, in its own module so both graphs share one source of
// truth. Routes come from the file system: src/routes scanned by the
// fileRoutes Vite plugin (vite.config.ts), adapted for Solid Router 2.
// Replaces the old <Router><FileRoutes /></Router> component setup.
import { pageRoutes } from "virtual:file-routes";
import { createRouter } from "@solidjs/router";
import { fileRoutes } from "@solidjs/router/fs";

export const Router = createRouter({ routes: fileRoutes(pageRoutes) });
