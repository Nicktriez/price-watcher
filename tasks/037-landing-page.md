# Task 037 — Landing Page (first-time user home)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7a (make the site presentable + navigable for a non-technical beta user)

## Objective

Make `/` (the root) a **basic landing page** for first-time visitors, and **reroute already-authenticated users to the offers page**. The landing page communicates the product; signed-in users skip it and go straight to `/offers`.

## Current state (already done in Task 036 — do NOT redo)

Task 036 already completed part of this task's scope. **Verify it exists, don't rebuild it:**

- ✅ **Offers moved to `/offers`** — `src/routes/offers.tsx` now holds the offer list (chain filter, pagination, grid). Not deleted.
- ✅ **`/` is a minimal landing stub** — `src/routes/index.tsx` already shows a basic "Sku' jeg?" hero + conditional CTAs (Log ind when signed out; Opret indkøbsliste / Upload kvittering / Se tilbud when signed in).
- ✅ **Footer added** — secondary pages (madplan, spending, reported-items, leaderboard, settings) are linked there, nothing URL-only.

**What is still NOT done (this task's remaining work):**

## What to build

1. **Complete the landing page content** — the current stub is minimal. Expand `index.tsx` (for the **not-signed-in** case) into a real basic landing page: a hero that explains the product in one sentence + lands the "Sku' jeg?" hook; clear entry points (build a list → `/lists`, upload a receipt → `/upload`, browse offers → `/offers`); a short "what you get" section (2–4 honest bullets); a sign-in affordance (magic-link, Task 010). Plain Danish.
2. **Authenticated users reroute to `/offers`** — if `getCurrentUser()` returns a user, `<Navigate href="/offers" />`. Pattern (from `lists/index.tsx:38`, `upload.tsx:28`):
   ```tsx
   const user = createAsync(() => getCurrentUser());
   // ...in render:
   <Show when={user()}>
     <Navigate href="/offers" />
   </Show>;
   ```
3. **Fix the nav "Home"/Forside for signed-in users** — **DECIDED (Nick, 2026-08-14): for signed-in users, "Home" must be `/offers` — NOT the landing page.** Currently `Nav.tsx` has `<a href="/">Forside</a>` which sends signed-in users to the landing page (the thing they're redirected away from). Make the nav "Forside" link point to `/offers` when signed in (conditional link using the same `getCurrentUser()` check), and keep it at `/` (the landing) when signed out. Check the `[...404].tsx`, `products/[id].tsx`, `stores/[id].tsx`, `about.tsx` back-links too — they should not bounce a signed-in user to a page they'll immediately leave.
4. **Consistent with the basic layout (Task 036)** — this is a functional landing in the existing layout, NOT the design system (Phase 9/Task 040). Don't invent the final brand identity; just communicate + guide.

## Important

- **Don't rebuild what 036 did** — offers at `/offers` and the `/` stub already exist. This task completes the landing content + applies the signed-in reroute + nav conditional.
- **Reroute is client-side auth check** — use the existing `getCurrentUser()` pattern; don't invent a server redirect.
- **Plain Danish** — no English leakage (pairs with Task 045). Pagination on `/offers` is already `← Tidligere` / `Næste →`.
- **Guide, don't overwhelm** — one clear primary action (e.g. "Log ind" / "Start med en liste").
- **Compliance labels intact** — if any trust-tier / offer labels appear, keep them correct.

## Acceptance criteria

- [ ] `/` renders a complete basic landing page for **not-signed-in** users (hero + "Sku' jeg?" hook, entry points to lists/upload/offers, "what you get", sign-in affordance)
- [ ] A **signed-in** user hitting `/` is rerouted to `/offers` (client-side `getCurrentUser()` check)
- [ ] The offers list remains accessible at `/offers` (filter + pagination intact — not lost)
- [ ] For signed-in users, nav "Forside" + back-links point at `/offers` (never the landing page they'd be redirected from); signed-out keeps `/`
- [ ] Plain Danish, no English leakage
- [ ] `vp check` + `vp test` pass
