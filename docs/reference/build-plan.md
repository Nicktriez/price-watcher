# Danish Price Watcher — Build Plan

**Goal:** A Denmark-only grocery price site where users build lists (recipes, cleaning, etc.), see the cheapest store for the whole basket this week, adjusted for travel cost, with official chain data as the backbone, receipt-derived baseline prices, and crowd-reported shelf prices as the differentiators.

**Architecture:** Node.js + TypeScript. One country (Denmark), but the domain model stays country-neutral (Chain, Store, Offer, Product, List are data, not code). Data comes from three layers: official weekly offers (coverage), receipt-derived baseline prices, and user-reported shelf prices (differentiation), all timestamped and trust-tiered. Routing via OSRM (free, no API key). Fuel via a single daily national-average price.

**Data & legal boundary (from Phase 0 research + ownership check — treat as fixed):** all target chains publish through one platform, **Tjek A/S** (`squid-api.tjek.com`), whose read API is open and needs no auth. **Critical ownership fact: Tjek A/S is eTilbudsavis** — same company (founded 2009 as `eTilbudsavis ApS`, renamed to `Tjek A/S`; CVR 32157785, Christian Ree / Jack Tolboe / Morten Bo Rønsholdt; not JP/Politikens). So we are building a competitor to Tjek's own flagship product _on top of Tjek's API_. Tjek's B2B ToS binds their customers, not us, but §8.6 forbids training AI/ML on the data without written consent and "Integration" (API reuse in your own media) is paid/licensed — and an open endpoint is not a grant of rights. **Consequences (fixed):**

