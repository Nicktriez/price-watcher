# Task 038o — Invalidate Cached Store Distances When the Address Changes

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 5 (fuel-adjusted trip cost). Found **2026-08-15** (Nick asked whether compare data updates after adding address/fuel; Ultron found the stale-distance cache).

## Objective

Fix the compare page showing **stale distances after the user changes their home address**. The compare verdict recomputes fresh each request (no result cache), and the car profile + fuel prices read live — but per-store route distances are cached in `user_store_distance` and are **never invalidated when the address changes**, so moving to a new address shows the old store distances until the cache is manually cleared.

## Root cause (verified 2026-08-15)

- `src/server/distance.ts` `getStoreDistances` caches each nearest-store round-trip distance in `user_store_distance` (keyed on `user_id` + `store_id`, lines 116–151). On a cache hit, it returns the cached value without recomputing.
- **Nothing deletes or invalidates `user_store_distance` when the user's address changes.** Verified: no `deleteFrom("user_store_distance")` anywhere in `src/server/`. (The deletes in the codebase are for auth challenges, list items, lists, receipt items — none touch the distance cache.)
- `getCarProfile()` reads fresh each request (not cached), and fuel prices read fresh — so the car profile and fuel are NOT affected. **Only the route distances are stale.**

## What to build

1. **Invalidate the distance cache when the address changes.** In `src/server/distance.ts`: `saveHomeAddress` (line 39) should delete the user's `user_store_distance` rows when the new address differs from the old one (or unconditionally on save — it's cheap and correct). `clearHomeAddress` (line 62) should also clear the cache. So the next compare request recomputes distances from the new origin.

2. **Optional but recommended:** also update the cache when the address is first set (the common case already works — no origin before, so nothing was cached — but making the address-save path clear the cache is the complete fix).

3. **Confirm the first-time case stays correct** — a user who views compare before setting an address has no cached distances (no origin), so setting the address + refreshing recomputes fresh. This task must not break that; it only fixes the _change-address_ case.

## Important

- **This is a correctness bug, not a refresh issue** — the compare page itself always recomputes; the problem is specifically stale cached route distances after an address change.
- **Car profile and fuel prices are already fine** — do NOT touch those paths. Only the `user_store_distance` cache needs address-based invalidation.
- **Keep it simple** — deleting the user's distance rows on address save is the clean fix. No need for versioning or timestamps.
- Plain, careful — a user who changes address and immediately views compare should see distances for the NEW address.

## Acceptance criteria

- [ ] Changing the home address clears the user's cached store distances (`user_store_distance`)
- [ ] After changing address + refreshing compare, distances (and fuel-adjusted totals) reflect the NEW address
- [ ] First-time address set still works (fresh compute, correct distances)
- [ ] Car profile / fuel price behavior unchanged (still read fresh)
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified live on `beta.skujeg.dk` (change address → refresh → distances update)
