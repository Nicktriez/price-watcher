<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

# Project Context

## What this is

A Denmark-only grocery price watcher. SolidStart 2 (Solid meta-framework) + TailwindCSS 4 + TypeScript, with Vite+ as the toolchain and Kysely for SQL. The app ingests supermarket offer data from the Tjek.com read API and (later) crowd/receipt data.

## Ground rules for coding agents

- **You implement tasks from `tasks/`.** Each task file is self-contained (objective, steps, exact schema/field paths, acceptance criteria). Read the referenced task file and implement it fully.
- **Do not invent product decisions** or deviate from the task spec. If something is ambiguous or missing, note it and ask rather than guessing.
- **Run `vp check` and `vp test` before finishing** — never say "I think it compiles." These must pass.
- **The design source of truth is `docs/reference/build-plan.md`** (kept in this repo for agent access — the canonical copy lives in the research repo `/root/grocery-price-watcher-research`). Tasks reference its "What to code — Phase N" sections; read them from `docs/reference/build-plan.md`.
- **Node >= 24 is required.** The project's `package.json` `engines` enforces it. If the local Node is older, flag it.

## Data / legal boundary (important)

The offer feed comes from **Tjek A/S — the same company that owns eTilbudsavis, a direct competitor.** Consequences:

- Feed rows must have `source='tjek'`, `trust_tier='official'`, `internal=true`. Feed data is **internal-only** — never marked publishable, never treated as something the site can redistribute.
- `internal=true` rows are for the app's own use; crowd/receipt rows (`internal=false`) are the publishable layer.
- The `offer.internal` column enforces this. Do not omit or flip it.

## Dependencies / stack notes

- SolidStart 2 (`@solidjs/start`), `solid-js`, TailwindCSS 4 via `@tailwindcss/vite`, Vite+ (`vite-plus`), Kysely for DB, node-cron for scheduling.
- Env vars live in `.env`: `DATABASE_URL` (Postgres) and `TJEK_BASE_URL=https://squid-api.tjek.com`.

## Repo layout

- `docs/setup-dev.md` — local dev setup: Postgres install, `.env` creation, toolchain commands. **Read this first if environment/deps aren't set up.**
- `docs/bootstrap-new-machine.md` — full end-to-end setup for a brand-new dev machine (Node, pnpm, `vp`, GitHub SSH, clone, Postgres, `.env`, OpenCode). The "I changed machines" doc.
- `docs/reference/build-plan.md` — the full build plan (design source of truth; "What to code — Phase N" sections drive the tasks).
- `docs/reference/chains.md` — Danish chain research: dealer IDs, catalog publish cadence, data formats. Ground truth for ingestion/scheduling.
- `src/db/` — Kysely schema, migrations, client
- `src/lib/` — the Tjek API client and ingestion logic
- `src/lib/__fixtures__/` — real Tjek payloads as ground-truth fixtures (`rema1000.offers.json`, `rema1000.catalogs.json`). Use these to build types/tests against the real data shape.
- `src/routes/` — SolidStart routes (offers index, product, store pages)
- `src/server/` — the ingestion scheduler
- `tasks/` — the coding task files (implement these)
- `reports/` — code-explanation reports (written by Ultron, on request)

## When done with a task

- Leave work committed or uncommitted as Nick directs. Nick reviews every diff. Do not merge or push without his say-so unless he explicitly told you to.
