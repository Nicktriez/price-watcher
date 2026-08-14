# Task 044 — Honest-UI Consistency Pass

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 9 (Task 5)

## Objective

Ensure the **trust-tier / "user-reported" / "no discount" labeling** (Tasks 014/017/022/030) reads **cleanly and consistently** in the polished design — the compliance framing must survive the visual redesign, not get lost in it.

## Context

The Omnibus-aware labeling (green ✓ Official / yellow Community / grey "user-reported", never "discount") was built across several tasks. After the design-system restyle (Task 040) and branding (Task 041), this pass verifies the labels are still correct, consistent, and visually distinct everywhere they appear — product pages, receipt lines (price-vs-average), store comparison, reported items, crowd prices.

## What to build

1. **Audit every place trust/compliance labels appear** and confirm they're correct + consistent: product pages (offers vs. receipt/crowd baselines), receipt line comparisons (Task 017), store comparison (Task 022), reported items (030b), crowd prices (030).
2. **Fix inconsistencies** — a label that's wrong, missing, or visually indistinct. Ensure the three tiers are always distinguishable (color + wording), and that community/single prices are never called a "discount."
3. **Verify in the new design** — the restyle must not have dimmed the distinction or dropped a label.

## Important

- **Compliance is non-negotiable** — community/single is always "user-reported," never a "discount." This is a legal framing (Omnibus), not a style choice.
- **Consistency across surfaces** — the same tier must look + read the same on product page, receipt, comparison, reported items.
- **Not a restyle** — this verifies and fixes labeling; visual work is Task 040.

## Acceptance criteria

- [ ] Trust labels correct + consistent across product page, receipt lines, store comparison, reported items, crowd prices
- [ ] Three tiers always distinguishable (color + wording)
- [ ] Community/single never called a "discount"; offers still clearly "official"
- [ ] Labels survive the Task 040 restyle (none lost, dimmed, or mislabeled)
- [ ] `vp check` + `vp test` pass
