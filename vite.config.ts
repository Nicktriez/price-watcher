import { defineConfig } from "vite-plus";
import { nitro } from "nitro/vite";
import { solidStart } from "@solidjs/start/config";
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
  plugins: isTest ? [] : lazyPlugins(() => [solidStart(), tailwindcss(), nitro()]),
  // TEMP: SolidStart v2 regression — the dev toolbar's CJS deps (source-map-js,
  // error-stack-parser) lost their optimizeDeps entries in the v2 config
  // rewrite, so Vite serves them untransformed and the browser can't resolve
  // the named exports (every v2 page load errors). The `@solidjs/start >`
  // prefix resolves them inside SolidStart's dep context (pnpm doesn't hoist).
  // Remove this block once the official fix ships (solidjs/solid-start#2282).
  optimizeDeps: {
    include: ["@solidjs/start > source-map-js", "@solidjs/start > error-stack-parser"],
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
