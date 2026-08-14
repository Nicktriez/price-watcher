# Task 037 — Branding (Skujeg)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7b (Task 2)

## Objective

Lock the **brand identity**: the name (**Skujeg** — "Sku' jeg?" / "Should I?", chosen 2026-08-14), a simple logo/wordmark, and the primary UI copy tone (Danish, direct, honest — matching Nick's blog voice). Plus favicon + page titles.

## Context

The domain is `skujeg.dk` (bought 2026-08-14); beta subdomain `beta.skujeg.dk`. The brand is the travel-question differentiator ("should I drive to Lidl?") made into a name. This task makes that name visible in the product.

## What to build

1. **Favicon + page titles** — every route's `<title>` and the favicon use Skujeg branding. Danish, short, correct.
2. **Logo / wordmark** — a simple, clean Skujeg wordmark (text-based is fine; no external asset needed unless Nick wants one). Consistent with the winning design-system tokens (Task 036).
3. **UI copy tone** — sweep user-facing copy to a Danish, direct, honest voice (matching the blog). Fix any remaining English or stiff phrasing. No hype, no corporate filler.
4. **The brand question** — the tagline/strapline should land the "Sku' jeg?" (Should I?) hook naturally where it fits (e.g. home / about), without overdoing it.

## Important

- **Name is locked as Skujeg** — do not revert to "Kurven" or anything else.
- **Danish-first** (see Language policy in the plan): copy is Danish. This is NOT the full English-i18n task.
- **Simple > elaborate** — a text wordmark + favicon is enough. Don't build a logo system.
- **Consistent with Task 036** — use the winning tokens; branding should feel like the same product.

## Acceptance criteria

- [ ] All page titles + favicon use Skujeg branding
- [ ] A simple Skujeg wordmark/logo exists, consistent with the design system
- [ ] User-facing copy is Danish, direct, honest — matches the blog voice, no English leakage (see Danish-consistency Task 041 for the full sweep; this is branding copy)
- [ ] "Sku' jeg?" hook lands naturally where it fits
- [ ] `vp check` + `vp test` pass
