# Task 038e — Danish Consistency: Compare + Product Pages (English leakage)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7b (beta usability) + Phase 9 Task 045 (Danish-consistency). Found **2026-08-15** (Nick) live on `beta.skujeg.dk`. **Pre-beta fix** — a cold non-technical user (Phase 7c Task 0) hitting English UI leaks makes the site look unfinished and hurts the retention signal.

## Objective

Translate all English UI strings on the **store comparison page** (`src/routes/compare/[id].tsx`) and the **product page** (`src/routes/products/[id].tsx`) to **plain Danish**. Copy-only change — no layout, logic, or data changes. This is the same class of fix as Task 037d (which fixed `/report`).

## English strings found (complete catalog)

### `src/routes/compare/[id].tsx`

| Line(s) | Current (English)                                                                                                                            | Danish (proposal — Nick to confirm wording)                                                                                                        |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 65      | `List not found.`                                                                                                                            | `Listen blev ikke fundet.`                                                                                                                         |
| 93–97   | `This list is empty. Add items or use a template.`                                                                                           | `Listen er tom. Tilføj varer eller brug en skabelon.`                                                                                              |
| 105–107 | `No stores have prices for these items yet. Prices come from current offers and uploaded receipts.`                                          | `Ingen butikker har priser på disse varer endnu. Priserne kommer fra aktuelle tilbud og uploadede kvitteringer.`                                   |
| 115–121 | `Your basket is cheapest at {store} — {price} kr less than the most expensive option.`                                                       | `Din kurv er billigst hos {store} — {price} kr mindre end det dyreste alternativ.`                                                                 |
| 140     | `Store` (table header)                                                                                                                       | `Butik`                                                                                                                                            |
| 141     | `Basket` (table header)                                                                                                                      | `Kurv`                                                                                                                                             |
| 142     | `Fuel (round trip)` (table header)                                                                                                           | `Brændstof (tur-retur)`                                                                                                                            |
| 143     | `Total w/ fuel` (table header)                                                                                                               | `I alt inkl. brændstof`                                                                                                                            |
| 144     | `vs. most expensive` (table header)                                                                                                          | `sml. dyreste` (or `ift. dyreste`)                                                                                                                 |
| 145     | `Official / community / user-reported` (table header)                                                                                        | `Officiel / bruger / brugerrapporteret` (confirm — the trust-tier naming must match the product page + rest of app)                                |
| 240–243 | `{n} item{s} in your basket couldn't be priced anywhere (no current offer, no receipt baseline).`                                            | `{n} var{er} i din kurv kunne ikke prissættes (hverken tilbud eller kvitteringspris).`                                                             |
| 248–250 | `Set your home address and car profile to see fuel-adjusted totals.`                                                                         | `Angiv din hjemmeadresse og bilprofil for at se brændstofjusterede totaler.`                                                                       |
| 255–257 | `Stores without a fuel figure (no known address/distance or fuel price) are shown after stores with full data — their total is basket-only.` | `Butikker uden brændstofsfigur (ingen kendt adresse/afstand eller brændstofpris) vises efter butikker med fulde data — deres total er kun kurven.` |
| 267     | `Fuel prices (national average)`                                                                                                             | `Brændstofpriser (landsgennemsnit)`                                                                                                                |

### `src/routes/products/[id].tsx`

| Line(s) | Current (English)                                             | Danish (proposal)                                                                                                                                                                                                |
| ------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 47–50   | Trust badge: `Official offer` / `Community` / `User-reported` | `Officielt tilbud` / `Fællesskab` / `Brugerrapporteret` — **verify these match the exact trust-tier labels used elsewhere in the app** (compare page header, offer list, report page). Consistency is the point. |
| 69      | `Product not found.`                                          | `Produktet blev ikke fundet.`                                                                                                                                                                                    |
| 77      | `Current offers` (heading)                                    | `Aktuelle tilbud`                                                                                                                                                                                                |
| 80      | `No current offers for this product.`                         | `Ingen aktuelle tilbud på dette produkt.`                                                                                                                                                                        |
| 106     | `Unknown chain`                                               | `Ukendt kæde`                                                                                                                                                                                                    |
| 117     | `User-reported prices` (heading)                              | `Brugerrapporterede priser`                                                                                                                                                                                      |
| 131     | `Unknown store`                                               | `Ukendt butik`                                                                                                                                                                                                   |
| 145     | `Crowd shelf prices` (heading)                                | `Priser fra fællesskabet`                                                                                                                                                                                        |
| 193     | `Price history (30 days)` (heading)                           | `Prishistorik (30 dage)`                                                                                                                                                                                         |

## What to build

1. Replace every English user-facing string above with the corresponding Danish. The proposal column is a starting point — **Nick approves final wording** (it's user-facing, and the trust-tier names must stay consistent app-wide).
2. **Trust-tier label consistency check:** the tier names (`official`/`community`/`single` → their Danish display labels) must be identical on the compare page, product page, offer list, and report page. If the product page already has a `TrustBadge` component (it does — `src/routes/products/[id].tsx` lines 36–53), prefer reusing it everywhere rather than duplicating tier→label mapping.
3. **Sweep sibling pages** for the same leakage while you're in there: `/offers` index and any page that shows offers/receipts/prices. Only fix genuine user-facing English; leave code/classnames/comments alone.

## Important

- **Copy-only, no logic.** Do not change layout, colors, data, or behavior. Only swap English display strings for Danish.
- **Plain, natural Danish** — not word-for-word translation that reads stiffly. Match the tone of the rest of the site ("Danish, direct, honest").
- **Consistency is the deliverable** — the trust-tier labels and the fuel/cost terms must match across pages. Check `src/server/` for where display labels are generated if any come from the server.
- Do NOT touch the `fmtPrice`/currency formatting or any numeric logic.
- This is the pre-beta Danish pass for these two pages; the full Phase 9 Task 045 sweep is later.

## Acceptance criteria

- [ ] No English user-facing strings remain on `/compare/[id]` (all listed lines translated)
- [ ] No English user-facing strings remain on `/products/[id]` (all listed lines translated)
- [ ] Trust-tier labels consistent across compare + product + offers + report pages
- [ ] Copy is natural Danish (Nick approves wording)
- [ ] No layout/logic/data changes (copy-only)
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified live on `beta.skujeg.dk` (both pages show Danish, no English leakage)
