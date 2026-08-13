# Task 019 — Recipe Import (paste recipe → ingredients → matched products)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 4 (Task 2)

## Objective

Let a user **paste a recipe** and turn its ingredient list into a `List` of items. This is the onboarding path that makes lists useful for real people — nobody wants to type "1 hg spaghetti, 400 g hakket oksekød" item by item. Start with **manual mapping UI, not AI parsing** (the plan is explicit: "start with manual mapping UI, not AI parsing").

## Context

The input is a free-text ingredient list ("250 g spaghetti, 1 løg, 400 g hakket oksekød, 2 dåser hakkede tomater, salt, peber"). The output is a `List` with `ListItem`s — ideally product-linked, with free-text fallback. Danish language.

**Sequencing:** depends on Lists CRUD (Task 018). Reuses Phase 2's product matching for the "match this ingredient to a product" step.

## What to build

1. **Recipe paste box** — a textarea where the user pastes a recipe (the ingredient section; they can paste the whole recipe and the ingredient lines are the ones we parse).

2. **Ingredient splitting** — split the pasted text into lines, one ingredient per line. Crude but effective: split on newlines, drop empty lines and obvious non-ingredient lines (method steps, titles, "2 personer" servings). **Keep it simple** — a line-splitter with a small ignore-list, not a parser.

3. **Manual mapping UI** — for each extracted ingredient line, show:
   - A **product picker** (search `Product` by name, reuse Task 018's picker) to link it to a product, OR
   - **Free-text** with quantity (amount + unit) as the fallback
   - The quantity is prefilled best-effort (parse "250 g" → amount 250, unit g), user can correct it

4. **"Save as list"** — creates a `List` (name = recipe name) with the mapped `ListItem`s in one go.

5. **Suggested match (nice-to-have, cheap)** — for each ingredient, show the top product match as a default so the user mostly clicks "confirm" instead of searching. Reuse `normalizeName` + exact-name match from Phase 2. Don't over-engineer this; a best-effort suggestion is fine.

## Important

- **Manual mapping, NOT AI parsing** — the plan says this explicitly. Do not build an LLM/ingredient-parser here. A line-splitter + product-picker + free-text fallback is the scope.
- **Danish ingredient names** — "løg", "hakket oksekød", "piskefløde". The product search must handle these.
- **Partial matches are fine** — an ingredient with no product match becomes a free-text item. Don't block the recipe import on any single item matching.
- **Reuse Task 018's product picker** — don't build a second one.
- **Don't build templates or the madplan here** — those are Tasks 020/023. This is the manual import path.

## Acceptance criteria

- [ ] Pasted recipe text is split into ingredient lines (method/title lines ignored)
- [ ] Each ingredient maps to a product (via picker) OR free-text with a structured quantity
- [ ] Quantity is prefilled best-effort from the text ("250 g" → amount 250, unit g)
- [ ] "Save as list" creates one `List` with all mapped `ListItem`s
- [ ] Danish ingredient names match the product catalog where a match exists; otherwise free-text
- [ ] `vp check` + `vp test` pass
