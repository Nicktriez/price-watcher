# Task 047 — Report Page: Fix English Leakage (Danish)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 6 task (Task 029 — report a price) + Danish-consistency (Task 045). **Found 2026-08-14:** the report page was missed by earlier Danish passes.

## Objective

Translate all **English UI copy on the report page** (`src/routes/report.tsx`) to plain Danish. This page leaks English heavily — it predates the Danish-consistency sweep (Task 045) and was never fixed.

## Context

The site is Danish-first (language policy). The report page (`/report`, Task 029) still has English on nearly every affordance. Task 045's full-tree sweep hasn't run yet, but this page is egregious enough to fix now — a beta user reporting a price shouldn't hit English.

## The English to fix (verified in `src/routes/report.tsx`)

| Current (English)                                                                                         | Danish                                                                                                                            |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `Report a shelf price` (H1)                                                                               | `Rapportér en hyldepris` (or `Rapportér en pris`)                                                                                 |
| `Saw a price in a store that isn't in any offer? Report it — it helps others (and you) spot real prices.` | `Så du en pris i en butik, som ikke er i nogen tilbudsavis? Rapportér den — det hjælper andre (og dig) med at se rigtige priser.` |
| `Store` (label)                                                                                           | `Butik`                                                                                                                           |
| `Search by store name or city…` (placeholder)                                                             | `Søg på butikkens navn eller by…`                                                                                                 |
| `Name of the product…` (placeholder)                                                                      | `Navnet på produktet…`                                                                                                            |
| `Search by product name…` (placeholder)                                                                   | `Søg på produktets navn…`                                                                                                         |
| `Price` (label)                                                                                           | `Pris`                                                                                                                            |
| `e.g. 12.95` (placeholder)                                                                                | `fx 12,95` (note: Danish uses comma decimal)                                                                                      |
| `Photo` (label)                                                                                           | `Billede` (or `Foto`)                                                                                                             |
| any other English label/placeholder/button on the page                                                    | translate to Danish                                                                                                               |

**Also check:** the `<p>` descriptions, any submit-button text, any error/success messages (e.g. the `CrowdReportResult` message in `src/server/report.ts` is already partly Danish — confirm the UI shows Danish), and the empty/loading states.

## What to build

1. **Translate every user-facing string** in `src/routes/report.tsx` to plain Danish per the table above.
2. **Check the full page**, not just the listed rows — grep `src/routes/report.tsx` for any remaining English (labels, placeholders, buttons, headings, descriptions, empty states) and translate it all.
3. **Match the existing Danish style** used elsewhere on the site (e.g. the confirmation message in `src/server/report.ts` is already "Tak! Din pris er registreret som brugerrapporteret — den vises ikke som et tilbud eller en rabat."). Use the same tone.
4. **Danish number formatting** — a price placeholder should hint the Danish decimal comma (`12,95`), not the English dot. (If the app stores/computes the price with a dot internally, that's fine — this is just the UI hint; keep it consistent with how other price inputs on the site are formatted.)

## Important

- **Danish-first** — per the language policy. Don't introduce English.
- **This is the report page specifically** — Task 045 does the full site sweep later; this task is a targeted fix for `/report` because it's egregiously leaked and it's a beta-facing flow (reporting a price).
- **Don't change behavior** — only translate copy. No logic, no layout, no form changes.
- **Consistency** — use the same Danish terms the rest of the site uses (e.g. `brugerrapporteret` for user-reported, `tilbud` for offer).

## Acceptance criteria

- [ ] No English leakage in `src/routes/report.tsx` — all labels, placeholders, buttons, headings, descriptions in Danish
- [ ] H1 = `Rapportér en pris` (or equivalent Danish), `Butik`/`Pris`/`Billede` labels, Danish placeholders (incl. `12,95` comma formatting)
- [ ] Confirmation/error messages the UI shows are Danish
- [ ] Only copy changed — no behavior/layout/form logic change
- [ ] `vp check` + `vp test` pass
