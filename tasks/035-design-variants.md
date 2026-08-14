# Task 035 — Design Variants: 3 Throwaway HTML Mockups

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 9 (Task 0)

## Objective

Produce **3 throwaway HTML mockups** of the two "screenshots that matter" — the **store comparison** (Phase 4 Task 022) and the **madplan** (Phase 4 Task 023) — each taking a **distinct design stance**, so Nick can pick a visual direction by looking before the design system is built. This is NOT a git branch / repo-mutation task.

## Context

The design phase is deliberately sequenced: **choose the direction first (this task), then unify the codebase around it (Task 036).** The winning mockup's tokens feed the design system. Three agents each produce one mockup; Nick picks the winner by looking, not by reading diffs.

## What to build

Three **standalone, self-contained HTML files** (no build step, no framework — just HTML + inline CSS or Tailwind via CDN), one per design stance:

| Mockup                        | Design stance                                       |
| ----------------------------- | --------------------------------------------------- |
| `design-variants/001-...html` | **Calm / editorial / fresh** — "trusted grocery"    |
| `design-variants/002-...html` | **Dense / utilitarian / tool-like** — "pricing app" |
| `design-variants/003-...html` | **Warm / playful / everyday** — "kitchen"           |

Each mockup covers BOTH screens (store comparison + madplan) so Nick compares like-for-like.

**Content requirements (same for all three):**

- **Realistic Danish copy** — real product names ("Kærgården 200g", "Piskefløde 38%"), real prices (kr), real store names (Netto, Føtex, Rema 1000, Lidl). Not Lorem ipsum.
- **Interactive enough to click/hover/toggle** — at least one state transition per mockup (filter, tab, hover). A frozen static image is a worse spike than a sloppy animated one.
- **Trust labels visible:** the community/receipt "user-reported" / "Community" tier badges (from Tasks 014/017) appear in the comparison so the Omnibus-clean labeling survives whatever visual direction wins.

## Important

- **Throwaway by design** — these live in `design-variants/`, never touch `src/`, never a git branch, never merge-conflicted. Two losers are discarded.
- **Distinct stances, not different pixels** — each mockup should be a genuinely different design axis (density / aesthetic / emphasis), not three shades of the same layout.
- **Nick picks by looking** — deliver them as files/screenshots Nick can open side by side. Do not decide the winner yourself.
- **Winner specifies tokens** — the winning mockup must document its actual tokens (palette, type scale, spacing) so Task 036's implementation is mechanical.

## Acceptance criteria

- [ ] 3 standalone HTML mockups exist in `design-variants/`, each a distinct design stance
- [ ] Each covers BOTH the store comparison and madplan screens
- [ ] Realistic Danish content (products, prices, stores); interactive (click/hover/toggle)
- [ ] Trust-tier "user-reported"/"Community" labels appear in the comparison
- [ ] Nick picks a winner by looking; winning tokens documented for Task 036
- [ ] `vp check` passes (no repo code changed)
