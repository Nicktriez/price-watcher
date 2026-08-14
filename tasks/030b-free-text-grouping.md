# Task 030b — Wire Free-Text Crowd Reports into Community Tiering

**Repo:** `~/price-watcher`
**Parent:** Task 030 (`tasks/030-trust-tiers.md`)

## Why this exists

Task 030 built the trust-tier engine and recorded the decision (option **a**) that
free-text crowd reports — `crowd_report.product_id IS NULL` — group by **normalized
name (trim + lowercase)** so they can reach **Community** without waiting for
moderation (Task 032). The engine's pure logic honors that, but the **wiring doesn't**:

- `getProductCrowdPrices` (src/server/queries.ts) queries `crowd_report.product_id = productId`
  only, so free-text reports (product_id = null) are **never surfaced** — not Single, not Community.
- `normalizeProductName` exists in `src/lib/trust-tier.ts` and is unit-tested, but is
  **only referenced from the test file** — dead in production code.

So the "free-text groups by normalized name" decision is currently satisfied only by an
unused function. This task wires it so free-text reports actually contribute to
Community pricing **now**, not after 032.

## What to build

1. **A free-text crowd-price query** (in `src/server/queries.ts`, alongside
   `getProductCrowdPrices`): fetch `crowd_report` rows where `product_id IS NULL`,
   group them by store **and** by `normalizeProductName(product_name)`, then run each
   group through `computeCrowdTier` exactly like the product-linked path. Reuse the
   same tolerance, distinct-user counting, and staleness rules — no new logic.

2. **Surfacing**: free-text Community/Single groups must be visible somewhere a user can
   see them. Minimum: a "reported items" listing on the product page (or a dedicated
   route) showing the normalized name, store, tier badge, price, and age. The point is
   that agreeing free-text reports are no longer invisible until 032.

3. **Link readiness**: leave a clean seam for Task 032 — free-text groups should be
   resolvable to a `product_id` later without rework (e.g. the group's normalized name
   is stored/queryable so 032 can match-and-link). Do not build 032's linking here.

## Important

- **Reuse `normalizeProductName`** — it already exists and is tested. This task is about
  calling it in production, not writing a new normalizer.
- **Same rules as product-linked**: ≥3 distinct users within tolerance → Community;
  Single stale after 24h; age shown everywhere; never a discount. No special-casing.
- **Do not build moderation/linking** — that's 032. Just make free-text visible + tiered now.
- **Don't break the product-linked path** — `getProductCrowdPrices` stays as-is.

## Acceptance criteria

- [ ] Free-text reports (`product_id IS NULL`) group by `normalizeProductName(product_name)` per store
- [ ] Free-text groups run through `computeCrowdTier` with the same rules (Community at ≥3 distinct users, Single stale after 24h)
- [ ] Free-text Community/Single prices are surfaced visibly (product page "reported items" or equivalent)
- [ ] 3 free-text reports by different users, same normalized name + within tolerance → **Community** (unit-tested or E2E)
- [ ] `normalizeProductName` is now called in production code (not test-only)
- [ ] Product-linked path (`getProductCrowdPrices`) unchanged
- [ ] `vp check` + `vp test` pass
