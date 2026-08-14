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

## Phase 4 (complete)

The core product — "where do I shop this week?" Lists + basket math + store ranking + the weekly madplan. **Phase 4 status: done.** M1 loop works end-to-end.

| #   | Task                                          | Status | Verified by                                                                                                                                              | Depends on     |
| --- | --------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 018 | Lists CRUD (List, ListItem)                   | ✅     | OpenCode (browser E2E: create/rename, 5 free-text + product-linked items, structured qty, reorder, per-user scoping)                                     | 010 (identity) |
| 019 | Recipe import (paste → ingredients → matched) | ✅     | OpenCode (browser E2E: paste→5 ingredients, method/servings dropped, qty prefilled, save-as-list; 10 unit tests)                                         | 018            |
| 020 | List templates (onboarding)                   | ✅     | OpenCode (browser E2E: 8 seeded DK templates, Use template clones in one transaction, product-linked + free-text items, template read-only)              | 018, Phase 2   |
| 021 | Basket cost per store (the math)              | ✅     | OpenCode (pure computeBasketCosts: unit-normalized, offer/baseline/no-price split; 5 unit tests incl. 10-item list; real-data run on Kødsovs)            | 018, Phase 3   |
| 022 | Store comparison view                         | ✅     | OpenCode (browser E2E: ranked table cheapest-first, verdict + savings, offer/baseline split, baseline-heavy badge, empty state; flat /compare/:id route) | 021            |
| 023 | Weekly madplan with budget                    | ✅     | OpenCode (greedy assembleMadplan 4 unit tests; browser E2E: 7-day plan under 500 kr, honest under-fit + no-single-store notes, copy button)              | 020, 021, 022  |

**Run order:** 018 → 019/020 (parallelizable after 018) → 021 → 022 → 023. 021 is the pure-math core — testable standalone before any UI.

## Phase 5 (complete)

The differentiator — "is it worth the detour?" Store coordinates, OSRM routing, fuel price, car profile, and the net-win verdict. **Phase 5 status: done.**

| #   | Task                                  | Status | Depends on                                                                                                                                                                                                                         |
| --- | ------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 024 | Store geocoding (lat/lon)             | ✅     | Phase 2 store data                                                                                                                                                                                                                 |
| 025 | OSRM routing + user address           | ✅     | OpenCode (browser E2E: save home address → round-trip km per store on compare, cached per user+store, no-home prompt, privacy note; 4 unit tests)                                                                                  | 024, 010 (identity) |
| 026 | Fuel price (daily national-average)   | ✅     | OpenCode (daily cron 06:30; OK.dk station-average petrol/diesel + Elspot+tariff EV, config fallback; timestamped history, honest failed-fetch; 4 parser tests)                                                                     | —                   |
| 027 | Car profile per user                  | ✅     | OpenCode (browser E2E: fuel type + conditional efficiency/charging fields, labeled default, save/clear per-user; 4 validation tests)                                                                                               | 010 (identity)      |
| 028 | Verdict line (basket + fuel, net win) | ✅     | OpenCode (browser E2E: petrol + EV-public fuel math end-to-end, net-winner verdict in plain Danish, fuel/total columns sorted by total-with-fuel, labeled-default + no-distance honest paths, fuel-price sparklines; 7 unit tests) | 021, 025, 026, 027  |

**Run order:** 024 → 025 → 026 → 027 (025/026/027 parallelizable after 024) → 028 (the verdict, depends on all). 028 is the payoff — pure fuel math, testable standalone.

## Phase 6 (current — next up)

Crowd data + trust tiers — the differentiator. User-reported shelf prices, the GasBuddy trust model, report gamification, and low-touch moderation.

