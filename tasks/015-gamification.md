# Task 015 — Receipt Gamification (points + streaks)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 3 (Task 7) + `src/db/schema.ts`

## Objective

Reward users for uploading receipts — **points per accepted receipt, streak bonuses** — to drive the retention loop that makes receipts compound. Depends on identity (Task 010) and the upload flow (Task 012).

## Context

Phase 3's gamification ties into the trust-tier/gamification system. The goal is simple: make uploading receipts feel rewarding so people keep doing it. Keep it boring — points + a visible streak, not a complex game economy.

## What to build

1. **A `user_stat` / `user_points` model** (or columns on `user`):
   - `points` — integer, running total
   - `receipt_count` — how many receipts uploaded
   - `current_streak` / `last_receipt_date` — for streak bonuses
     (Prefer a small table or columns; don't over-engineer.)

2. **Award logic** — on each successful receipt parse (Task 012):
   - Base points per accepted receipt (e.g. 10)
   - **Bonus for clean parses** — more points for high-confidence receipts (incentivizes good photos)
   - **Streak bonus** — consecutive days with a receipt (e.g. +5 for day 2+, resets if a day is missed)

3. **Visible feedback** — after upload, show "you earned X points" with the streak. This is the reinforcement that drives repeat uploads.

## Important

- **Integrates with the existing trust system** — a low-confidence receipt earns fewer points than a clean one. Don't reward garbage uploads equally.
- **Points awarded ONCE per physical receipt** — pairs with Task 012's dedup. Re-uploading the same receipt (better/worse/accidental) must NOT re-award points. A better re-scan may _upgrade_ the points if the improved parse crosses a confidence threshold, but the user doesn't get the base award twice.
- **Simple scoring** — don't build a full economy (levels, badges, leaderboards). Points + streak is enough for Phase 3. A leaderboard could come later if the plan calls for it.
- **Boring = good.** No anti-gaming complexity beyond the basics. You can refine later if abuse appears.

## Acceptance criteria

- [ ] User has a points total + receipt count + streak
- [ ] A successful upload awards base points + clean-parse bonus + streak bonus
- [ ] Streak resets if a day is missed
- [ ] Upload confirmation shows the points earned + current streak
- [ ] Low-confidence receipts earn fewer points than clean ones
- [ ] `vp check` + `vp test` pass
