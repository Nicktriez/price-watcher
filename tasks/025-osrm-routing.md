# Task 025 — OSRM Routing + User Address

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 5 (Task 2)

## Objective

Compute **driving distance** between the user's home and each store, using **OSRM** (Open Source Routing Machine — free, no API key). This is what powers "is it worth driving to Føtex?" — the fuel math (Task 026) needs a distance to multiply against.

## Context

The user provides their home address once; it's saved per-user. For each candidate store (which has lat/lon from Task 024), OSRM returns the driving distance. Privacy matters: the address is **only used for distance** — never shown, never shared, never logged beyond what the routing needs.

**Sequencing:** depends on store coordinates (Task 024) + user identity (Task 010, for the saved home address).

## What to build

1. **User home address storage** — extend the `user` table (or a `user_preference` table) with the user's home address + its lat/lon. Saved per-user via a settings form. Privacy: this is distance-only input.

2. **OSRM client** — a thin client that takes `origin (lat/lon)` + `destination (lat/lon)` → driving distance in km. OSRM's free HTTP API is enough (`https://router.project-osrm.org/route/v1/driving/...`) for low volume; if volume grows, self-host OSRM on the Hetzner VPS.
   - Round-trip distance = `distance × 2` (drive there and back — the plan's math uses round-trip fuel).

3. **Distance for the comparison** — for the user's home + each store in the basket comparison (Task 022/028), fetch the round-trip driving distance. Cache it per (user, store) so you're not re-querying OSRM on every page load — stores don't move and the user's home is stable.

4. **Privacy rule** — the home address is used **only** for computing distance. It is never exposed on any public page, never in any response to another user, never logged as plaintext where avoidable. Document this in the code and the privacy policy (Phase 8).

## Important

- **OSRM, free, no key** — do not introduce a paid routing API. Self-host OSRM on the Hetzner VPS if volume outgrows the public endpoint.
- **Round-trip** — the plan's fuel math is round-trip (`distance × 2`). Get this right; a one-way distance halves the fuel cost and misleads the verdict.
- **Cache aggressively** — (user, store) distance is stable; caching avoids hammering OSRM and keeps the comparison page fast.
- **Privacy is a hard requirement** — home address is distance-only, never public, never shared. This is a stated Phase 5 constraint.
- **Missing coordinates** — a store with NULL lat/lon (from Task 024) has no distance → no fuel cost, flagged honestly. Don't crash.
- **Don't build fuel math or the verdict here** — that's Tasks 026/028. This is routing/distance only.

## Acceptance criteria

- [ ] User can save a home address; it's stored per-user with its lat/lon
- [ ] OSRM client computes round-trip driving distance between home and a store
- [ ] Distance is cached per (user, store) — not re-queried on every page load
- [ ] Distance for a known route matches Google Maps within ~10% (the plan's verification)
- [ ] Home address is used only for distance — never public, never shared, documented in code
- [ ] Stores without coordinates are handled honestly (no distance, no crash)
- [ ] `vp check` + `vp test` pass
