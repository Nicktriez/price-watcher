# Task 029 — Report a Price (crowd report flow)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 6 (Task 2)

## Objective

Let users **report a shelf price** — pick a store + product, enter the price, optionally attach a photo — timestamped. This is the "shelf reality the flyers can't cover": a price someone saw on the shelf today that isn't in any official offer. It feeds the trust-tier system (Task 030), the crowd-data moat, and the gamification (Task 031).

## Context

Receipts (Phase 3) give you _baseline_ prices from what people bought. Crowd reports give you _today's shelf price_ for anything — including items not on offer and not on a receipt. Both are user-generated and Tjek-independent. A report is simpler than a receipt: store + product + price, no OCR.

**Sequencing:** depends on identity (Task 010, signed-in reports), the store catalog (Phase 2, store picker), and the product catalog (Phase 2, product picker). Standalone from receipt/OCR.

## What to build

1. **Report route** (e.g. `src/routes/report.tsx`): signed-in user picks:
   - **Store** (from the store catalog — picker, search by name)
   - **Product** (from the product catalog — picker, search by name; free-text fallback if no product exists yet)
   - **Price** (kr, required)
   - **Optional photo** (evidence; not required — don't block a report on a photo)
   - Timestamped automatically (reported_at = now)

2. **`crowd_report` table** (or extend `price_point` with a crowd source) — store the report with its trust state:
   - store, product, price, reported_at, reporter `user_id`, optional photo path
   - **Never trust-tiered as `official`** — crowd reports are `community`/`single` at best, per the trust model (Task 030)

3. **Honest labeling from the start** — a single report is shown as "user-reported," never as an offer or a discount. (Omnibus: a crowd price is never a "discount.")

4. **Shelf price → data layer** — the report becomes a `price_point`-style record (`source='crowd'`) so basket math and product pages can use it once it passes a trust threshold (Task 030 handles the threshold; this task just records the report).

## Important

- **Photo optional, not required** — don't gate the report on a photo (lowers the barrier; a price + store + product is enough to be useful).
- **Never `official`** — a single crowd report is at best `single`, and its trust status is Task 030's job. Just record it honestly here.
- **Product free-text fallback** — if no product matches, allow a free-text name so the report isn't blocked; it can be linked to a product later.
- **Signed-in only** — reports tie to a `user_id` (needed for gamification + anti-spam). No anonymous reports.
- **Don't build trust tiers, staleness, gamification, or moderation here** — that's Tasks 030/031/032. This is the report input + storage.

## Acceptance criteria

- [ ] Signed-in user can report a price: store + product (or free-text) + price + optional photo
- [ ] Report is timestamped and stored in a `crowd_report`/`price_point` crowd record
- [ ] A single report is labeled "user-reported," never `official`, never a "discount"
- [ ] Photo is optional (report succeeds without one)
- [ ] Report is tied to the reporter's `user_id`
- [ ] `vp check` + `vp test` pass
