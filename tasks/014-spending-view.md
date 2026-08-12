# Task 014 — Per-User Spending View

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 3 (Task 5)

## Objective

The **retention hook**: "here's what you spent, by store, this month" — built from the signed-in user's uploaded receipts. This is the feature that makes people keep uploading receipts, which is the whole moat.

## Context

The plan calls the spending view *"the retention hook that makes people keep uploading."* It depends on identity (Task 010) and uploads (Task 012) — a user's receipts accumulate with `user_id`, and this view shows them the value.

**Only for a signed-in user.** No auth = no spending view.

## What to build

1. **A route** (e.g. `src/routes/spending.tsx`) requiring sign-in — shows the current user's receipts and spend:
   - Total spent this month
   - **By store** (group receipts by `store_name` / store)
   - A list of their recent receipts (date, store, total, item count)
   - Optionally a simple month-to-month comparison

2. **Queries** — extend/add to `src/server/queries.ts`: receipts + totals for a given `user_id`, grouped by store, filtered by month.

3. **Simple, honest UI** — Tailwind, consistent with the rest of the site. This is a personal dashboard, not public data — it must be clearly the *user's own* spending.

## Important

- **Per-user, never cross-user.** Query filters strictly on the session `user_id`. This is personal financial data — a leak here is a serious GDPR problem.
- **Receipts only** — the spending view reflects uploaded receipts, not offers. Don't conflate.
- Keep it simple — a monthly total + by-store breakdown + receipt list is enough. Don't over-build charts/analytics.
- Only a signed-in user sees it. Unauthenticated → redirect to sign-in.

## Acceptance criteria

- [ ] `/spending` (or similar) requires sign-in, redirects otherwise
- [ ] Shows the user's total spend for the current month
- [ ] Breaks spend down by store
- [ ] Lists the user's recent receipts (date, store, total)
- [ ] Strictly per-user — queries filter on session `user_id`, no cross-user data
- [ ] `vp check` + `vp test` pass
