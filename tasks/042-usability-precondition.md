# Task 042 — Usability Precondition: Three Core Flows Navigable Without Help

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7a (Task 042) — **the gate BEFORE inviting anyone to the closed beta**

## Objective

Make the three core flows **navigable by a non-technical user without being walked through it**:

1. **Build a list** (create a list, add items) → `src/routes/lists/`
2. **Upload a receipt** (photo → OCR → parsed) → `src/routes/upload.tsx`
3. **View a store comparison** (a list produces a store ranking) → `src/routes/compare/[id].tsx`

This is a **navigability bar, not a beauty bar** — if a user gets stuck on "can't find the button," beta measures usability, not retention, and the M1 signal (≥30% return) is polluted. **This task must be DONE before any beta invite goes out.**

## Context

The features all exist (Phases 1–6). The gap is **discoverability and completion** — a brand-new, non-technical user landing on the site cold must be able to do these three things without help. The temporary dev-navbar (Tasks 033/034) gives links to the pages, but cold usability is about whether a stranger can _find the path_ and _finish each flow_ without stumbling.

## What to build

Treat this as a **guided cold-test then fix**:

1. **Walk the flows as a first-time user** (this is the audit). For each of the three flows, trace: where does a new user land? Is there an obvious entry point (button/link) to start? Can they complete the whole flow without a dead end, confusing label, or missing affordance?
2. **Fix the blockers that stop a cold user** — anything that prevents reaching the end of a flow:
   - No obvious way to start (missing CTA, buried entry point, no empty-state guidance)
   - A step that dead-ends (button does nothing, route not reachable, no "next" affordance)
   - Confusing labels a non-technical Dane wouldn't parse (English leakage, jargon)
   - A flow that works only if you already know the URL
3. **The specific cold-start gaps to check** (common here):
   - Empty state on `/lists` — does a first-timer see "Opret din første liste" (create your first list), or a blank page?
   - After uploading a receipt, is the path to the spending view / "what now" obvious?
   - Does `/compare` have a clear "pick a list to compare" empty state rather than a dead route?
4. **Danish, plain labels** for every affordance (no English leakage — this pairs with Task 041 but must not wait for it).

## Important

- **Blockers only, not polish** — fix what _stops_ a flow. Visual polish is Phase 9 (Task 036), NOT this task. Don't restyle; make it findable and finishable.
- **Do NOT rely on the dev-navbar** — a beta user doesn't have your context. The flows must be reachable from wherever a cold user lands (home / empty states / clear CTAs), not only from a nav link.
- **Measure it honestly** — the acceptance is a cold non-technical user completing all three flows unaided. If you can't test with a real person, at least walk it as a stranger and remove every dead end you find.
- **This gates the beta** — nothing is invited until this passes. This is the difference between measuring retention and measuring usability.

## Acceptance criteria

- [ ] A first-time user can **build a list** (create + add items) without help — obvious entry point + empty-state guidance, no dead ends
- [ ] A first-time user can **upload a receipt** (photo → OCR → parsed) without help — reachable path, clear affordances, works from cold start
- [ ] A first-time user can **see a store comparison** for a list without help — clear "compare this list" path, sensible empty state
- [ ] Every entry point / CTA is plain Danish, no English leakage
- [ ] No flow requires knowing a URL by heart (all reachable from home / empty states / CTAs)
- [ ] `vp check` + `vp test` pass
