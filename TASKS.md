# Task Tracker

Running status of all coding tasks. Updated as tasks are assigned, run, and verified.

**Legend:** ⬜ pending · 🔄 in progress · ✅ verified complete · 🟡 done-in-code, verification pending

## Phase 1 (complete)

| #   | Task                                    | Status | Verified by                                 |
| --- | --------------------------------------- | ------ | ------------------------------------------- |
| 001 | Kysely schema + initial migration       | ✅     | Nick (vp test) + OpenCode idempotency       |
| 002 | Tjek API client (typed)                 | ✅     | reviewed in code                            |
| 003 | Tjek ingestion worker (idempotent)      | ✅     | OpenCode (239/239/239)                      |
| 004 | Basic UI (offers, product, store pages) | ✅     | code review; store page awaits Phase 2 data |
| 005 | Ingestion scheduler (~6h)               | ✅     | scheduler running; history accumulating     |

**Phase 1 status: done.** Tests green (Nick), idempotency confirmed (OpenCode). Store page + cron accumulation pending Phase 2 data / time (non-blocking).

## Phase 2 (current)

| #   | Task                               | Status | Verified by                                                                                           |
| --- | ---------------------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| 006 | Chain config + all-chain ingestion | ✅     | OpenCode (impl reviewed: priority order, error isolation, migration 0005)                             |
| 007 | Unit-price normalization           | ✅     | OpenCode (12 unit tests vs fixtures; 5070/5070 offers populated; migration 0006)                      |
| 008 | Product matching across chains     | ✅     | OpenCode (impl reviewed: pure linkProducts, "3-stjernet pålæg" cross-chain test, idempotent, DB-free) |
| 009 | Weekly refresh cron (all chains)   | ⬜     |                                                                                                       |

## Phase 3+ (not started)

Receipt scanning + baseline prices (Phase 3), lists + basket math (Phase 4), travel cost (Phase 5), crowd data + trust tiers (Phase 6), monetization + launch (Phase 7), agent layer (Phase 8), Tjek-independent ingestion (Phase 9, conditional).
