# Task 005 — Ingestion Scheduler (weekly + ~6h capture)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → "What to code — Phase 1" (Task 4 in the plan) + `docs/reference/chains.md` (cadence)

## Objective

Schedule the REMA ingestion so price history accumulates automatically. Two concerns:
1. **~6h capture** — run `ingestChain('11deC')` every ~6h to snapshot `price_point` history (the when-to-buy feature later needs history *before* it ships — never backfill a graph you forgot to collect).
2. **Weekly offer refresh** — the Tjek weekly window changes; polling every ~6h naturally picks up the new week when it's published (early Thursday/Friday morning for REMA).

## Implementation

- Use **node-cron** (simplest) or **BullMQ** if a queue is already wired. Prefer node-cron unless there's a reason for a queue.
- `src/server/ingest-scheduler.ts` — sets up the schedule, calls the Task 003 ingest function.
- Schedule: every 6 hours (`*/6 * * * *`), offset slightly (e.g. `15 */6 * * *` ) so it doesn't fire exactly on the hour alongside anything else.
- Guard against overlapping runs: if a run is already in progress, skip (a simple in-memory lock boolean is enough — don't over-engineer).
- On error: log it, don't crash the process. The next scheduled run retries.

## Environment

- The scheduler should respect a `DISABLE_INGEST_SCHEDULER=1` env guard so it doesn't auto-run in test/CI.
- `DATABASE_URL` and `TJEK_BASE_URL` come from env (Task 001/002).

## Notes

- This runs on the **laptop dev environment** for now (project isn't hosted on the VPS — hosting is a separate Hetzner box, not wired yet). For Phase 1, a local `node` invocation of the scheduler is sufficient; production hosting comes later.
- Don't wire it into the SolidStart server lifecycle in a way that blocks dev — run it as a standalone script (`node src/server/ingest-scheduler.ts` or via a `package.json` script).

## Acceptance criteria

- [ ] Scheduler fires `ingestChain('11deC')` on a ~6h cadence
- [ ] Overlapping runs are skipped (no double-ingest)
- [ ] Errors are logged, not fatal
- [ ] `DISABLE_INGEST_SCHEDULER=1` prevents auto-start (for test/CI)
- [ ] After ~2 runs, `price_point` history is clearly accumulating for REMA offers
