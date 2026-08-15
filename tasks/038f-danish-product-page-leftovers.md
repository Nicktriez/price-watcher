# Task 038f — Danish Consistency: Product Page Leftovers (English leakage)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7b (beta usability). Follow-up to **Task 038e** (which translated most of `/compare` and `/products` but missed three strings — verified by Ultron 2026-08-15 against the pushed `a622cb8`).

## Objective

Finish the Danish translation of `src/routes/products/[id].tsx`. Task 038e's acceptance criterion was "no English user-facing strings remain," but three English strings were missed. Fix them so the product page is fully Danish — a pre-beta usability requirement (Phase 7c Task 0 cold-user test must not hit English).

## English strings remaining (verified 2026-08-15)

| Line | Current (English)                                            | Danish (proposal — Nick to confirm wording)                                         |
| ---- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| 49   | Trust badge, community tier: `"Community"`                   | `Fællesskab` — **must match the tier label used consistently app-wide** (see below) |
| 153  | Empty state: `"No crowd shelf prices for this product yet."` | `Ingen priser fra fællesskabet på dette produkt endnu.`                             |
| 197  | Empty state: `"No price history yet."`                       | `Ingen prishistorik endnu.`                                                         |

## What to build

1. Translate the three strings above to plain Danish.
2. **Trust-tier label consistency check (the point of this task):** the community-tier display label must be identical everywhere. Verified `"Community"` currently appears in **two files**: `src/routes/products/[id].tsx:49` and `src/routes/reported-items.tsx:15`. Decide the single Danish label and apply it consistently to all five files that render tier text (verified via grep):
   - `src/routes/products/[id].tsx` — trust badge (line 49) + explanatory line 148 (`Community-pris`)
   - `src/routes/reported-items.tsx` — line 15
   - `src/routes/compare/[id].tsx` — the `Official / community / user-reported` table header + any tier text
   - `src/routes/report.tsx` and `src/routes/about.tsx` — any tier mention
     If the codebase has a shared `TrustBadge` component or a single tier→label mapping, change it **once** there rather than per-file. If per-file duplicates exist, consolidate them (at minimum make them all say the same word).
   - Recommended single label: **`Fællesskab`** (or `Fællesskabspris`) — Nick confirms. Do NOT leave a mix of `Community` and `Fællesskab`.
3. Sweep the whole product page + compare page one more time for any remaining English user-facing string not in the 038e catalog or this list.

## Important

- **Copy-only, no logic.** No layout/data/behavior changes.
- **Consistency is the deliverable** — the tier label must be the same word everywhere, not just translated in one spot.
- **Plain natural Danish**, not stiff word-for-word translation.
- Leave code identifiers/comments alone (e.g. `TrustBadge`, tier prop `"community"` — that's the data value, not the label; do not rename the prop).

## Acceptance criteria

- [ ] The three listed English strings are translated to Danish
- [ ] Trust-tier label is a **single consistent Danish term** across product page, compare page, reported-items, and offer list (no mixing `Community`/`Fællesskab`)
- [ ] No other English user-facing strings remain on `/products/[id]` or `/compare/[id]`
- [ ] Copy is natural Danish (Nick approves wording)
- [ ] No logic/layout changes; code identifiers untouched
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified live on `beta.skujeg.dk` (product + compare pages show zero English)
