# Task 036 — Basic Design + Correct Route Linking (Phase 7a)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7a (the last coding hurdle before the beta)

## Objective

Make the site **presentable enough for a non-technical beta user** and ensure **every route is linked correctly**. This is the _basic_ design pass that pairs with Task 035 (usability). It is NOT the full design system (that's Phase 9, only if the beta succeeds). **Basic + correct beats polished + broken here.**

## Context

Phase 7a is the last coding hurdle before inviting real people. Task 035 makes the three core flows _navigable_; this task makes them _presentable_ and _correctly reachable_ by link. The temporary dev-navbar (Tasks 033/034) gave testing shortcuts — those must not be what beta users rely on.

## What to build

1. **A clean, consistent basic layout** — a coherent navbar with **real product links** (not dev links), a sensible home page that tells a first-time user what the site is, and consistent page structure. Plain Danish. No ad-hoc mess, but no full design system either — this is "looks intentional," not "ships a brand."
   - **The home page itself is handled by Task 037 (landing page).** This task establishes the _global layout + nav_; 037 fills in the home page content.
2. **Correct route linking** — every nav/footer/CTA link resolves. Walk every public route and confirm: no dead links, no wrong targets, no link that only works because you typed the URL. Home → clear paths to lists, upload, compare (via the list page), report, sign-in.
3. **Build the REAL nav and supersede the dev-navbar** — the temp links from Tasks 033/034 (`Lists`, `Settings`, `Madplan`, `Spending`, conditional sign in/out) currently ARE the nav. This task replaces them with the actual launch navigation: **Home, Offers, Lists, Upload, Report, About, Sign in/out**, correctly labelled in Danish. The dev links (033/034) are superseded — keep the ones that are real product pages, drop the pure-dev ones, and note in the code that the `// TEMP: dev links` block is being replaced by real nav. (Task 045 covers the full English-to-Danish sweep of labels; this task makes the nav's labels correct.)
4. **The brand question, lightly** — "Sku' jeg?" (Should I?) lands naturally on the home page (that's Task 037's job; here just ensure nav/branding consistency, not the full Phase 9 branding).

## Important

- **Basic, not the full design** — visual polish + full branding is Phase 9, gated on beta success. Don't build the design system here. This is "a beta user isn't embarrassed to look at it."
- **Links must resolve** — a broken link is a beta-blocking bug (matches the usability gate). Verify, don't assume.
- **Danish, plain labels** — no English leakage (pairs with Task 045 but must not wait for it).
- **Compliance labels intact** — trust-tier "user-reported"/"Community" labels stay correct (don't lose them in the layout pass).

## Acceptance criteria

- [ ] A clean, consistent basic layout exists (navbar, page structure) — looks intentional
- [ ] The REAL nav replaces the dev-navbar (033/034): Home, Offers, Lists, Upload, Report, About, Sign in/out, Danish labels
- [ ] Every public route is reachable by a real link (no dead links, no URL-only routes) — walk-through verified
- [ ] Navigation works without the dev-navbar shortcuts
- [ ] Plain Danish labels, no English leakage
- [ ] Trust-tier labels remain correct
- [ ] `vp check` + `vp test` pass
