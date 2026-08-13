# Task 017 — "Your Price vs. Average" on Scanned Receipts

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 3 (Task 6)

## Objective

After a user scans a receipt, show them **per-line: what they paid vs. the going rate** — "coffee 42 kr — 3 kr below average." This is the payoff that turns the _scanner_ into the beneficiary, not just a donor to the crowd layer. It's the individual price-insight that makes scanning feel valuable to _the person doing it_.

## Why this matters

The platform benefits from every receipt (baseline prices, the moat). But a user doesn't care that their receipt helps other people compare prices — altruism doesn't drive repeat behavior. **"Your price vs. average" gives the scanner their own answer**: did I get a good deal on what I bought? That's the immediate, personal reward for scanning. It also feeds the when-to-buy verdict (Phase 8) with user-relevant context.

## Context

- Depends on: identity (Task 010), receipt schema + line items (Task 010/011), upload (Task 012), and **baseline prices existing** (the "average" to compare against comes from other receipts via `price_point` where `source='receipt'`).
- The baseline/going-rate comparison already exists in the data layer (Task 013 surfaces it publicly on product pages). This task makes it **personal** — applied to the user's own receipt lines.

## What to build

1. **A comparison query** — given a receipt's line items, compute the going rate per item (average of `price_point` where `source='receipt'` for the same product/store, or national average if store-specific is sparse). For each line, derive:
   - the user's paid price
   - the reference (average) price
   - the delta: "3 kr below average" / "2 kr above average" / "about average"

2. **UI on the receipt view** (after upload/scan) — each line item shows its vs-average delta with honest labeling:
   - below average → subtle positive indicator (but NOT "discount" — it's "you paid below the going rate," compliant framing)
   - above average → neutral/informational, no shaming
   - no reference price → "no comparison yet" (honest empty state; don't fabricate)

3. **Personal, not public** — this is the scanner's own receipt comparison, tied to their `user_id`. It complements (but is distinct from) the public baseline prices on the product page (Task 013).

## Important

- **Don't fabricate comparisons.** If there's no baseline for a product, show "no comparison yet" — never invent a reference. This is the same honesty rule as the OCR engine: no hallucinated values.
- **Compliance framing** — "3 kr below average" is fine; "3 kr discount" is NOT (Omnibus: never call a crowd-derived comparison a discount). Label it as a comparison to the going rate, not a discount.
- **The user is the beneficiary.** This is the "what do I get for scanning?" payoff. It should be visible immediately after a scan completes, not buried.
- Keep it simple — a per-line delta + an overall "you paid X below/above the average on this receipt" summary is enough. No charts needed in v1.

## Acceptance criteria

- [ ] A scanned receipt shows per-line price vs. average (below / above / about / no-comparison)
- [ ] Comparison is computed from real `price_point` receipt baselines, never fabricated
- [ ] Honest empty state when no baseline exists for a line
- [ ] Labeling is compliant — "below average," not "discount"
- [ ] Tied to the signed-in user's own receipt
- [ ] `vp check` + `vp test` pass
