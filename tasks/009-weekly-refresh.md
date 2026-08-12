# Task 009 — Weekly Refresh Cron (all chains)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 2 (Task 2) + `docs/reference/chains.md` (cadence)

## Objective

The Phase 1 scheduler runs REMA every ~6h. This task generalizes it to **all chains** and handles the **weekly window expiry** correctly — old offers should stop being "current" when their `valid_to` passes.

## Cadence reality (from research)

- Publish windows are **Thu/Fri (mostly), 365 on Wed**, published **05:00–08:00 UTC**.
- The offers API serves **only the current window** — there's no history endpoint.
- Each offer carries its own `run_from`/`run_till` — the offers API already only returns current-window data.

## What to build

1. **Generalize the scheduler** — replace the REMA-only call with `ingestAllChains()` (Task 006) so every chain is captured on the cadence.
2. **Handle window expiry** — offers whose `valid_to < now()` should no longer be served as "current." Two options:
   - The queries already filter `valid_to >= now()` — verify that holds for all chains.
   - Add an explicit **expiry step**: mark/remove offers past `valid_to` so the DB doesn't accumulate stale "current" offers. Prefer soft-expiry (keep rows for history; the query filter handles currency).
3. **Per-chain scheduling** — because 365 publishes Wed, and the rest Thu/Fri, consider a schedule that runs all chains on a ~6h cadence anyway (the ~6h poll naturally catches each chain's publish window within hours). Simpler than per-chain cron. Confirm the ~6h cadence catches Wed + Thu + Fri publishes.
4. **Overlap guard** — keep the existing in-memory lock so two runs don't collide (already in the Phase 1 scheduler).

## Important

- **History preservation:** do NOT hard-delete offers. The `price_point` history (Phase 1) and future when-to-buy (Phase 8) need old data. Expire = stop serving as current, not delete.
- The existing `runOnce` overlap guard should still hold.
- `DISABLE_INGEST_SCHEDULER=1` must still work (test/CI).

## Acceptance criteria

- [ ] Scheduler ingests ALL chains (not just REMA) on the ~6h cadence
- [ ] Offers past `valid_to` are not served as "current" (queries filter holds)
- [ ] Old offers/price history are preserved, not deleted
- [ ] The ~6h cadence catches Wed (365), Thu, and Fri publishes within a day
- [ ] Overlap guard + disable env still work

## Testing approach

- This is **scheduling/integration** — verify by letting it run on the laptop and observing logs + offer counts over a day. NOT a unit test.
- The overlap-guard logic (`running` boolean) and the disable-env branch can be unit-tested if extracted to pure functions, but the cadence itself is a live behavior.
- Confirm expired offers stop being "current" with a `psql` query (filter on `valid_to >= now()`), not a DB unit test.
