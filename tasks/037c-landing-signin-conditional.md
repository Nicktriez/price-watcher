# Task 037c — Landing Page: Hide/Replace "Log ind" for Authenticated Users

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7a, Task 037/037b (follow-up bug fix, 2026-08-14)

## Objective

Fix a bug: the landing page shows the **"Log ind og kom i gang"** button to **everyone**, including already-authenticated users. An authenticated user can click it and land on `/signin` — confusing and wrong. The sign-in affordance must only show to **signed-out** users; signed-in users should see a different, useful action instead.

## Context

Task 037b made the landing page session-free (no `getCurrentUser()`, no auth branching) to remove the signed-in reroute. That fixed the redirect but introduced this bug: the "Log ind og kom i gang" CTA renders unconditionally. The landing page should still be the **same page for everyone** (no redirect, no different layout), but the **sign-in CTA** specifically must be conditional on auth state — a signed-in user has no reason to see a "Log ind" button.

**The SolidStart 2.0 constraint (from 037):** reading the session outside a Suspense boundary doesn't update reactively. So the conditional must be handled in a way that re-evaluates on navigation (e.g. a `createAsync(() => getCurrentUser())` resource consumed inside the component, or the same pattern Nav.tsx uses for the sign in/out button). Reuse whatever Nav.tsx does for its conditional sign in/out — that already works.

## What to build

1. **Make the landing's sign-in CTA auth-aware** in `src/routes/index.tsx`:
   - **Signed-out:** show the current "Log ind og kom i gang" button (→ `/signin`), plus the existing secondary CTAs.
   - **Signed-in:** do NOT show "Log ind og kom i gang". Instead show a signed-in action — e.g. **"Opret indkøbsliste"** (→ `/lists`) or **"Se ugens tilbud"** (→ `/offers`) as the primary button. The exact signed-in primary CTA is Nick's call; default to "Opret indkøbsliste" (→ `/lists`).
2. **Same page for everyone** — keep the rest of the landing identical for signed-in and signed-out (hero, what-you-get, how-it-works, and the other CTAs). Only the sign-in button is conditional. **No redirect, no layout split.**
3. **Reuse the working session pattern** — mirror how `Nav.tsx` conditionally renders the sign in/out control (the `createAsync` + `getCurrentUser` + Suspense-safe read). Don't invent a new session mechanism.

## Important

- **Don't reintroduce the reroute** — 037b removed `<Navigate href="/offers" />`; it stays gone. This task is only about the **button visibility**, not navigation.
- **Don't rebuild the landing** — only the sign-in CTA is conditional. Keep the hero, other CTAs, what-you-get, how-it-works.
- **The signed-in primary CTA should be useful** — not "Log ind". Default "Opret indkøbsliste" (→ `/lists`) unless Nick says otherwise.
- **Plain Danish** — no English leakage.
- **Compliance labels intact** — if any trust-tier / offer labels appear, keep them correct.

## Acceptance criteria

- [ ] A **signed-out** user sees "Log ind og kom i gang" (→ `/signin`) on the landing
- [ ] A **signed-in** user does NOT see "Log ind og kom i gang" — instead sees a signed-in action (default "Opret indkøbsliste" → `/lists`)
- [ ] The landing is still the same page for everyone (no redirect, no layout split — only the one button differs)
- [ ] Session handling reuses the working Nav.tsx pattern (reactivity-safe)
- [ ] Plain Danish, no English leakage
- [ ] `vp check` + `vp test` pass
