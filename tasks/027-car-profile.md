# Task 027 — Car Profile per User

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 5 (Task 4)

## Objective

Let each user describe their car so the fuel math (Task 028) is **correct for them**, not a one-size guess. Fuel type, efficiency, and (for EV) whether they charge at home or public — because that changes the per-km cost materially.

## Context

The plan's requirement: _"Car profile per user: fuel type (petrol/diesel/EV), km/l or kWh/km, home vs public charging for EV."_ These are the inputs that turn a distance (Task 025) and a fuel price (Task 026) into a per-km cost. This is a **settings** feature, not a public feature — the car profile is private to the user, like their home address.

**Sequencing:** depends on user identity (Task 010). Standalone from the rest of Phase 5 but required by Task 028's math.

## What to build

1. **Car profile model** — per user (extend `user` or a `user_preference`/`car_profile` table):
   - **Fuel type:** petrol | diesel | EV
   - **Efficiency:** km/l (petrol/diesel) or kWh/km (EV)
   - **EV charging:** home | public (only for EV — affects the per-kWh cost: home rates differ from public fast-charging)

2. **Settings UI** — a page (e.g. `src/routes/settings.tsx`) where the user sets their car profile. Signed-in only. Fields conditional on fuel type (charging option only shows for EV).

3. **Per-user storage + scoping** — the profile is tied to the session `user_id`, private, never public. (Same privacy posture as the home address from Task 025.)

4. **Sensible defaults** — when a user hasn't set a profile, use a reasonable Danish default (e.g. petrol, ~15 km/l) so the travel-cost view doesn't break, but clearly mark it as "your default — set your car in settings." Never silently assume an EV rate for a petrol car or vice versa.

## Important

- **The EV home/public split matters** — charging at home vs public fast-charging can be 3–5× different in kr/kWh. A user with an EV gets asked this; the fuel math must use the right rate.
- **Per-user and private** — the car profile is personal data (like home address). Never public, never shared, documented in the privacy policy (Phase 8).
- **Conditional fields** — charging option only for EV; km/l only for petrol/diesel; kWh/km only for EV. Don't show irrelevant fields.
- **Honest default, marked as such** — a user who hasn't set a profile gets a labeled default, not a silent assumption that misleads the verdict.
- **Don't build the fuel math or verdict here** — that's Task 028. This is the profile + settings UI.

## Acceptance criteria

- [ ] User can set fuel type (petrol/diesel/EV), efficiency (km/l or kWh/km), and EV charging location (home/public)
- [ ] Settings UI is signed-in only and shows fields conditional on fuel type
- [ ] Car profile is per-user, private, never public
- [ ] Unset profile uses a clearly-labeled default (doesn't break the view, doesn't mislead)
- [ ] `vp check` + `vp test` pass
