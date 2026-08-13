# Task 026 — Fuel Price (daily national-average fetch)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 5 (Task 3)

## Objective

Fetch a **daily national-average fuel price** (petrol, diesel, and an EV electricity rate) so the travel-cost math has a number to multiply against. This is a **single daily cron job** — one price for the whole country, updated once a day. Not per-station, not per-user.

## Context

The fuel math (Task 028) needs a price per litre (petrol/diesel) and a rate per kWh (EV). A single national average is enough — the plan explicitly says "fuel via a single daily national-average price." Precision per station is out of scope and would be a maintenance nightmare for marginal benefit.

**Sequencing:** depends on nothing in Phase 5. Feeds Task 028's math.

## What to build

1. **Fuel price source** — a daily national-average for:
   - **Petrol** (kr/l)
   - **Diesel** (kr/l)
   - **EV charging** (kr/kWh) — a reasonable national average; may need a different source than petrol
   - The plan suggests OK.dk's daily page as a candidate; confirm it gives a national average (not per-station). Document whatever source is used and its URL.

2. **Single daily cron** — one node-cron job (matching the existing ingestion scheduler pattern from Task 005) that fetches the prices once/day, stores them timestamped in a `fuel_price` table (fuel_type, price, observed_at). History matters — it lets you show "price trend" and keeps the data honest.

3. **Idempotent + honest** — if today's fetch fails, keep yesterday's price and mark it stale rather than fabricating a number. One bad fetch must not silently drop to zero or an old guess.

4. **Source config** — the source URL/parser is config-driven (like the chains config from Phase 2), so it can be fixed if the source changes without a code deploy.

## Important

- **Single national average, once a day** — the plan is explicit. Do NOT build per-station fuel prices or real-time tracking.
- **EV needs a kWh rate too** — don't forget the electricity price; Task 027 (car profile) has an EV path that needs it.
- **Document the source** — URL, what it returns, and the fallback. This is a live external dependency; it will break and someone (future-you) needs to know where to look.
- **Timestamped history, honest staleness** — never fabricate today's price if the fetch fails.
- **Don't build the fuel math or verdict here** — that's Task 028. This is the price feed.

## Acceptance criteria

- [ ] Daily cron fetches national-average petrol, diesel, and EV kWh prices
- [ ] Prices stored timestamped in a `fuel_price` table (history preserved)
- [ ] Failed fetch keeps yesterday's price and marks it stale (never fabricates)
- [ ] Source URL/parser is config-driven and documented
- [ ] `vp check` + `vp test` pass
