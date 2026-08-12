# Task 008 — Product Matching Across Chains

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 2 (Task 3) + `docs/reference/chains.md` (REMA `get_offer_products` RPC note)

## Objective

Make the same product across chains resolve to **one `Product` row**, so the app can compare "Schulstad brød at REMA vs Netto." Phase 1 created one product per `(heading, dealer)` pair — this task starts linking them.

## The starting point (keep it simple)

Phase 1 note: _"start by creating one product per unique (heading, dealer) pair, refined by Phase 2 matching."_ Phase 2 matching should **start simple and only get fuzzy later**:

1. **Normalize names** before comparison:
   - lowercase, trim
   - strip brand-prefix variants and size/quantity suffixes ("Schulstad brød 470g" → "schulstad brød")
   - normalize unit separators and punctuation
2. **Exact-name match across chains** — if normalized `heading` matches a product from another chain, link them (update `offer.product_id` to the existing `Product`).
3. **Brand match** — if `heading` contains the brand, use it as a tiebreaker/confidence signal.

**Do NOT build fuzzy/embedding matching in this task** — that's a later refinement. Exact normalized-name match first.

## The REMA RPC opportunity — BLOCKED, skip it for now

`chains.md` notes REMA's site embeds a `tjek.api_key` that works for the `get_offer_products` RPC (returns article numbers / GTIN — ground truth for product identity). **However, the actual api_key value is NOT available in this repo** — it's embedded in REMA's website page-config, captured during research but not committed anywhere OpenCode can read. So:

- **Do NOT attempt to call `get_offer_products` in this task.** There's no key to use, and probing REMA's site for it is out of scope.
- This is **not a blocker** — the name-matching below is the verifiable deliverable. The RPC/GTIN enhancement is deferred until the key is provided (a `REMA_API_KEY` env var) or retrieved deliberately.

## What to build

1. **Name normalization** helper (`normalizeName(heading)`) — pure function, testable.
2. **Cross-chain product linking** — after ingestion, run a pass that links offers with matching normalized names across chains to one `Product`.
3. **A matching run** that's idempotent and re-runnable (don't re-match already-linked products into a mess).
   - _(Do NOT add `external_id`/GTIN columns or RPC wiring in this task — that's the deferred REMA RPC work above.)_

## Important

- **Idempotent and safe:** never re-link a product to a _different_ existing product once matched; the first stable link wins.
- **Name collisions are real:** "Cola" at two chains may be different products. Exact normalized match is a heuristic, not truth — accept some mislinks in v1; the trust-tier + crowd layer corrects later.
- Don't delete products — relink offers, keep history intact.

## Acceptance criteria

- [ ] `normalizeName` exists and is tested (REMA + Netto fixtures have real headings to test against)
- [ ] Same product across 2+ chains links to ONE `Product` — **known test case: "3-stjernet pålæg" appears in both `rema1000.offers.json` and `netto.offers.json`** (exact-heading overlap found during fixture review). After normalization, more matches may surface; at minimum this one must link.
- [ ] Re-running the matcher doesn't corrupt existing links
- [ ] `vp check` + `vp test` pass
- [ ] _(Deferred, NOT part of this task)_ REMA `get_offer_products` RPC / GTIN — blocked on `REMA_API_KEY` not being available to OpenCode

## Testing approach — CRITICAL, do NOT write a DB test

The matcher must be a **pure function** over offer arrays, e.g. `linkProducts(offers: Offer[]): LinkDecision[]` that returns _decisions_ ("this offer → this product id") **without touching the database**. The DB application (applying decisions to rows) is a thin separate layer.

- Unit-test `linkProducts` entirely against the **REMA + Netto fixtures**: feed both chains' offers in, assert that "3-stjernet pålæg" resolves to ONE product. No DB, no network.
- `normalizeName` is a pure string function — unit-test it against fixture headings.
- Do NOT write tests that hit the Postgres database. There is no test DB, and `vp test` uses the real dev `DATABASE_URL` — a DB test would pollute real data.
