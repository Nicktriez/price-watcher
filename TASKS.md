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

**Phase 1 status: done.** Tests green (Nick), idempotency confirmed (OpenCode).

## Phase 2 (complete)

| #   | Task                               | Status | Verified by                                                                                                       |
| --- | ---------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| 006 | Chain config + all-chain ingestion | ✅     | OpenCode (impl reviewed: priority order, error isolation, migration 0005)                                         |
| 007 | Unit-price normalization           | ✅     | OpenCode (12 unit tests vs fixtures; 5070/5070 offers populated; migration 0006)                                  |
| 008 | Product matching across chains     | ✅     | OpenCode (impl reviewed: pure linkProducts, "3-stjernet pålæg" cross-chain test, idempotent, DB-free)             |
| 009 | Weekly refresh cron (all chains)   | ✅     | OpenCode (impl reviewed: all-chains 6h cadence, lock + disable-env unit-tested, zero deletes — history preserved) |

**Phase 2 status: done.** Full ingestion pipeline working: all chains config-driven, unit prices normalized, products matched across chains, 6h refresh with history preserved.

## Phase 3 (current)

Identity + receipts + baseline prices. **Identity was moved earlier** (magic-link, no full auth) so receipts can be tied to a user and the spending/gamification retention loop is buildable now.

| #   | Task                                          | Status | Verified by                                                                                                                                          | Depends on    |
| --- | --------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 010 | User identity (magic-link) + receipt schema   | ✅     | OpenCode (browser E2E: code → session cookie → getCurrentUser; schema `\d` verified)                                                                 | —             |
| 011 | Refine OCR recovery classifier (Phase 3 GATE) | ✅     | OpenCode (10 fixtures × both PSM variants; footer filter 10/10 Netto lines; wrapped line-join; crumple flag; honest recovery)                        | 010           |
| 012 | App-side OCR + line-item parser               | ✅     | OpenCode (full OCR run: all 10 receipts store-from-content, totals 390.75/314.9/67.95, Netto footer 11, SPAR wrapped; RUN_OCR_TESTS=1)               | 010, 011      |
| 013 | Signed-in receipt upload + baseline writing   | ✅     | OpenCode (browser E2E: sign-in gate, upload→receipt+items+price_point(source=receipt, trust=community), fingerprint dedup→duplicate, image deleted)  | 010, 011, 012 |
| 014 | Receipt-derived prices on product page        | ✅     | OpenCode (product page shows offers w/ ✓ Official + user-reported w/ ● Community from receipts, honest labels, empty state; browser + psql verified) | 010, 013      |
| 015 | Per-user spending view (retention hook)       | ✅     | OpenCode (browser E2E: total this month, by-store breakdown, recent receipts, upload→spending link, sign-in gate; per-user filter)                   | 010, 013      |
| 016 | Receipt gamification (points + streaks)       | ✅     | OpenCode (browser E2E: 14pts clean-receipt + 13pts lower-recovery, no double-award on dedup, streak recorded/reset; 7 unit tests for award/streak)   | 010, 013      |
| 017 | "Your price vs. average" on scanned receipts  | ✅     | OpenCode (browser E2E: per-line below-average + no-comparison states, overall delta, ownership enforced; real receipt baselines)                     | 010, 013, 014 |

**Run order:** 010 → 011 (gate) → 012 → 013 → then 014/015/016 (parallelizable after 013) + 017 (after 014 provides the baseline). Numbers now match build order.

## Phase 4 (current — next up)

The core product — "where do I shop this week?" Lists + basket math + store ranking + the weekly madplan.

| #   | Task                                          | Status | Verified by                                                                                                          | Depends on     |
| --- | --------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- | -------------- |
| 018 | Lists CRUD (List, ListItem)                   | ✅     | OpenCode (browser E2E: create/rename, 5 free-text + product-linked items, structured qty, reorder, per-user scoping) | 010 (identity) |
| 019 | Recipe import (paste → ingredients → matched) | ✅     | OpenCode (browser E2E: paste→5 ingredients, method/servings dropped, qty prefilled, save-as-list; 10 unit tests)     | 018            |
| 020 | List templates (onboarding)                   | ⬜     |                                                                                                                      | 018, Phase 2   |
| 021 | Basket cost per store (the math)              | ⬜     |                                                                                                                      | 018, Phase 3   |
| 022 | Store comparison view                         | ⬜     |                                                                                                                      | 021            |
| 023 | Weekly madplan with budget                    | ⬜     |                                                                                                                      | 020, 021, 022  |

**Run order:** 018 → 019/020 (parallelizable after 018) → 021 → 022 → 023. 021 is the pure-math core — testable standalone before any UI.

## Phase 5+ (not started)

Travel cost (Phase 5), crowd data + trust tiers (Phase 6), closed beta (Phase 7), monetization + launch (Phase 8), agent layer (Phase 9), Tjek-independent ingestion (Phase 10, conditional).
