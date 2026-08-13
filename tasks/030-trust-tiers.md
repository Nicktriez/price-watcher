# Task 030 — Trust Tiers + Staleness (GasBuddy model)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 6 (Task 3)

## Objective

Turn raw crowd reports (Task 029) and receipt baselines (Phase 3) into a **trust-tiered price view** users can rely on. This is the GasBuddy model: the same price reported by multiple independent users is trustworthy; a single report is not. Every displayed price carries a trust tier and a staleness indicator.

## The trust tiers (from the plan)

- **Official** — green badge, from the chain feed (Tjek) or a verified partner. (This is the feed data — already exists from Phases 1/2.)
- **Community** — yellow, **3+ independent reports agree within tolerance**
- **Single report** — grey, "user-reported", **stale after 24h**
- **Staleness everywhere** — shown as text ("2 days old"), never hidden.

## Context

Trust tiers are the honesty backbone of the whole site — the thing that distinguishes "reliable price" from "random person said so." The tolerance for "agree" must be defined (e.g. ±2% or ±1 kr, whichever is larger) so 3 reports of "39,95" and "39,90" count as agreeing, but "39,95" and "49,95" don't.

**Sequencing:** depends on crowd reports existing (Task 029) + the existing trust-tagging from Phases 3/4 (receipts already have `trust_tier`; offers already `official`). Pure-ish logic — the tier computation should be testable.

## What to build

1. **A pure trust-tier function** (e.g. `src/lib/trust-tier.ts`): given the independent reports for a (store, product) with their prices and timestamps → the tier:
   - **Official** if the price comes from the chain feed
   - **Community** if ≥3 independent `user_id`s reported prices within tolerance
   - **Single** otherwise
   - Unit-testable with fixtures (the plan's verification: "same price reported 3× by different users flips to Community")

2. **Tolerance definition** — a config for "agree": e.g. `±2% or ±1 kr, whichever is larger`. Document it. 3 reports within tolerance → Community.

3. **Staleness everywhere** — every displayed price shows its age ("2 days old") as text. A **Single** report that's older than 24h is visually distinguished as stale (greyed, "user-reported" + age). Compute staleness from the timestamp, not from a stored boolean.

4. **Wire into product pages + compare** — the product page (Task 014 already shows trust badges) and the store comparison now use the full tier model: feed prices = Official, multi-report = Community, single = Single+stale-after-24h. Consistent everywhere.

5. **Compliance** — a community/single price is always "user-reported," never a "discount." (Omnibus — carried from Tasks 014/017/022.)

## Important

- **Pure, testable tier logic** — the Community flip (3 reports within tolerance) must be unit-tested. It's the plan's core verification.
- **Tolerance is the hard part** — define "agree" clearly (a ±% or ±kr config). Without a tolerance, "3 reports agree" is undefined.
- **Staleness from age, not a boolean** — compute it from the timestamp so it's always honest, never a stale-forever flag.
- **Independent users** — "3+ reports" means 3+ _different_ `user_id`s (a single user reporting 3× is 1 report, not Community). This is the anti-gaming core.
- **Never a discount** — community/single is always "user-reported."
- **Don't build moderation or gamification here** — that's Tasks 031/032.

## Acceptance criteria

- [ ] Pure trust-tier function: official / community (≥3 independent users within tolerance) / single
- [ ] "Agree" tolerance is defined and config-driven
- [ ] 3 reports by different users within tolerance flips to Community (unit-tested)
- [ ] Single report is visually distinguished as user-reported and stale after 24h
- [ ] Every displayed price shows its age as text ("2 days old")
- [ ] Compliance: community/single never called a "discount"
- [ ] `vp check` + `vp test` pass