| #    | Task                                                | Status | Depends on                                                                                                                                                                                                                                                                                                                                                                        |
| ---- | --------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 029  | Report a price (store + product + price)            | ✅     | OpenCode (browser E2E: store+product report, free-text fallback, optional photo saved + served, anonymous redirect, stored with user_id + timestamp, "brugerrapporteret/aldrig tilbud" labeling; 5 validation tests)                                                                                                                                                              | 010, Phase 2 catalogs |
| 030  | Trust tiers + staleness (GasBuddy model)            | ✅     | OpenCode (browser E2E: 3 distinct users flip to Community on product page, single report greyed+stale after 24h, age text everywhere, compare uses community crowd price; 17 unit tests: tolerance, same-user-3x stays single, crowd fallback in basket) — **free-text wiring gap → 030b**                                                                                        | 029                   |
| 030b | Wire free-text crowd reports into Community tiering | ✅     | OpenCode (browser E2E: 3 free-text reports with different spellings group to one normalized name → Community on /reported-items; 4 unit tests for computeFreeTextGroups incl. stale single)                                                                                                                                                                                       | 030                   |
| 031  | Crowd-report gamification + leaderboard             | ✅     | OpenCode (E2E: 3 users each report ~20 kr → all flip to Community and each earn 15 pts via re-tier-on-submit; re-report same key → dedup, no double points; leaderboard ranks combined pts; 5 award-logic unit tests; migration 0016 points_awarded + last_awarded_tier)                                                                                                          | 029, 030, 016         |
| 032  | Moderation (report, auto-expiry, ignore-list)       | ✅     | OpenCode (E2E: flag button, 2 distinct flaggers no-op, F1 repeated flag no-op, 3rd distinct flagger hides; 9-day-old single auto-expires hidden + removed from display; admin email-allowlist gate, non-admin sees Not authorized, queue shows hidden/expired + hide/restore/mute; muted reporter's reports excluded; 5 moderation unit tests; migration 0017 flags+status+muted) | 029, 030              |

**Run order:** 029 → 030 → 031/032 (parallelizable after 030). 030 (trust tiers) is the pure-logic core — testable standalone before any UI.

## Dev tasks (next up, outside Phase 6)

Small dev-convenience tasks that unblock testing. Run these before/parallel to the Phase 6 feature work.

| #   | Task                                                      | Status | Depends on                                                                                                                                                                                                           |
| --- | --------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 033 | Temporary navbar dev links (Lists, Settings, Sign in/out) | ✅     | OpenCode (browser E2E: anon shows Lists/Settings/Sign in; signed-in shows Sign out, clicking redirects to / and flips to Sign in; compare page renders — no hydration regression; SSR/client hydrated state matches) | —   |
| 034 | Add Madplan + Spending to navbar (dev links)              | ✅     | OpenCode (browser E2E: nav shows all six feature links; active highlight on /madplan and /spending while signed in; sign in/out unchanged)                                                                           | 033 |

**Note:** Tasks 033/034 are TEMPORARY — remove the dev links before launch (Phase 8).

## Phase 7 (Closed Beta — coding prerequisite)

Phase 7 is mostly operations (recruiting/measurement — Nick's job), but it has **coding prerequisites** that must land BEFORE any invite. Task 042 is the gate; Task 001's `last_active` log is added only if the existing query can't measure "return."

| #   | Task                                                        | Status | Depends on                 |
| --- | ----------------------------------------------------------- | ------ | -------------------------- |
| 042 | Usability precondition: 3 core flows navigable without help | ⬜     | — (GATES the beta invites) |

**Task 042 is the difference between measuring retention and measuring usability.** Nothing is invited until a cold non-technical user can build a list, upload a receipt, and see a store comparison unaided. The Hetzner deploy (Ultron's infra) runs in parallel; invites wait for BOTH deploy-live AND 042 passing.

## Phase 7b (Design Polish — after the beta, before launch)

Design direction + branding. **Sequence matters:** 035 produces the winning visual direction → 036 unifies the codebase around it → 037 branding → then 038/039/040/041. These run AFTER the beta (per the plan: polish a product you know people return to). Note: Phase 7's _coding_ prerequisite (Task 042) is tracked in its own section above.

| #   | Task                                          | Status | Depends on        |
| --- | --------------------------------------------- | ------ | ----------------- |
| 035 | Design variants (3 throwaway HTML mockups)    | ⬜     | Nick picks winner |
| 036 | Design system (Tailwind tokens from winner)   | ⬜     | 035               |
| 037 | Branding (Skujeg wordmark, titles, copy tone) | ⬜     | 036               |
| 038 | Screenshot-worthy store comparison + madplan  | ⬜     | 036               |
| 039 | Mobile check: receipt upload flow             | ⬜     | 036               |
| 040 | Honest-UI consistency pass                    | ⬜     | 036               |
| 041 | Danish-consistency pass                       | ⬜     | 036, 040          |

**Run order:** 035 → 036 → then 037/038/039/040 (parallelizable after 036) → 041 last (needs the honest-UI pass done).

Closed beta (Phase 7), design polish (Phase 7b), monetization + launch (Phase 8), agent layer (Phase 9), Tjek-independent ingestion (Phase 10, conditional).
