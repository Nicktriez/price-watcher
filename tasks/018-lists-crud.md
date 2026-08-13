# Task 018 — Lists CRUD (List, ListItem)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 4 (Task 1)

## Objective

The core product's foundation: **users create lists** (shopping lists, recipes, cleaning supplies, whatever) and the items on them. This is the thing the basket math (Task 021+) ranks stores against — without lists, "cheapest store for my basket" has nothing to compute. The `List`/`ListItem` tables already exist in the schema (created in Phase 1 so the schema was stable); this task is the CRUD + UI that makes them usable.

## Context

A list is **per-user** (tied to the signed-in user via magic-link from Phase 3). A `ListItem` is either a **product** (linked to `product.id` so basket math works) or a **free-text item** with a quantity ("spaghetti 500g ×2" where no product match exists yet). Both must be supported.

**Sequencing:** depends on identity (Task 010) for per-user scoping. Standalone — does not need the receipt pipeline or basket math, but those later tasks depend on this one's data.

## What to build

1. **List CRUD routes** (e.g. `src/routes/lists/`, `src/routes/lists/[id].tsx`):
   - Create a list (name, optional type)
   - Rename / delete a list
   - List all the user's lists
   - Each list scoped to `user_id` from the session — never cross-user

2. **ListItem CRUD:**
   - Add an item to a list: either a **product** (search/match a `Product`) or **free-text** with quantity
   - Quantity: numeric amount + unit ("500 g", "2 stk") — store as structured fields, not a string blob
   - Remove an item; edit quantity
   - Reorder items (cheap — an `order`/`position` int)

3. **Empty-state onboarding** (points to Phase 4 Task 2b's templates later, but for now): "start blank list" is the fallback. Don't block on templates existing — a blank list must work standalone.

4. **Product picker** (minimal): a search box that matches against `Product` by name (reuse Phase 2's `normalizeName`/matching approach). If no match, fall back to free-text. Don't block the whole flow on a failed match.

## Important

- **Per-user scoping is non-negotiable** — every query filters on session `user_id`, like the spending view (Task 015). No cross-user list access.
- **Product-linked AND free-text items** — the free-text fallback is what makes lists usable before the product catalog is complete. Don't require a product match.
- **Quantity as structured data** (amount + unit), not a string — the basket math needs to sum "500 g" and "1 kg" correctly later.
- **Don't build basket math, templates, or the madplan here** — those are Tasks 019/020/021/022/023. This task is pure list management.
- The schema exists; add a migration **only if** a field is genuinely missing (e.g. `order`/`position`, or a `type` column on `List`).

## Acceptance criteria

- [ ] Signed-in user can create / rename / delete a list and see all their lists
- [ ] List items are either product-linked or free-text with a structured quantity (amount + unit)
- [ ] All queries are scoped to the session `user_id` (no cross-user data)
- [ ] Empty state shows "start blank list" (works standalone, no templates required)
- [ ] A 10-item list can be created entirely via UI without requiring a product match for every item
- [ ] `vp check` + `vp test` pass
