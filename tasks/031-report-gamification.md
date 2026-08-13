# Task 031 — Crowd-Report Gamification + Leaderboard

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 6 (Task 4)

## Objective

Reward users for **verified** crowd price reports (Task 029) — points per report that reaches a trust tier, with a simple leaderboard. This is the incentive that makes the crowd-data moat compound: the more reliable a user's reports, the more they're worth.

## Context

Receipt gamification (Task 016) already rewards uploads. This extends the same idea to **crowd reports** — but with a crucial difference: **points only for reports that earn a trust tier**, not for every report submitted. A single spam report is worth nothing; a report that agrees with 2 others and flips to Community is worth something. This aligns incentives with data quality.

**Sequencing:** depends on crowd reports (Task 029) + the trust-tier system (Task 030) + the existing user-points infrastructure (Task 016's `user.points`).

## What to build

1. **Award logic (pure, testable)** — points for a crowd report:
   - **Single report submitted** → small/no base (don't reward spam)
   - **Report flips to Community** (agrees with 2+ others within tolerance) → meaningful points
   - Reuse the pattern from Task 016: award **once per report**, upgrade-only on tier change (a report that later flips to Community upgrades points, never re-awards)
   - Make the exact values config (like `BASE_POINTS`/`MAX_CLEAN_BONUS` in Task 016)

2. **Leaderboard** — a simple page (e.g. `src/routes/leaderboard.tsx`) ranking users by total points (receipt + crowd-report points combined). Boring: a top-N list of name/points. No avatars, no tiers-of-leaderboard.

3. **Anti-gaming parity with Task 016** — the same rules that protected receipt points must apply here:
   - **Points once per report** — a user can't farm points by re-reporting the same (store, product, price)
   - **Upgrade-only on tier change** — delta between new and already-awarded points, never a full re-award
   - **Independent users count** — 3 reports by the _same_ user don't make Community (that's Task 030's rule); the award must not reward self-agreement

## Important

- **Points for verified, not spam** — the whole point is rewarding _quality_. Don't give a user points for a report that's immediately contradicted or garbage. Align the award with the trust tier.
- **Reuse Task 016's award pattern** — once-per-report, upgrade-only delta. Don't reinvent the anti-gaming logic.
- **Simple leaderboard** — top-N by points, no bloat. This is a retention garnish, not a feature.
- **Don't build moderation or ignore-lists here** — that's Task 032.
- **Combine with receipt points** — one total per user (receipts + reports), not two separate leaderboards.

## Acceptance criteria

- [ ] Pure award logic: points for a report that earns a trust tier, minimal/none for unverified
- [ ] Award once per report; upgrade-only on tier change (delta, never re-award)
- [ ] Self-agreement doesn't game the system (3 reports by one user ≠ Community, no bonus)
- [ ] A simple leaderboard ranks users by combined (receipt + crowd) points
- [ ] Award values are config-driven
- [ ] `vp check` + `vp test` pass
