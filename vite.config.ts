import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";
import { fileRoutes } from "filesystem-routing/vite";
import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { lazyPlugins } from "vite-plus";

const isTest = !!process.env.VITEST;

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  plugins: isTest
    ? []
    : lazyPlugins(() => [
        // Solid 2 start mode (@solidjs/vite-plugin): generates both entries
        // around src/App.tsx + src/Document.tsx, serves /_server server
        // functions, and streams SSR through the runnable `ssr` environment.
        solid({
          start: {
            // Fetch-style middleware chain fronting every request. Its module
            // scope boots the background workers once per process (the old
            // entry-server side effects).
            middleware: "./src/middleware.ts",
          },
          ssr: true,
          // Compiles "use server" functions into fetch calls on the client,
          // served from the /_server endpoint.
          serverFunctions: true,
          // Makes the Solid transform accept route modules emitted by
          // filesystem-routing with query-suffixed ids (?pick=...).
          extensions: [".jsx", ".tsx"],
        }),
        // File-system routes over src/routes ([id] -> :id, [...404] -> *404).
        fileRoutes({ httpMethods: true }),
        tailwindcss(),
      ]),
  resolve: {
    alias: [
      // start mode does not provide the old SolidStart "~" alias.
      {
        find: /^~\//,
        replacement: fileURLToPath(new URL("./src", import.meta.url)) + "/",
      },
    ],
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
