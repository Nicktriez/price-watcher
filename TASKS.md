# Task Tracker

Running status of all coding tasks. Updated as tasks are assigned, run, and verified.

**Legend:** ⬜ pending · 🔄 in progress · ✅ verified complete · 🟡 done-in-code, verification pending

## Phase 1 (complete)

| # | Task | Status | Verified by |
| --- | --- | --- | --- |
| 001 | Kysely schema + initial migration | ✅ | Nick (vp test) + OpenCode idempotency |
| 002 | Tjek API client (typed) | ✅ | reviewed in code |
| 003 | Tjek ingestion worker (idempotent) | ✅ | OpenCode (239/239/239) |
| 004 | Basic UI (offers, product, store pages) | ✅ | code review; store page awaits Phase 2 data |
| 005 | Ingestion scheduler (~6h) | ✅ | scheduler running; history accumulating |

**Phase 1 status: done.** Tests green (Nick), idempotency confirmed (OpenCode).

## Phase 2 (complete)

| # | Task | Status | Verified by |
| --- | --- | --- | --- |
| 006 | Chain config + all-chain ingestion | ✅ | OpenCode (impl reviewed: priority order, error isolation, migration 0005) |
| 007 | Unit-price normalization | ✅ | OpenCode (12 unit tests vs fixtures; 5070/5070 offers populated; migration 0006) |
| 008 | Product matching across chains | ✅ | OpenCode (impl reviewed: pure linkProducts, "3-stjernet pålæg" cross-chain test, idempotent, DB-free) |
| 009 | Weekly refresh cron (all chains) | ✅ | OpenCode (impl reviewed: all-chains 6h cadence, lock + disable-env unit-tested, zero deletes — history preserved) |

**Phase 2 status: done.** Full ingestion pipeline working: all chains config-driven, unit prices normalized, products matched across chains, 6h refresh with history preserved.

## Phase 3 (current)

Identity + receipts + baseline prices. **Identity was moved earlier** (magic-link, no full auth) so receipts can be tied to a user and the spending/gamification retention loop is buildable now.

| # | Task | Status | Depends on |
| --- | --- | --- | --- |
| 010 | User identity (magic-link) + receipt schema | ⬜ | — |
| 011 | App-side OCR + line-item parser | ⬜ | 010 |
| 012 | Signed-in receipt upload + baseline writing | ⬜ | 010, 011 |
| 013 | Receipt-derived prices on product page | ⬜ | 010, 012 |
| 014 | Per-user spending view (retention hook) | ⬜ | 010, 012 |
| 015 | Receipt gamification (points + streaks) | ⬜ | 010, 012 |
| 016 | Refine OCR recovery classifier (Phase 3 GATE) | ⬜ | research spike |
| 017 | "Your price vs. average" on scanned receipts | ⬜ | 010, 012, 013 |

**Run order:** 010 → 011 → 012 → then 013/014/015 (parallelizable after 012) + 016 (gate, when ≥10 receipts gathered) + 017 (after 013 provides the baseline).

## Phase 4+ (not started)

Lists + basket math (Phase 4), travel cost (Phase 5), crowd data + trust tiers (Phase 6), monetization + launch (Phase 7), agent layer (Phase 8), Tjek-independent ingestion (Phase 9, conditional).
