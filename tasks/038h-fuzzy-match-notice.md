# Task 038h — Compare Page: Tell Beta Users Fuzzy Matching Isn't Available Yet

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 9, product task 047 (free-text→product name-matching, planned post-beta) + Phase 7c (beta). Found **2026-08-15** (Nick): beta users may expect free-text items like "Coca-Cola" to match a real offer. That's fuzzy name-matching (Task 047), which is **not built yet**. The compare page must tell users this honestly so it's a set expectation, not a cold surprise.

## Objective

Add a plain-Danish note to the compare page's free-text-unpriced message stating that **fuzzy matching is not available yet** — the site can't yet recognize a free-text name as a real product. This sets expectations for beta users (Phase 7c) and matches the plan's "beta users are told fuzzy matching isn't available yet" decision.

## Context

Task 038g already made free-text items visible as unpriced instead of silently dropped. `src/routes/compare/[id].tsx` now has an all-free-text empty state (lines 108–125) that says (translated): "These items were added as free text and have no price yet, so they can't be compared. Go to the list and add the items as real products (or start from a template) to see a price comparison." It correctly points users to add _real products_. What it does NOT say is _why_ free text can't price — specifically that the site can't fuzzy-match a name like "Coca-Cola" to the real product yet.

## What to build

**Copy-only change** in `src/routes/compare/[id].tsx`, in the all-free-text empty state (the `allFreeText` branch, around lines 108–125). Add a short sentence that explains the limitation. Proposed Danish (Nick to approve wording):

> "Fuzzy-genkendelse er endnu ikke med: Siden kan endnu ikke selv genkende en fritekst-vare (fx 'Coca-Cola') som en rigtig vare. Det kommer senere."

Position it so it reads naturally with the existing text — e.g. after the line explaining they can't be compared, before or alongside the pointer to add real products. Do NOT change the existing message, layout, or the "add as real products" pointer — only add the fuzzy-matching caveat.

## Important

- **Copy-only, no logic.** No data, layout, or behavior changes.
- **Plain, natural Danish**, consistent with the existing message's tone.
- **Honest and brief** — one or two sentences max. Don't over-explain.
- The wording should make clear this is a _current limitation_ that will come later (Task 047), so users know it's planned, not missing.
- This is a beta UX expectation-setter, not a feature. Do NOT build fuzzy matching here (that's Task 047, post-beta).

## Acceptance criteria

- [ ] The all-free-text empty state on `/compare/[id]` includes a note that fuzzy recognition isn't available yet (free-text names like "Coca-Cola" can't be auto-matched to a real product)
- [ ] The note is plain Danish, natural, brief, and reads as a planned-future feature (not a permanent absence)
- [ ] Existing message + "add as real products" pointer unchanged
- [ ] Copy-only change — no logic/layout/data changes
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified live on `beta.skujeg.dk` (free-text-only compare shows the fuzzy note)
