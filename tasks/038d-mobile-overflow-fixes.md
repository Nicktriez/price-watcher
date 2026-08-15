# Task 038d — Fix Elements Overflowing on Mobile (lists page "Opret liste" + sweep)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7b/c (beta usability). Found **2026-08-15** (Nick) during mobile testing.

## Objective

Fix mobile overflow. The known instance: the **"Opret liste" button overflows the viewport on phones** on the lists page (`/lists`). This is a beta usability blocker — Phase 7c Task 0 requires a cold non-technical user to build a list on mobile unaided, and an overflowing button makes that impossible.

## Root cause (verified 2026-08-15)

`src/routes/lists/index.tsx`, the "Eller start en tom liste" form:

```html
<form onSubmit="{handleCreate}" class="flex items-center gap-2">
  <input
    type="text"
    name="name"
    placeholder="Listens navn (fx Ugeindkøb)"
    required
    class="flex-1 rounded border ... px-3 py-1.5 text-sm"
  />
  <select name="kind" class="rounded border ... px-3 py-1.5 text-sm">
    …
  </select>
  <button type="submit" class="rounded bg-sky-600 px-4 py-1.5 text-sm text-white">
    Opret liste
  </button>
</form>
```

It's a single horizontal `flex items-center` row of three fixed-layout elements. On a narrow viewport the `flex-1` input shrinks toward zero, but the `<select>` and the "Opret liste" `<button>` keep their intrinsic width and overflow the right edge of the screen. The form needs to **wrap or stack** below the desktop breakpoint.

## What to build

1. **Fix the lists-page form** so it fits on a phone. Recommended: let it wrap — `flex-wrap` — or stack vertically on small screens (`flex-col sm:flex-row`), so the input, select, and button each fit within the viewport. Keep the desktop single-row layout unchanged at `sm:`+.
   - Ensure the button is fully visible and tappable (≥44px target where feasible), not clipped.
   - `w-full` on the button at mobile width is acceptable if the row stacks.

2. **Sweep the rest of the app for the same class of bug** — any single-row `flex items-center` with a `flex-1` sibling + fixed-width siblings is a candidate to overflow on mobile. Audit at least these pages (the ones a cold beta user hits in the core flows):
   - `/lists` (the known one)
   - `/lists/[id]` (list detail — add-item form, item rows)
   - `/lists/import` (recipe import)
   - `/upload` (receipt upload form)
   - `/report` (report-a-price form)
   - `/compare/[id]` (store comparison — the table/summary)
   - `/signin` (passkey buttons)
   - Any page with a `flex` row containing a text input + button + other control.
     For each, fix only genuine **overflow** (elements clipped or pushing past the viewport width). Do NOT redesign or restyle pages that fit fine — minimal changes, mobile-only where possible.

3. **Guard:** add `overflow-x-hidden` to `body`/`main` **only if** it's needed to stop horizontal scroll — but do not use it as a blanket mask that hides clipped content. The real fix is making elements fit, not hiding the overflow.

## Important

- **Fix the actual fit, don't mask it** — a `<button>` that's invisible because it overflowed is not fixed by `overflow-x-hidden`; it must be on-screen and tappable.
- **Minimal diff** — only touch elements that genuinely overflow. The design is fine; this is a fit/overflow fix, not a redesign. Do not change colors, spacing, or copy unless it directly causes the overflow.
- **Plain Danish** — no English leakage.
- **Tailwind only**, using existing breakpoints (`sm:`, `md:`) consistent with the codebase.
- This is a **beta usability fix** (Phase 7c), not Phase 9 design polish.

## Acceptance criteria

- [ ] On `/lists`, the "Opret liste" input + select + button all fit within a ~390px viewport with no horizontal scroll and no clipped button
- [ ] Desktop (`sm:`+): the lists-page form is unchanged (single horizontal row)
- [ ] Sweep done across the listed pages; any genuine overflow fixed (each fix minimal + mobile-only)
- [ ] No `overflow-x-hidden` blanket masking of clipped content (only used where it legitimately stops scroll, never to hide a broken element)
- [ ] Plain Danish, no English leakage
- [ ] `vp check` + `vp test` pass
- [ ] Browser-checked at ~390px across the audited pages (no horizontal scroll, key buttons tappable)
