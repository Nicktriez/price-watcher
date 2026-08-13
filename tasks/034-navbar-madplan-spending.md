# Task 034 — Add Madplan + Spending to Navbar (dev links)

**Repo:** `~/price-watcher`
**Plan source:** dev convenience for testing — NOT a Phase 6 product feature. **Remove before launch (Phase 8), same as Task 033.**

## Objective

Add two more temporary dev links to the navbar so the remaining key feature routes are reachable: **Madplan** and **Spending**. Task 033 already added Lists, Settings, and the conditional Sign in/out; this extends that same temporary navbar with the two routes still only reachable by typing the URL.

## Context

The current `src/components/Nav.tsx` (from Task 033) already has:

- Home, About, **Lists**, **Settings**
- A conditional **Sign in / Sign out** (via `getCurrentUser()` + `signOut()` from `src/server/auth.ts`)
- The `active()` highlighting pattern, and the auth-refresh-on-route-change trick (`authVersion` signal + `void location.pathname` so the session re-fetches after login)

**Both new routes require sign-in** (they call `getCurrentUser` and redirect when logged out) — same as Lists/Settings, so they slot into the nav identically.

## What to build

Add to the `<ul>` in `src/components/Nav.tsx`, in the same style as the existing links:

1. **Madplan** → `/madplan` — the weekly budget meal planner (Task 023).
2. **Spending** → `/spending` — the per-user spending view (Task 015).

Both use the existing `active()` highlight helper and the same `mx-1.5 sm:mx-6` spacing as the other links. Place them near Lists/Settings (the signed-in feature group), not in the sign-in/out slot.

**Do NOT add:** `/upload`, `/report`, `/leaderboard`, or the dynamic routes (`/compare/[id]`, `/products/[id]`, `/receipts/[id]`, `/stores/[id]`). Keep the temporary surface to the fixed-path feature pages. This is the last navbar addition — after this, the fixed feature routes are all clickable.

## Important

- **Temporary — removed before launch.** Same as Task 033 — strip all dev links (Lists, Settings, Madplan, Spending, plus the conditional sign-in/out if it's also dev-only) back to a clean navbar before Phase 8. The `// TEMP: dev links — remove before launch (Phase 8)` comment is already at the top of the component; keep it.
- **Reuse the existing patterns** — `active()` highlighting, the same `<li>` structure, the same spacing. Don't introduce a new nav style for two links.
- **Don't touch the Sign in/out logic** — it works (from Task 033). Only add the two new links.
- **No route changes, no auth changes, no new components** — this is two `<li>` entries.

## Acceptance criteria

- [ ] Navbar now shows Home, About, **Lists**, **Settings**, **Madplan**, **Spending**
- [ ] `/madplan` and `/spending` links use the same `active()` highlight + spacing as the existing links
- [ ] The Sign in/out behavior is unchanged (still works from Task 033)
- [ ] `vp check` + `vp test` pass
