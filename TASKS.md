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

**Note:** Tasks 033/034 are TEMPORARY — remove the dev links before launch (Phase 10).

## Phase 7a — Usability + Basic Design (the last coding hurdle, before beta)

The last coding work before anyone is invited. **Task 042 + 043 must pass before any invite** — this is the difference between measuring retention and measuring usability.

| #    | Task                                                     | Status | Depends on                                                                                                                                                                                                                                                          |
| ---- | -------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 035  | Usability precondition: sign-in + 3 core flows navigable | ✅     | OpenCode (cold-user browser walk: sign-in → build list → upload reachable from home/nav/lists → compare from list; all entry points + CTAs in plain Danish; upload was unreachable — added nav link + home CTAs + lists link)                                       | — (GATES the beta invites)                                                                                                                                         |
| 036  | Basic design + correct route linking (real launch nav)   | ✅     | OpenCode (browser walk: nav Forside/Tilbud/Lister/Upload kvittering/Rapporter en pris/Om/Log ind-ud + footer secondary links all resolve, no dead links; offers moved to /offers, / = minimal landing for 037; dev links settings/madplan/spending moved to footer) | 035                                                                                                                                                                |
| 037  | Landing page (root; signed-in reroutes to /offers)       | ✅     | OpenCode (landing content built + verified; the signed-in-reroute-to-/offers was **reversed → 037b**; final: / is the same landing for everyone, Forside → / for all)                                                                                               | 036                                                                                                                                                                |
| 037b | Remove signed-in reroute — / is the same landing for all | ✅     | OpenCode (browser E2E: signed-in / stays on the landing, no redirect; no getCurrentUser in the route; Nav Forside=/ Tilbud=/offers confirmed; decision reversed 2026-08-14)                                                                                         | 037                                                                                                                                                                |
| 037c | Landing: hide/replace "Log ind" for authenticated users  | ✅     | OpenCode (browser E2E: signed-out sees "Log ind og kom i gang" -> /signin; signed-in sees "Opret indkøbsliste" -> /lists instead, no redirect, same landing otherwise; session via createAsync works because the landing is inside the route Suspense)              | 037b — bug: sign-in CTA shows to authenticated users. Signed-in → signed-in action (default "Opret indkøbsliste" → /lists); no redirect; reuse Nav session pattern |
| 047  | Report page: fix English leakage (Danish)                | ⬜     | — pre-beta fix: /report leaks English (H1 "Report a shelf price", placeholders "Search by store...", "e.g. 12.95"). Translate all copy to Danish.                                                                                                                   |

**Invite model (DECIDED): no invite system.** The magic-link sign-in enforces the closed beta; Nick controls who gets links; `beta.skujeg.dk` is closed by obscurity. No new code.

## Phase 7b — Hosting + Legal (before beta runs)

Two parallel tracks: **deploy** (Ultron's infra — Hetzner CX22 + `beta.skujeg.dk`) and **legal** (privacy policy). Invites wait for BOTH deploy-live AND the privacy policy live.

| #   | Task                                               | Status | Depends on |
| --- | -------------------------------------------------- | ------ | ---------- |
| 038 | Privacy policy + GDPR page (Danish, Nick-approved) | ⬜     | —          |

Deploy (Ultron, not a task file): Hetzner CX22 €3.79/mo, Node ≥24, Postgres, pm2, TLS → `beta.skujeg.dk`.

## Phase 7c — Beta Runs (3 weeks) + Phase 8 — Evaluate

**Operations, not coding** (Nick runs it; agent assists). 7c = invite cohort, seed ≥50 receipts, watch M1, edge-case harvest, feedback thread. 8 = the M1 decision gate: **≥30% return + ≥50 receipts** → success → Phase 9; <30% → do NOT launch, diagnose the retention loop. Tracked here for visibility, no OpenCode tasks.

## Phase 9 — Complete the Design (IF the beta succeeded)

Gated on Phase 8 success. Polish a product you know people return to. **Sequence:** 039 → 040 → then 041/042/043/044 (parallel) → 045 last.

| #   | Task                                          | Status | Depends on        |
| --- | --------------------------------------------- | ------ | ----------------- |
| 039 | Design variants (3 throwaway HTML mockups)    | ⬜     | Nick picks winner |
| 040 | Design system (Tailwind tokens from winner)   | ⬜     | 039               |
| 041 | Branding (Skujeg wordmark, titles, copy tone) | ⬜     | 040               |
| 042 | Screenshot-worthy store comparison + madplan  | ⬜     | 040               |
| 043 | Mobile check: receipt upload flow             | ⬜     | 040               |
| 044 | Honest-UI consistency pass                    | ⬜     | 040               |
| 045 | Danish-consistency pass                       | ⬜     | 040, 044          |

**Run order:** 039 → 040 → then 041/042/043/044 (parallelizable after 040) → 045 last (needs the honest-UI pass done).

## Post-beta / launch improvements (after Phase 8 evaluation)

UX polish that runs AFTER the beta proves the loop. Not beta blockers.

| #   | Task                                                      | Status | Depends on                                                                                             |
| --- | --------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| 046 | Smart auth redirect — return to intended page after login | ⬜     | post-beta (after Phase 8) — shared helper, `next` query param, validated same-origin, no open redirect |

Then: monetization + launch (Phase 10), agent layer (Phase 11), Tjek-independent ingestion (Phase 12, conditional).
