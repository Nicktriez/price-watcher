# Task 037b — Remove the Signed-In Reroute (same landing for everyone)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7a, Task 037 (decision reversed 2026-08-14)

## Objective

Make the root `/` a landing page that renders the **same for everyone** — signed in or signed out. Remove the behavior where an authenticated user is redirected to `/offers`.

## Context

Task 037 built the landing page but added a redirect: signed-in users hitting `/` got `<Navigate href="/offers" />`. That was reversed (Nick, 2026-08-14) — a signed-in user clicking "Forside" and getting bounced was jarring. The clean model:

- **"Forside" → `/`** (the landing) for everyone.
- **"Tilbud" → `/offers`** (the offers list) for anyone who wants offers.
- **No redirect on `/`.** Signed-in users who visit `/` just see the landing page, same as signed-out users.
- **No session-conditional nav href** — the landing is identical for all users, so no `getCurrentUser()` check is needed in the render path.

## What to build

1. **Remove the signed-in redirect from `src/routes/index.tsx`** — delete the block that renders `<Navigate href="/offers" />` when `getCurrentUser()` returns a user. After this, `index.tsx` renders the landing page unconditionally.
2. **Simplify `index.tsx`** — since the landing is now the same for everyone, remove the `getCurrentUser()` / `createAsync` session read and the conditional `<Show when={user()}...>` branching that was only there to support the reroute. The component renders one landing page, no auth branching.
3. **Keep the landing content intact** — hero with the "Sku' jeg?" hook, entry points (sign-in → `/signin`, browse offers → `/offers`, build list → `/lists`, upload → `/upload`), the "what you get" section, and the "Sådan virker det" steps. Plain Danish. Don't delete or redesign any of it — just remove the auth-dependent redirect.
4. **Verify the nav** — "Forside" in `Nav.tsx` points at `/`, "Tilbud" at `/offers`. No changes needed if that's already the case; just confirm. (The `getCurrentUser()` in Nav is still used for the sign in/out button — keep that.)
5. **Back-links** — products/stores/404/about back-links point at `/offers` (or `/`) consistently. No signed-in/out distinction needed anymore.

## Important

- **The whole point is no redirect, no session branching.** Don't reintroduce `getCurrentUser()` or any conditional rendering into the landing route. The landing is the same for everyone.
- **Don't move offers back to `/`** — they stay at `/offers`.
- **Don't delete the landing content** — keep the hero, CTAs, what-you-get, how-it-works sections. This is a removal-and-simplify task, not a redesign.
- **Plain Danish** — no English leakage. Pagination on `/offers` is `← Tidligere` / `Næste →`.
- **Compliance labels intact** — if any trust-tier / offer labels appear, keep them correct.

## Acceptance criteria

- [ ] `/` renders the landing page for everyone (signed in or out) — **no redirect**
- [ ] `src/routes/index.tsx` has no `getCurrentUser()` / auth branching in the render path
- [ ] Landing content intact: hero + "Sku' jeg?" hook, entry points, "what you get", sign-in affordance
- [ ] Nav: "Forside" → `/`, "Tilbud" → `/offers` (no conditional href)
- [ ] Offers list accessible at `/offers` (filter + pagination intact)
- [ ] Plain Danish, no English leakage
- [ ] `vp check` + `vp test` pass
