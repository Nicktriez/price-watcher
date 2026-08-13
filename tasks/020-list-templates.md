# Task 020 — List Templates (onboarding feature)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 4 (Task 2b)

## Objective

A library of **curated Danish list templates** ("Use template" → clones into the user's own `List`). This is the **onboarding** feature — it lowers the barrier from "I have an idea" to "I have a list that computes a store ranking." The plan is explicit that this is **NOT a storage optimization** (templates aren't shared live to save space); it's about getting a new user to a working, basket-ready list in one click.

## Context

A new user lands and doesn't know what to type. Show them "lasagna, frikadeller + kartofler, taco-fredag, kødsovs, cleaning cupboard, student-budget" — they click one, it clones into their own `List`, and the basket math (Task 021) has something to work with immediately. Culturally native (Danish food) and the empty-state alternative to a blank list.

**Sequencing:** depends on Lists CRUD (Task 018) and the product catalog (Phase 2) so template items can be product-linked.

## What to build

1. **Models:** `ListTemplate` + `ListTemplateItem`:
   - Template items reference **products** (so basket math works), with **free-text + suggested match** as fallback
   - Templates are **read-only, never shared live** — the user's "Use template" clones the rows into their own `List` in **one transaction**; a template is never modified by a user using it

2. **"Use template"** — one action: create a `List` (name = template name) + clone all `ListTemplateItem`s into `ListItem`s, in a single DB transaction. No partial clone.

3. **Empty-state integration** — the lists empty state (Task 018's) now shows: **templates + "start blank list"**. Templates first (the easy path), blank list second.

4. **Seed 5–10 curated Danish templates:**
   - lasagna, frikadeller + kartofler, taco-fredag, kødsovs, cleaning cupboard, student-budget
   - (add 1–2 more if obvious: e.g. burger-fredag, ugens grøntsager)
   - Each with real product-linked items where a match exists in the catalog, free-text otherwise
   - **These are editorial, not technical** — the maintenance cost is keeping product mappings valid as the catalog changes, not writing code

## Important

- **Onboarding, not storage** — the plan stresses this. Do not build template sharing, versioning, or "templates as live lists." A template is a static seed that clones into a real list.
- **One transaction per clone** — no partial "Use template" (half a lasagna list cloned = broken basket math).
- **Read-only templates** — a user using a template never mutates it. Their changes live in their cloned `List`.
- **Free-text fallback + suggested match** — a template item that can't be product-matched becomes free-text; basket math handles both (Task 021).
- **Don't build the madplan or budget solver here** — that's Task 023. This task is the template library + clone action only.

## Acceptance criteria

- [ ] `ListTemplate` + `ListTemplateItem` models exist; templates are read-only, never shared live
- [ ] "Use template" clones template rows into the user's own `List` in one transaction
- [ ] Lists empty state shows templates + "start blank list"
- [ ] 5–10 seeded Danish templates, product-linked where a match exists, free-text otherwise
- [ ] A cloned template immediately works with basket math (items are product-linked or free-text with quantity)
- [ ] `vp check` + `vp test` pass
