# Task 015 — Per-User Spending View

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 3 (Task 5)

## Objective

The **retention hook — and the whole user incentive for scanning receipts**: "here's what you spent, by store, this month" — built from the signed-in user's uploaded receipts. **This is the feature that makes people keep uploading receipts, which is the whole moat.**

## Why this is the onboarding reward, not a garnish

The receipt flow sells itself as _"your free grocery-spending tracker"_ — the crowd-data moat is the invisible byproduct. A user's payoff for photographing a receipt is: they get their spending tracked for free, without typing anything. Without this personal payoff, uploading a receipt is a favor to the platform — and favors don't scale. **Frame and build it as the primary reward, not an add-on.**

## Context

The plan calls the spending view _"the retention hook that makes people keep uploading."_ It depends on identity (Task 010) and uploads (Task 013) — a user's receipts accumulate with `user_id`, and this view shows them the value.

**Only for a signed-in user.** No auth = no spending view.

## What to build

1. **A route** (e.g. `src/routes/spending.tsx`) requiring sign-in — shows the current user's receipts and spend:
   - Total spent this month
   - **By store** (group receipts by `store_name` / store)
   - A list of their recent receipts (date, store, total, item count)
   - Optionally a simple month-to-month comparison
2. **Queries** — extend/add to `src/server/queries.ts`: receipts + totals for a given `user_id`, grouped by store, filtered by month.
3. **Simple, honest UI** — Tailwind, consistent with the rest of the site. This is a personal dashboard, not public data — it must be clearly the _user's own_ spending.
4. **Make it the reward** — the upload-complete state links straight here ("View your spending report"); this is the "what do I get for scanning?" answer made visible.

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
