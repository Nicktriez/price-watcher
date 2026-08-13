# Task 028 — Verdict Line: Basket + Round-Trip Fuel (net win)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 5 (Task 5)

## Objective

Show each store as **`basket + round-trip fuel cost`** and produce the verdict line that makes Phase 5 worth building: _"Føtex is 30 kr cheaper but costs 12 kr extra in fuel — net win 18 kr."_ This is the honest answer to "is it worth driving the detour?" — the differentiator PriceRunner-style sites don't have.

## Context

The three inputs already exist: **distance** (Task 025, round-trip km), **fuel price** (Task 026, kr/l or kr/kWh), and **car profile** (Task 027, efficiency). This task combines them with the basket cost (Task 021) into one per-store number and the plain-Danish verdict.

**The fuel math:**

- Petrol/diesel: `roundTripKm / kmPerLitre × pricePerLitre`
- EV: `roundTripKm × kWhPerKm × pricePerKWh` (home or public rate per Task 027)

**Sequencing:** depends on Task 021 (basket cost) + Tasks 025/026/027 (distance, fuel, car).

## What to build

1. **A pure fuel-cost function** (e.g. `src/lib/fuel-cost.ts`) — takes distance (km), car profile, fuel price → fuel cost. Unit-testable, no I/O. Handles petrol, diesel, EV-home, EV-public (the plan's four cases).
   - Round-trip distance is already baked into the input from Task 025.

2. **Combine into store totals** — each store in the comparison (Task 022) gets:
   - `basketTotal` (from Task 021)
   - `fuelCost` (round-trip)
   - `totalWithFuel` = basket + fuel
   - **Missing inputs handled honestly** — a store with no distance (no coords), or a user with no car profile, is shown without a fuel figure (or with the labeled default), not silently mis-priced.

3. **The verdict line** — plain Danish, the "screenshot moment" for travel cost:
   - "Føtex er 30 kr billigere, men koster 12 kr ekstra i brændstof — netto 18 kr bedre." (cheaper but more fuel)
   - Or the inverse: a store that's cheaper on the basket but so far that the fuel eats the savings.
   - **Net winner** = the store with the best `totalWithFuel`, not just the cheapest basket. The ranking may flip once fuel is added — that's the whole point.

4. **Wire into the store comparison** (Task 022's view) — add the fuel column and the verdict, keeping the offer/baseline distinction and the honest-UI labeling (never present fuel-adjusted savings as a "discount").

## Important

- **Pure, testable fuel math** — the four cases (petrol/diesel/EV-home/EV-public) must be unit-tested. This is the kind of math that's easy to get subtly wrong (unit mismatch: km/l vs km/kWh).
- **The ranking can flip** — a far-away cheap store may lose to a near store once fuel is added. That flip is the feature. Don't suppress it to keep a "nicer" ranking.
- **Honest when data's missing** — no coords → no distance → no fuel figure (flagged), not guessed. No car profile → labeled default.
- **Plain Danish verdict** — this is a user-facing, shareable line. Make it read naturally ("netto 18 kr bedre"), not like a formula.
- **Keep the compliance framing** — fuel-adjusted savings is not a "discount"; keep the user-reported/offer labeling from Task 022 intact.

## Acceptance criteria

- [ ] Pure fuel-cost function handles petrol, diesel, EV-home, EV-public (unit-tested)
- [ ] Each store shows basket + round-trip fuel + total-with-fuel
- [ ] Verdict line states the net winner in plain Danish (basket ± fuel trade-off)
- [ ] The ranking reflects total-with-fuel (a far cheap store can lose to a near store)
- [ ] Missing inputs (no coords / no car profile) handled honestly, not silently mis-priced
- [ ] Offer/baseline + user-reported labeling preserved on the view
- [ ] `vp check` + `vp test` pass
