# Task 037 — Landing Page (the root, for everyone)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7a (make the site presentable + navigable for a non-technical beta user)

## Objective

Make `/` (the root) a **basic landing page for everyone** — signed in or signed out. No reroute. The landing page communicates the product and guides a first-time visitor; offers live at `/offers` under "Tilbud".

## The reroute decision — REVERSED (2026-08-14)

The earlier plan had "signed-in users reroute to `/offers`" and "nav 'Forside' → `/offers` for signed-in users." **That's reversed.** A signed-in user clicking "Home"/Forside and getting bounced to `/offers` was jarring — bad UX. The clean model:

- **"Forside" → `/`** (the landing page) for everyone.
- **"Tilbud" → `/offers`** (the offers list) for anyone who wants offers.
- **No redirect on `/`.** Signed-in users who click Forside just see the landing page. They navigate to offers/lists/upload via the nav like anyone else.

This also removes the SolidStart 2.0 "session read outside Suspense doesn't update reactively" problem entirely — no conditional nav href needed, because the landing is the same for everyone.

## What to build

1. **`/` is the landing page for everyone** — remove the `<Navigate href="/offers" />` signed-in reroute from `src/routes/index.tsx`. The landing renders for all users.
2. **Keep the landing content** — hero that explains the product + lands the "Sku' jeg?" hook; clear entry points (build a list → `/lists`, upload a receipt → `/upload`, browse offers → `/offers`); a "what you get" section; a sign-in affordance (magic-link, Task 010). Plain Danish. (Task 036 already built offers at `/offers` — don't redo that.)
3. **Nav "Forside" → `/`** — confirm `Nav.tsx` "Forside" points at `/` (the landing). No conditional, no session read for the href. "Tilbud" → `/offers` stays.
4. **Back-links** — products/stores/404/about back-links point at `/offers` (or `/` — either is fine for the "home" concept; make it consistent and Danish). No signed-in/out distinction needed.

## Important

- **No reroute, no conditional nav href** — the landing is the same for everyone. This is the whole point of the reversal; don't reintroduce session-dependent behavior.
- **Offers stay at `/offers`** — don't move them back to `/`.
- **Basic, not the full design** — functional landing in the basic layout (Task 036), NOT the design system (Phase 9/Task 040).
- **Plain Danish** — no English leakage (pairs with Task 045). Pagination on `/offers` is `← Tidligere` / `Næste →`.
- **Compliance labels intact** — if any trust-tier / offer labels appear, keep them correct.

## Acceptance criteria

- [ ] `/` renders the landing page for **everyone** (signed in or out) — no redirect
- [ ] Landing has hero + "Sku' jeg?" hook, entry points to lists/upload/offers, "what you get", sign-in affordance
- [ ] Nav "Forside" → `/`, "Tilbud" → `/offers` — no conditional href, no session read
- [ ] Offers list accessible at `/offers` (filter + pagination intact)
- [ ] Plain Danish, no English leakage
- [ ] `vp check` + `vp test` pass
