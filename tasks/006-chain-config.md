# Task 006 — Chain Config + All-Chain Ingestion

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 2 (Task 1) + `docs/reference/chains.md` (dealer IDs + cadence)

## Objective

Phase 1's `ingestChain(dealerId)` already works for one chain (REMA). This task turns it into a **config-driven** multi-chain system: a chain config table/list that maps each chain to its Tjek dealer ID, so ONE generic worker ingests all of them. No per-chain code — just data.

## The chain config (real dealer IDs from research)

| Chain        | Dealer ID | Cadence / notes                                                             |
| ------------ | --------- | --------------------------------------------------------------------------- |
| REMA 1000    | `11deC`   | weekly, publish Fri 08:00 UTC — already working                             |
| Netto        | `9ba51`   | weekly, publish Thu 05:00 UTC                                               |
| Bilka        | `93f13`   | weekly, publish Thu 08:00 UTC                                               |
| Føtex        | `bdf5A`   | weekly, Thu 08:00 UTC; can run 2-week aviser                                |
| Kvickly      | `c1edq`   | Thu–Thu                                                                     |
| SuperBrugsen | `0b1e8`   | Thu–Thu                                                                     |
| 365discount  | `DWZE1w`  | Wed–Wed (offset week)                                                       |
| Brugsen      | `d311fg`  | sporadic — low priority                                                     |
| Lidl         | `71c90`   | weekly avis + weekend avis (Fri–Sun) + long-running LPs — poll all catalogs |
| SPAR         | `88ddE`   | secondary                                                                   |
| MENY         | `267e1m`  | secondary                                                                   |

## What to build

1. **Chain config** — a `chain` table already exists (id, name, tjek_dealer_id, website, logo_url). Populate it with the rows above (migration or seed). The `chain.tjek_dealer_id` IS the config — `ingestChain()` already takes a dealerId.
2. **`ingestAllChains()`** — iterate the chain config and call `ingestChain(chain.tjek_dealer_id)` for each. Shared error handling: if one chain fails, log and continue with the rest (don't abort the batch).
3. **Priority order** — ingest the 5 primary chains (REMA, Netto, Bilka, Føtex, Kvickly/SuperBrugsen/365) first, then Lidl, then the secondaries. Order matters only for which data lands first.

## Acceptance criteria

- [ ] `chain` table seeded with the dealer IDs above (REMA already there)
- [ ] `ingestAllChains()` pulls offers for all configured chains, not just REMA
- [ ] One chain failing doesn't abort the others
- [ ] Re-running is idempotent (same deterministic-UUID mechanism as Phase 1)

## Testing approach

- `ingestAllChains()` hitting the live Tjek API + your Postgres is an **integration check**, not a unit test. Run it manually on the laptop (`node` a throwaway script or via the scheduler) and confirm offer counts per chain. Do NOT wire it into `vp test`.
- Unit-test only the pure pieces (any helper that maps a chain's data to rows) against fixtures — no DB, no network.
