# Task 037 — Landing Page (first-time user home)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7a (make the site presentable + navigable for a non-technical beta user)

## Objective

Make `/` (the root) a **basic landing page** for first-time visitors, and **reroute already-authenticated users to the offers page**. The current home page is a bare offer list ("Current offers" + a chain filter) that explains nothing — a cold visitor has no idea what the product is. The landing page communicates the product; signed-in users skip it and go straight to offers.

## What to build

1. **Root `/` becomes the landing page** — for **not signed in** users, `index.tsx` renders the landing page.
2. **Authenticated users reroute to the offers page** — if `getCurrentUser()` returns a user, `<Navigate href="/offers" />`. Pattern (from `lists/index.tsx:38`, `upload.tsx:28`):
   ```tsx
   const user = createAsync(() => getCurrentUser());
   // ...in render:
   <Show when={user()}>
     <Navigate href="/offers" />
   </Show>;
   ```
3. **Move the current offers list from `/` to a new `/offers` route** — create `src/routes/offers.tsx` containing the existing offer-listing code (chain filter, pagination, grid from the current `index.tsx`). The offers list is the signed-in user's main surface; it must live somewhere reachable.
4. **Landing page content** (for the not-signed-in case): hero that explains the product in one sentence + lands the "Sku' jeg?" hook; clear entry points (build a list, upload a receipt, browse offers → `/offers`); a short "what you get" section; a sign-in affordance (magic-link, Task 010). Plain Danish.
5. **Fix the "home" links** — the `href="/"` "Home" links in `Nav.tsx` and the `[...404].tsx`, `products/[id].tsx`, `stores/[id].tsx`, `about.tsx` back-links now point at the landing page. **DECIDED (Nick, 2026-08-14): for signed-in users, "Home" must be `/offers` — NOT the landing page.** A signed-in user's home is the current offers page. Apply: nav "Home" and the back-links point to `/offers` for signed-in users (the client-side auth check in step 2 — or a conditional link — handles the signed-in/out distinction). Never send a signed-in user to the landing page they'd be redirected away from.

## Important

- **Basic, not the full design** — functional landing page in the basic layout (Task 036), NOT the design system (Phase 9/Task 040). Don't invent the final brand identity; just communicate + guide.
- **The offers page is NOT deleted** — it moves to `/offers`. Don't lose the offer browsing; it's the data showcase and the signed-in home.
- **Reroute is client-side auth check** — use the existing `getCurrentUser()` pattern; don't invent a server redirect.
- **Plain Danish** — no English leakage (pairs with Task 045).
- **Guide, don't overwhelm** — one clear primary action (e.g. "Log ind" / "Start med en liste").
- **Compliance labels intact** — if any trust-tier / offer labels appear, keep them correct.

## Acceptance criteria

- [ ] `/` renders a landing page for **not-signed-in** users (hero, entry points, "what you get", sign-in affordance)
- [ ] A **signed-in** user hitting `/` is rerouted to `/offers` (client-side `getCurrentUser()` check)
- [ ] The current offers list is accessible at `/offers` (moved, not deleted — filter + pagination intact)
- [ ] For signed-in users, nav "Home" + back-links point at `/offers` (never the landing page they'd be redirected from)
- [ ] Plain Danish, no English leakage
- [ ] `vp check` + `vp test` pass