1. The retailer feed is an **accelerant, not the foundation** — a dependency on a direct competitor who can gate/throttle/cut it the moment we're a threat. Never build go-to-market, resale, or AI training on it. Read-only, low-volume, private use only.
2. **The crowd + receipts layer is the foundation** — the only data source Tjek cannot switch off. It is the moat, and the site must be valuable on our own data even if the Tjek feed vanished.
3. Keep per-chain own-surface fallbacks documented (`research/notes/`); know the genuinely independent fallbacks (retailer commerce APIs like Salling's) exist.
4. Enforce the split in the data model: feed rows are internal, crowd/receipt rows are publishable.

Full detail: `research/verdicts/etilbudsavis.md` (engineering) + the ownership check (see research review, 2026-08-11).

**On "selling the site to another country" (Nick's clarification):** that ambition means selling/leasing the **codebase + name** (buyer may rename), **never the data**. **Hard constraint: the Tjek-dependent stack (Phases 1–8) is internal-only and can never be included in a sale/lease** — it reads our competitor's feed, and we won't hand that dependency to a buyer. The sellable/leasable artifact is **our own Tjek-independent ingestion API — the output of Phase 9** — which has no Tjek dependency and adapts to the buyer's country's chains. **Therefore export is gated on Phase 9, which is gated on traction.** The code is country-neutral (Chain/Store/Offer are data, not code), so once Phase 9 exists, the stack exports cleanly with no Tjek involvement. Don't build white-label/multi-country tooling before then (see YAGNI).

**Tech Stack:** SolidStart (Solid meta-framework) + TailwindCSS, Vite+ as toolchain (via `vp migrate`), Node.js + TypeScript, Kysely (typed SQL builder), PostgreSQL, node-cron/BullMQ for ingestion, Tjek.com read API (all chains, JSON, no auth) with signed PDF per catalog as ground-truth fallback, OSRM (HTTP API), Tesseract (Danish) for receipt OCR, Entire.io (agent-session records + git mirror), affiliate networks (Partner-ads / Tradetracker). **Hosting: separate Hetzner VPS** (Nick's decision, 2026-08) — self-managed Postgres + app + cron on one box, EU data residency, NOT the agent VPS.

## Tool Stack — what each tool is for

| Tool                           | What it is                                                                                            | What we use it for here                                                                                                                                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vite+**                      | Unified JS toolchain (build, dev server, lint, format, test) from VoidZero (Evan You's team), in beta | The toolchain layer — brought in via `vp migrate` AFTER SolidStart scaffolding, not as the scaffold itself. `vp dev/check/test/build` drive the workflow                                                                                   |
| **SolidStart**                 | Meta-framework for SolidJS (runs on Vite+)                                                            | The app framework — pages, routing, server-side rendering, data loading for the site                                                                                                                                                       |
| **Node.js + TypeScript**       | JavaScript runtime + typed language                                                                   | The runtime everything runs on; TypeScript gives type safety so the data model (Offer, Product, …) can't silently break                                                                                                                    |
| **Kysely**                     | Type-safe SQL query builder for TypeScript                                                            | Talks to Postgres with compile-time-checked queries — no raw SQL string bugs; the schema/migrations live here                                                                                                                              |
| **TailwindCSS**                | Utility-first CSS framework                                                                           | Styling the whole app — Nick's decision (2026-08). Get it from the `with-tailwindcss` SolidStart template, not added later.                                                                                                                |
| **PostgreSQL**                 | Relational database                                                                                   | Stores everything: chains, stores, offers, products, lists, `PricePoint` history, receipts, users                                                                                                                                          |
| **node-cron / BullMQ**         | Schedulers + job queue for Node                                                                       | The ingestion cadence — weekly Tjek capture, the ~6h `PricePoint` snapshot, the weekly digest email                                                                                                                                        |
| **Tjek read API**              | Open JSON API powering all DK chains' aviser                                                          | The offer feed (accelerant, internal-only per the Data & legal boundary)                                                                                                                                                                   |
| **OSRM**                       | Free open routing engine (HTTP API)                                                                   | Travel cost math — "is it worth driving to Føtex?" round-trip distances                                                                                                                                                                    |
| **Tesseract**                  | OCR engine — packages `tesseract-ocr` + `tesseract-ocr-dan` (Danish language data)                    | Receipt line-item extraction for Phase 3 baseline prices — the `dan` package is what makes Danish store/product names (ÆØÅ) readable. **Pending: install + test against the ~10 gathered receipts once they're ready (Phase 0 OCR spike)** |
| **Entire.io**                  | Git-compatible network + CLI capturing AI agent sessions indexed against commits                      | The system of record — our coding sessions and code-explanation reports stay searchable with the commits they produced                                                                                                                     |
| **GitHub**                     | Git remote + collaboration                                                                            | Canonical source of truth; the push/pull loop between laptop and VPS                                                                                                                                                                       |
| **Partner-ads / Tradetracker** | Danish affiliate networks                                                                             | Monetization — outbound links to online groceries and recipe content                                                                                                                                                                       |
| **pm2 / systemd**              | Process manager / service manager                                                                     | Runs the app + schedulers in production on a **separate Hetzner VPS**, restarts on crash, keeps it alive                                                                                                                                   |

**Hosting decision (2026-08):** the project deploys to a **separate Hetzner VPS** (self-managed Postgres + app + cron on one box). Chosen for: EU data residency (GDPR-friendly for a Danish consumer service), cheap/predictable (~€5–8/mo at this scale), matches Nick's existing Hetzner + SSH/Tailscale skills, and Postgres/cron/file-storage all work natively. Trade-off accepted: Nick owns the ops (Postgres backups, OS updates, restarts) — which is on-brand for the learning goal. A dedicated box keeps the project isolated from the existing VPS. Alternative considered: Fly.io (managed, Amsterdam region) if server-ops ever becomes a burden.

**The two "capability" tools worth a second look:** Entire.io is the _learning_ tool (it makes the code-explanation workflow durable), and OSRM is the _moat_ tool (it powers the travel-cost feature PriceRunner-style sites don't have). The rest are plumbing.

---

## Development Workflow

- **Division of labor:** Nick writes ALL code. Ultron's only jobs: bounce ideas on request, keep the plan current, and write code-explanation reports. No code writing, no refactoring, no cleanup — even when it would be faster. That's the point.
- **Report system as curriculum:** when Nick asks for a report, Ultron writes one explaining how the code and files tie together — what each module does, why the data flows the way it does, where it can still break — **and where a better way exists, says so with the trade-off** (per the Ultron identity: never let a mediocre approach pass just to be agreeable). Reports are only written on demand — never automatically after commits. Reports are committed to the repo (`reports/` folder) so Entire.io indexes them alongside the commits. Nick studies them. This is the point of the project.
- **Entire.io records the sessions:** agent sessions are captured and indexed alongside commits (searchable system of record). The report becomes part of the project's permanent history.
- **GitHub is the canonical remote:** one source of truth. Nick clones/works/pushes from the laptop; Ultron clones to the VPS — research repo at `/root/grocery-price-watcher-research`, and the actual project repo (Phase 1+) at `/root/price-watcher` — pulls before each session and `pull --rebase` before pushing back. Repo stays private until the prototype survives; public later. VPS auth: existing `GITHUB_TOKEN` (public_repo) works for a public repo; private repo needs a scoped PAT or SSH deploy key in `.env`.
- **Bleeding-edge stack is deliberate:** Vite+ / SolidStart / Kysely / Node+TS / Entire.io are intentionally new to Nick. Unknowns are the curriculum, not blockers. If a tool fights the project for more than a session, flag it honestly — learning a tool is the goal, but the site must still ship.

## Agentic Workflows

**What this is:** the fallback workflow for when Nick gets tired of hand-coding. By default Nick writes all the code (the learning loop — see Development Workflow). When he's worn out and wants to keep momentum, he hands the task to a second coding agent — **OpenCode** — which writes the code instead. This section defines how that handoff works, what context OpenCode gets, and how the work gets reviewed and recorded.

**The two agents, and their different jobs:**

- **Ultron (Hermes agent, on the VPS)** — the _planner/explainer_. Never writes production code. Bounces ideas, keeps the plan current, writes code-explanation reports, runs research/spikes. The learning loop's other half.
- **OpenCode (CLI, on the laptop)** — the _fallback writer_. The only agent that writes project code. Used when Nick is too tired to code by hand. Runs `opencode run '<task>'` (one-shot) or an interactive TUI session in the repo.

**Trigger — when to use OpenCode:**

- Nick is tired / low energy but the task is well-defined and shouldn't wait.
- The task is mechanical or well-scoped (e.g. "implement the Kysely schema per the plan", "write the Tjek client per the what-to-code spec") — exactly the kind of thing a coding agent handles well.
- Default remains: Nick codes by hand. OpenCode is the exception, not the rule.

**The handoff workflow:**

```
1. Nick writes the task in plain terms, referencing the plan where it exists.
   "Implement the offer table + Tjek ingest per the Phase 1 spec in docs/build-plan.md"
2. Nick runs OpenCode in the repo (laptop) — `cd ~/price-watcher` first, then:
   opencode run '<task>'        # one-shot (uses current dir, no --workdir flag)
   # or interactive:  opencode  (then describe the task)
3. OpenCode reads AGENTS.md + the referenced plan section, writes the code, runs vp check/test.
4. OpenCode commits + pushes to GitHub (or leaves uncommitted for Nick to review).
5. Nick (or Ultron) reviews the diff. Nick studies it — this preserves the learning loop:
   the code is still Nick's to understand, OpenCode just did the typing.
6. On request, Ultron writes the code-explanation report of what OpenCode built,
   committed to reports/ so Entire.io indexes it alongside the commit.
```

**Context OpenCode gets (same sources Ultron uses):**

- `AGENTS.md` — toolchain + commands (`vp install`/`vp check`/`vp test`; scripts vs built-ins; `vp env doctor`).
- `docs/build-plan.md` → the specific "What to code — Phase N" section. This is the most important: the what-to-code spec exists precisely so a coding agent can implement it without Nick narrating every detail.
- `research/` — Tjek API shapes, the real offer JSON. Ground truth for ingestion code.
- `reports/` — prior reports, so it understands what was built and why.

**Review + quality control (the non-negotiable step):**

- OpenCode must run `vp check` and `vp test` before finishing — no "I think it compiles."
- Nick reviews the diff even when he didn't write it. That's what keeps this a _learning_ project rather than a "an agent wrote a thing I don't understand" project.
- Ultron does NOT auto-review or auto-approve OpenCode's commits. If Nick asks for a report on what OpenCode built, Ultron writes it — but review and merge decisions stay with Nick.

**Boundaries:**

- ✅ OpenCode: writes project code, refactors, cleans up, runs the toolchain, commits.
- ❌ OpenCode: does NOT make product decisions or deviate from the plan/spec without Nick's say-so.
- ✅ Ultron: ideas, plan, reports, research, spikes.
- ❌ Ultron: never writes/refactors/cleans production code — even when faster. That rule doesn't change just because OpenCode exists; it's about Nick's learning, not about capability.
- Nick stays the author of record: he understands and owns everything merged, whether he typed it or OpenCode did.

**Durability rules:**

- Entire.io captures all agent sessions (Ultron and OpenCode) and indexes them against commits — so the "how was this built" story survives any single session.
- Code-explanation reports are committed to `reports/` so they're searchable and survive context loss.
- When a session changes project structure (new table, new module, new script), note it in `AGENTS.md` + the relevant plan section so the _next_ agent session isn't starting cold.

**Agentic workflows NOT to build now:** no autonomous CI agents, no auto-codegen from issues, no agent-driven PR reviews. The agentic layer here is deliberately small: good project context (AGENTS.md + plan + research), a human-in-the-loop author (Nick) who can fall back to OpenCode when tired, and a durable session record (Entire.io). That's enough to keep momentum without adding machinery.

---

## Success Metrics (what counts as "success")

Goals are **engagement-weighted**, not signup-count vanity. A price watcher with signups but no baskets, receipts, or returns is a graveyard, not a success. Danish market ≈ 5.9M people; eTilbudsavis claims 1.9M users. Goals are staged by phase and are starting targets to calibrate against real data.

| Milestone                | Trigger (Phase)             | Goal                                                                                           | Why it means success                                                                                                                                                  |
| ------------------------ | --------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M1 — MVP validated**   | after Phase 4 (basket math) | 100 real users each built ≥1 basket and got a store ranking; **≥30% return the next week**     | Proves people actually want "cheapest store for my basket" — not just that the page loads                                                                             |
| **M2 — Launch traction** | after Phase 7 (launch)      | 1,000 weekly-active users who built a basket; **≥200 receipts uploaded/week**                  | Proves the crowd+receipt data loop actually runs — the foundation                                                                                                     |
| **M3 — Traction gate**   | Phase 9 gate                | 5,000 weekly-active users **AND** ≥500 receipts/week **AND** organic growth without paid spend | This IS the "real users / a threat" threshold Phase 9's gate refers to — visible enough to Tjek to be a cutoff risk, big enough that losing the feed must not kill us |
| **M4 — Viability**       | ongoing                     | affiliate revenue ≥ server + LLM costs                                                         | Business self-sustains without Nick's freelance income                                                                                                                |

**Reading these:** M3 is the load-bearing one — it's the operational definition of "traction" that unlocks Phase 9 and the export product. Until M3, Phase 9 stays on the shelf (YAGNI). Use M1/M2 to decide whether to keep building; use M3 to decide whether to harden; use M4 to decide whether it's a business.

---

## Phase 0 — Data Access Spike ✅ COMPLETE (2026-08-11)

**Result:** All 5 target chains (Netto, Bilka, Føtex, REMA, Lidl) — plus 7 more — publish through one shared platform, Tjek.com A/S. Read API is open (no auth), returns structured JSON (name, price, unit price, quantity, page, image, validity dates). No scraping/OCR needed for offers. **Reproduced live on review: identical counts.** C1 5/5 pass, C2 end-to-end run pass, C3 build order decided (REMA → Netto → Lidl → Bilka → Føtex). Full details in repo `research/` (README, EXIT_CRITERIA, verdicts, `tjek_collector.py`, `snapshot/`).

**Remaining Phase 0 item:** OCR spike — install `tesseract-ocr` + `tesseract-ocr-dan` and test against ~10 real Danish receipts once Nick has gathered them (was not run during research because receipts weren't ready). Only affects Phase 3, does not block Phase 1.

**Receipts to collect for the OCR spike (~10, covering format variety, not just 10 of the same store):**

- [ ] **REMA 1000** — #1 priority: prints article numbers on receipts, which match the `get_offer_products` RPC (Phase 1's first chain)
- [ ] **Netto** — biggest hard-discounter target
- [ ] **Lidl** — hard-discounter, different layout
- [ ] **Bilka** — includes nonfood lines + store-brand
- [ ] **Føtex** — Salling sibling, deeper catalogue
- [ ] **Kvickly** — Coop banner
- [ ] **SuperBrugsen** — Coop banner, different receipt style
- [ ] **365discount** — Coop discount banner
- [ ] **SPAR or MENY** — independent/affiliate chain
- [ ] **One "messy" receipt** — crumpled, angled, faded thermal paper, or a partial/ripped one (tests OCR robustness, not just clean scans)

**Diversity tips so the spike actually tests something:**

- Mix **thermal paper photos** and **digital/email receipts** if you have them — different contrast/format.
- Include at least one receipt with **member/discount prices** (Coop member, Bilka+), one with **buy-multiple / "2 for" pricing**, and one with **multi-line items + unit prices** (pr. kg/stk).
- The goal is ≥90% correct line items across the set — a clean scan of one store proves nothing; the variety is the test.

Full chain/format context: `research/notes/chains.md`.

**Key finding for the plan:** the retailer feed is Tjek's platform; its ToS forbids AI/ML training (§8.6) and paid-licenses "Integration". See the Data & legal boundary note at top. Not a Phase 1 blocker — a fixed design constraint.

---

## Phase 1 — MVP Skeleton + REMA Ingestion (1–2 weeks)

**Objective:** SolidStart app (Vite+ as toolchain) with the domain model and REMA 1000's offers flowing through it via the Tjek API.

**Tasks:**

1. Scaffold SolidStart natively in a **new repo** (this repo, `grocery-price-watcher-research`, is research-only): `pnpm create solid@latest` in `/root/price-watcher`, TypeScript, **`with-tailwindcss` template** (Nick's styling choice — get it at scaffold, don't add later). Then layer Vite+ in as the unified toolchain via `vp migrate` (NOT as the scaffold — SolidStart has no Vite+-native scaffold; `vp add` only installs packages, it doesn't wire the framework). Use `vp` commands (dev/check/test/build) going forward. Postgres via Kysely.
   - ✅ **DONE (2026-08-11):** scaffolded (SolidStart 2 + Tailwind 4 + TS, `with-tailwindcss` template) and pushed as `init`; `vp migrate` applied and pushed as `Migrate to viteplus.dev toolchain`. Vite+ wraps solidStart/tailwind/nitro in `lazyPlugins()`; scripts are now `vp dev/build/preview`; pnpm pinned to 11.21.0; AGENTS.md + pre-commit hook generated.
   - ⏳ **Pending local verification (Nick's machine, not VPS):** run `vp install`, then `vp check` and `vp build` to confirm it compiles — the migration "looks" structurally correct but hasn't been build-verified here.
   - ⏳ **Open cleanup:** (a) rename package from `example-with-tailwindcss` → `price-watcher`; (b) confirm Node `>=24` constraint matches dev machine.
2. Models (Kysely schema + migrations): `Chain`, `Store` (address, lat/lon), `Product` (name, brand, EAN when known), `Offer` (product_id, store_id, price, unit_price, valid_from, valid_to, source, trust_tier, raw_url), `List`, `ListItem`, later `User`. **Add an internal/publishable flag (or split tables) to enforce the Data & legal boundary — feed rows are internal, crowd/receipt rows are publishable.**
3. **Tjek ingestion worker** (REMA first, dealer `11deC`): `GET /v2/catalogs?dealer_id=…` → `GET /v2/offers/search?catalog_id=…` → upsert `Offer` records. Idempotent (re-running the same week doesn't duplicate). Use `run_from`/`run_till` from each catalog as the truth, not a fixed weekday.
4. **Start weekly capture now:** node-cron/BullMQ job runs the collector every ~6h (cheap, ≪1 req/s) to build `PricePoint` history from day one — the when-to-buy verdict (Phase 8) and Omnibus compliance need history _before_ the feature ships. Never backfill a graph you forgot to collect.
5. Basic UI: offers index (filter by chain), product page, store page.
6. Seed with REMA's data for the current week.

### What to code — Phase 1 (the concrete spec)

Ground truth for the Tjek offer shape (verified from `research/snapshot/REMA1000.offers.json`): an offer has `heading` (name), `description`, `catalog_page`, `pricing.price` / `pricing.pre_price` / `pricing.currency`, a nested `quantity` block (`unit.symbol` = g/kg/l/stk, `size.from`/`size.to` grams, `pieces.from`/`pieces.to`/`pieces.max`), `images` (thumb/view/zoom URLs), `run_from`/`run_till`/`publish` ISO timestamps, `catalog_id`, and `dealer_id`. Use these exact field paths when mapping to the DB.

**Files to create (SolidStart 2 layout):**

| Path                             | What it does                                                                                                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/db/schema.ts`               | Kysely `Database` interface — every table's row type (the single source of truth for column types)                                                                   |
| `src/db/migrations/0001_init.ts` | Kysely migration: create tables `chain`, `store`, `product`, `offer`, `price_point`, `list`, `list_item`                                                             |
| `src/db/client.ts`               | Kysely `Kysely<Database>` instance (one export; picks up `DATABASE_URL`)                                                                                             |
| `src/lib/tjek.ts`                | Tjek API client — typed fetch wrappers for `/v2/dealers`, `/v2/catalogs`, `/v2/offers/search`, `/v2/catalogs/{id}/download`, plus TS interfaces for the API payloads |
| `src/lib/tjek-ingest.ts`         | The ingestion function: dealer → catalogs → offers → normalize → upsert into `offer` + `price_point`. Idempotent.                                                    |
| `src/routes/index.tsx`           | Home: offers index (filter by chain)                                                                                                                                 |
| `src/routes/products/[id].tsx`   | Product page (from `offer` → `product` link)                                                                                                                         |
| `src/routes/stores/[id].tsx`     | Store page (its current offers)                                                                                                                                      |
| `src/server/ingest-scheduler.ts` | node-cron/BullMQ job — runs ingest on a ~6h cadence                                                                                                                  |

**Table schemas (columns, Kysely row types):**

```ts
// chain
id: string (PK, slug e.g. "rema1000"); name: string; tjek_dealer_id: string; website: string|null; logo_url: string|null

// store
id: string (PK, uuid); chain_id: FK chain.id; name: string; address: string|null; city: string|null; zip: string|null; lat: number|null; lon: number|null

// product  (normalized product identity across chains)
id: string (PK, uuid); name: string; brand: string|null; ean: string|null; unit: string|null; size_grams: number|null
  // NOTE: product identity is hard in v1 — start by creating one product per unique (heading, dealer) pair,
  // refined by Phase 2 matching. Don't over-engineer dedup now.

// offer  (one row per catalog offer)
id: string (PK, uuid); product_id: FK product.id; store_id: FK store.id (nullable until stores exist)
catalog_id: string; dealer_id: string; heading: string; description: string|null; catalog_page: number|null
price: numeric; pre_price: numeric|null; currency: string
unit: string|null; size_from: number|null; size_to: number|null; pieces_from: number|null; pieces_max: number|null
image_url: string|null
valid_from: timestamptz; valid_to: timestamptz; published_at: timestamptz|null
source: string ('tjek'|'crowd'|'receipt'); trust_tier: string ('official'|'community'|'single')
internal: boolean  // true for feed rows (NOT publishable); false for crowd/receipt rows — the legal-boundary flag
raw_json: jsonb   // keep the full Tjek payload for debugging/reconciliation
created_at: timestamptz; updated_at: timestamptz

// price_point  (history for the when-to-buy verdict)
id: string (PK); offer_id: FK offer.id; product_id: FK product.id; store_id: FK store.id
price: numeric; currency: string; observed_at: timestamptz  // dedupe on (offer_id, price, observed_at)

// list / list_item  (Phase 4, but create the tables now so the schema is stable)
// list: id, user_id (nullable until auth), name, kind ('recipe'|'cleaning'|'custom'), template_id nullable
// list_item: id, list_id FK, product_id FK nullable, free_text, quantity, unit
```

**The ingestion flow (write this once, reuse for all chains in Phase 2):**

```
ingestChain(dealerId):
  1. GET /v2/catalogs?dealer_id={dealerId}   → catalogs[]
  2. filter: only catalogs with offer_count > 0 (skip editorial/seasonal zero-offer catalogs)
  3. for each catalog: GET /v2/offers/search?query=*&catalog_id={id}&offset={n}&limit=100  (page until <100)
  4. for each offer: map to a row using the field paths above (heading→product name, pricing.price→price, run_from/run_till→valid_from/valid_to)
  5. upsert offer by natural key (dealer_id + catalog_id + tjek offer id) — re-running the same week must NOT duplicate
  6. write a price_point per offer (this is the history that starts accruing now)
  7. source='tjek', trust_tier='official', internal=true (feed rows are internal-only per the legal boundary)
```

**Idempotency rule:** key offers on the Tjek offer `id` (the `ern:offer:...` / short `id` field) so re-running a week inserts nothing new. Verify by running ingest twice and asserting identical offer counts (that's the Phase 1 verification check).

**UI (Tailwind, minimal but real):**

- Home: list current offers, a `<select>` filter for chain (populate from `chain` table), show name + price + image thumb.
- Product page: the offer's fields + a tiny 30-day price history line (from `price_point`) once data exists.
- Store page: that store's current offers.
- Keep it server-rendered with SolidStart `createAsync` + Kysely queries — no client state yet.

**Env: `DATABASE_URL`** (Postgres connection string) in `.env`. Add `TJEK_BASE_URL=https://squid-api.tjek.com` too (override-able, but it's the one known host).

**What NOT to build in Phase 1:** stores-geocoding, product dedup across chains, auth, the madplan, travel cost, receipts. Those are later phases — resist the temptation. The only cross-chain concern now is the `internal`/publishable flag.

**Verification:**

- [ ] Test suite green (Vitest) with schema validations (price ≥ 0, valid_from < valid_to)
- [ ] Ingestion worker run twice produces identical offer counts (idempotency)
- [ ] A store page shows its current offers
- [ ] Weekly capture cron has run ≥3 times and `PricePoint` history is accumulating

---

## Phase 2 — Full Ingestion (1–2 weeks)

**Objective:** All viable chains, refreshed weekly on schedule.

**Tasks:**

1. Chain config (data, not per-chain scrapers — they all share the Tjek API): a `chains` table/config listing dealer_id per chain, which catalogs to ingest, and run-window handling. One generic Tjek worker drives all of them. (Coop banners, SPAR, MENY are drop-ins via the same worker.)
2. Weekly cron (publish times vary Thu/Fri/Wed — poll on `run_from`/`run_till`, plus the ~6h capture from Phase 1) → node-cron/BullMQ job per chain → upsert offers, expire old ones (`valid_to`).
3. Product matching: normalize names/brands so the same product across chains is one `Product` (start simple: exact-name + brand match; fuzzy later). REMA `get_offer_products` RPC (embedded api_key) gives article numbers for receipt matching.
4. Unit-price handling: kg/liter normalization (Rema sells 250g, Bilka sells 500g — the basket math dies without this).
5. **Record price history from day one:** every upsert writes a `PricePoint` (product, store, price, observed_at) — already started in Phase 1.

**Verification:**

- [ ] Chain config drives all adapters (no per-chain code)
- [ ] Weekly cron runs unattended for one full week
- [ ] Same product across 2+ chains links to one `Product`

---

## Phase 3 — Receipt Scanning + Baseline Prices (2–3 weeks)

**Objective:** Solve the baseline-price gap (Open Question #1) with the highest-quality crowd data there is: actual receipts. Moved early because it unblocks the basket math.

**Tasks:**

1. Upload flow: user photographs a supermarket receipt (responsive web, no app needed) → upload → OCR → line-item parse → prices flow into the data layer.
   - OCR: Tesseract with Danish language data first (free, runs on the VPS); upgrade to a hosted vision model only if accuracy hurts. I already have OCR tooling — spike on 10 real Danish receipts in Phase 0 to confirm line-item extraction works.
2. Normalize the receipt: store, date, line items (product, quantity, unit, price, total). Trust tier: receipts are ground truth — the highest-quality crowd data available, no guessing.
3. Baseline price table: `PricePoint`-style records (product, store, price, observed_at) separate from `Offer`. Basket math uses these for non-offer items (Phase 4).
4. Per-user spending view: "here's what you spent, by store, this month" — the receipt becomes a personal spending tracker, which is the retention hook that makes people keep uploading.
5. GDPR: receipt images are personal data — store them encrypted and short-lived (delete after parse, keep only the extracted numbers), and be explicit in the privacy policy. Never sell or expose purchase history tied to identity.
6. Gamification: points per accepted receipt, streak bonuses — ties into the existing trust-tier/gamification system.

**Verification:**

- [ ] 10 test Danish receipts parse to ≥90% correct line items (spike in Phase 0)
- [ ] Baseline prices appear on product pages and are visually distinguished from offers
- [ ] Receipt image deleted after parse; extracted data anonymized

---

## Phase 4 — Lists + Basket Math (2–3 weeks)

**Objective:** The core product — "where do I shop this week?"

**Tasks:**

1. CRUD for lists (`List`, `ListItem`): item = product or free-text with quantity ("spaghetti 500g ×2").
2. Recipe import: paste a recipe → ingredient list → matched products (start with manual mapping UI, not AI parsing).
   2b. **Templates (onboarding feature, NOT a storage optimization):** `ListTemplate` + `ListTemplateItem` models; "Use template" clones rows into the user's own `List` in one transaction (templates read-only, never shared live). Template items reference _products_ so basket math works, free-text fallback with suggested match. Seed 5–10 curated Danish templates (lasagna, frikadeller + kartofler, taco-fredag, kødsovs, cleaning cupboard, student-budget). Empty state shows templates + "start blank list". Maintenance cost is editorial (keep product mappings valid), not technical.
3. Basket cost per store: sum of current offers for matched items; items without an offer fall back to a stored baseline price (from Phase 3 receipts).
4. Store comparison view: table of stores, basket total, savings vs. most expensive.
5. **Weekly madplan with budget:** "plan my week for under 500 kr" — user picks a budget and number of days; the app assembles a week of meals from templates (Phase 4 task 2b) and picks the cheapest store for the whole basket. Output: a shareable weekly plan (meals, basket, store, total) that respects the budget cap. This is the culturally native Danish feature and your screenshot-for-distribution moment.
   - Constraint solver starts simple: greedy fill from templates by budget, then cheapest-store assignment. No linear programming in v1.
   - Content engine: a weekly "madplan for 500 kr" post on the blog is repeatable SEO/shareable content that doubles as dogfooding.

**Verification:**

- [ ] A 10-item shopping list produces a store ranking
- [ ] Offer-only items and baseline items are visibly distinguished in the total

---

## Phase 5 — Travel Cost ("is it worth the detour?") (1–2 weeks)

**Objective:** Add the honest math from the fuel discussion.

**Tasks:**

1. Store geocoding: lat/lon for every store (Nominatim via the maps skill, or store pages).
2. Routing: OSRM driving distance from user's address (saved per user; privacy: only used for distance).
3. Fuel: daily national-average price fetch (single cron; source TBD in Phase 0 — e.g., OK.dk daily page).
4. Car profile per user: fuel type (petrol/diesel/EV), km/l or kWh/km, home vs public charging for EV.
5. Show per store: `basket + round-trip fuel cost`, and a verdict line: "Føtex is 30 kr cheaper but costs 12 kr extra in fuel — net win 18 kr."

**Verification:**

- [ ] Distance for a known route matches Google Maps within ~10%
- [ ] Fuel math unit-tested for petrol, diesel, EV-home, EV-public
- [ ] Verdict line appears on store comparison

---

## Phase 6 — Crowd Data + Trust Tiers (2–3 weeks)

**Objective:** The differentiator — shelf reality the flyers can't cover.

**Tasks:**

1. User accounts (email + magic link or Devise; keep it boring).
2. Report a price: pick store + product, enter price, optional photo. Timestamped.
3. Trust tiers (GasBuddy model):
   - **Official** — green badge, chain feed or verified partner
   - **Community** — yellow, 3+ independent reports agree within tolerance
   - **Single report** — grey, "user-reported", stale after 24h
   - Staleness everywhere: "2 days old" shown as text
4. Gamification: points per verified report, simple leaderboard.
5. Moderation: report button, auto-expiry, ignore-list for chronic spammers.

**Verification:**

- [ ] Same price reported 3× by different users flips to Community tier
- [ ] A single stale report is visually distinguished and expires
- [ ] Spam report is surfaced to moderation and can be hidden

---

## Phase 7 — Monetization + Launch (ongoing)

**Objective:** Make money without a sales team.

**Tasks:**

1. Join Partner-ads and/or Tradetracker (Danish affiliate networks).
2. Outbound affiliate links on product/store pages → online groceries (nemlig.com, BilkaToGo) and recipe content.
3. Compliance pass: EU Omnibus 30-day rule — label your own price comparisons correctly; never call a crowd price a "discount"; publish a privacy policy (GDPR).
4. Launch: blog post on nicktriez.com, x.com thread, submit to Danish tech/price-watch communities (Reddit r/Denmark, Facebook groups that ask for exactly this).
5. Measure: which lists get used, which stores win, affiliate conversion.

**Verification:**

- [ ] Affiliate links live and tracked
- [ ] Compliance labels correct (no "discount" claims on crowd data)
- [ ] Launch post published in the x.com window (Monday ~17:00 CET)

---

## Phase 8 — Agent Layer (differentiator, after launch)

**Objective:** The thing incumbents don't have — proactive alerts.

**Tasks:**

1. Watchlists: "tell me when coffee drops under 40 kr" — product + threshold.
2. Alert delivery: email first (boring, reliable), Signal later (Hermes gateway already exists for this).
3. Price history graph per product (30-day — doubles as the Omnibus compliance context).
4. **"Is this actually a good price?" verdict:** every product page shows current price vs. its own 30-day history — "12% below the 3-month average, good buy" or "10 kr cheaper two weeks ago, wait." The when-to-buy layer PriceRunner doesn't have. Needs `PricePoint` history, which is collected from day one (Phase 2 task 5).
5. **Weekly digest email:** "Your basket was 38 kr more expensive this week. Coffee is down 6 kr at Rema. Your lasagna template is cheapest at Netto right now." Retention + affiliate clicks in one cron job. Requires lists (Phase 4) and watchlists (this phase).

**Verification:**

- [ ] Watch triggers exactly once per threshold crossing, never repeatedly (cooldown)
- [ ] Alert email contains product, price, store, timestamp, link
- [ ] Verdict line is deterministic from stored history (unit-tested with a synthetic PricePoint series)
- [ ] Digest sends weekly with correct basket delta vs. previous week

---

## Phase 9 — Tjek-Independent Ingestion (CONDITIONAL — only on traction)

**Gate:** NOT build-now. Only start this when the Tjek feed is load-bearing **and** the project hits **M3 (Traction gate): ≥5,000 weekly-active users, ≥500 receipts/week, organic growth without paid spend** (see Success Metrics above). Until M3, the crowd/receipt layer (Phase 3) is the hedge. YAGNI — do not build redundancy to protect a success that hasn't happened yet.

**If Tjek cuts us off BEFORE this phase (the timing gap):** surviving a cutoff ≠ having an independent API. The survival net is the crowd/receipt layer (Phase 3) — Tjek-independent by construction. A cutoff degrades us to a crowd-only site; we don't die. The doomsday (cutoff with an _empty_ crowd layer) is largely self-preventing: Tjek cuts us because we're a threat, being a threat means users, and users fill the crowd layer. Three rules make even the worst case survivable: (1) **never call Tjek at request time** — it's background-refresh only, the site serves from our DB, so a cutoff is an inconvenience not an outage; (2) **capture history aggressively while we have access** — every `PricePoint` banked now is a durable asset that survives a cutoff; (3) **public value must never depend on live Tjek reads.** Worst realistic case (very early cutoff, thin crowd): pivot to crowd-first — still a real product (GasBuddy/Matpriskollen model).

**Objective:** If Tjek gates/cuts the feed the moment we become a threat, the site must degrade, not die. This phase builds independent ingestion paths so a Tjek cutoff isn't fatal. **It also produces the sellable/leasable asset:** the Tjek-independent ingestion API is the only part of the stack that can be exported to another country (the Tjek-dependent Phases 1–8 are internal-only). So this phase has two payoffs — resilience + the export product.

**What it is NOT:** a "build our own Tjek-like API." That's a B2B sales problem — getting retailers to publish to _us_ instead of Tjek requires contracts and trust, not code. You cannot code your way into retailers feeding your platform. Don't mistake this phase for that.

**Also NOT a feed destination / "drop-in API retailers connect to alongside Tjek."** That's a separate long-term ambition — becoming a distribution channel retailers publish to — and it is NOT this phase. It's gated on having an audience first (retailers dual-publish for traffic, and we have none until we're a threat) and is unlocked by the Phase 7 affiliate/partnership feed deals, not by new infrastructure. Phase 9 is purely about us reading the chains' own surfaces so we stop depending on Tjek's single feed. The marketplace/platform ambition is downstream of real traction; don't build either side of it before there's an audience.

**Tasks (harder than they look — most chains' own surfaces are ALSO Tjek white-label viewers):**

1. Salling Group (`api.sallinggroup.com/v1/ecommerce/{site}`): extract bearer token from frontend JS bundle; map the routes that give food/nonfood prices independently of Tjek.
2. Lidl: Schwarz `imgproxy.leaflets.schwarz` PNG pages are image-only — this path is OCR territory (Tesseract, already installed). Highest effort, lowest priority.
3. REMA / Coop: confirm whether their own surfaces expose anything Tjek-independent; document what's genuinely available.
4. Realistic goal: cover Salling (largest) + 1–2 others independently, so a Tjek cutoff leaves a degraded-but-alive site. Full cover is the crowd/receipt layer, not this phase.

**Verification:**

- [ ] Salling prices retrievable without any Tjek endpoint
- [ ] ≥2 chains have a Tjek-independent path
- [ ] Simulated Tjek outage (kill the worker) leaves the site serving crowd+receipt data + the independent paths

---

## Explicitly NOT doing (YAGNI)

- **White-label / multi-country architecture** — keep the domain model country-neutral, build nothing else for it
- **Paper catalogue scanning by users** — the stores already digitize flyers; crowd value is shelf prices, not flyer OCR
- **Building our own fuel-price API or scraping 2,100 stations** — we buy one daily number
- **AI recipe parsing in v1** — manual mapping first, automate later
- **Mobile apps** — responsive web first
- **Deals feed / "best deals this week"** — competitive DK deals communities already exist; revisit only as a byproduct of data we already collect
- **Coupon-code discovery** — Honey's graveyard; affiliate attribution games are a trap
- **Delivery-slot alerts for online groceries** — niche, partner-dependent, low moat

## Open Questions

1. **Baseline (non-offer) prices:** resolved by Phase 3 receipts — actual purchases give store-level regular prices. Remaining gap: products nobody has receipted yet. Fallback options to probe: chain sites' regular product pages, or start basket math on offer+receipt items only.
2. **eTilbudsavis:** ✅ resolved (Phase 0) — no own catalogs; it's a thin viewer over the same Tjek feed. Not depended on. Legal: Tjek ToS §8.6 (no AI/ML training) + paid "Integration" licensing — see Data & legal boundary note.
3. **REMA 1000:** ✅ resolved (Phase 0) — publishes through Tjek like the rest (dealer `11deC`, 100% coverage, embedded api_key unlocks `get_offer_products` for receipt matching). The "no traditional tilbudsavis" concern is moot.
4. **Fuel source:** which page to fetch the national average from, and how often.

## Risks

| Risk                                              | Mitigation                                                                                                                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tjek feed disappears / gates auth                 | Low-frequency capture keeps us under radars; per-chain own surfaces documented as fallback in `research/notes/`; crowd + receipts are independent data                                           |
| Retailer / Tjek ToS (AI training, redistribution) | Data & legal boundary enforced in the model (feed = internal, crowd = publishable); no AI/ML training on feed; no GTM built on reselling feed; seek Integration agreement before expanding reuse |
| eTilbudsavis incumbent                            | Differentiate on baskets + travel cost + crowd shelf data — not on flyer browsing; eTilbudsavis has no own catalogs (thin viewer over same feed)                                                 |
| Scope creep                                       | The NOT-doing list is enforced; ship phases in order, launch after Phase 7                                                                                                                       |
| Solo momentum                                     | Launch a usable MVP (Phases 1–4) before building crowd/travel — real users before polish                                                                                                         |
