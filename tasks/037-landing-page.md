# Task 037 — Landing Page (first-time user home)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7a (make the site presentable + navigable for a non-technical beta user)

## Objective

Rebuild `src/routes/index.tsx` into a **landing page** that a first-time, non-technical visitor can understand in seconds: what the site is, why it's worth using, and where to start. The current home page is a bare offer list ("Current offers" + a chain filter) that explains nothing — a cold visitor has no idea what the product is or what to do.

## Context

Task 035 makes the flows navigable; Task 036 makes the layout consistent; **this task makes the home page actually communicate the product.** The brand is **Skujeg** — "Sku' jeg?" (Should I?) — the travel-question differentiator ("should I drive to Lidl?"). The home page is where that hook lands. This is basic (Phase 7a), not the full design (Phase 9, gated on beta success) — but it must tell a non-technical Dane what the site is and where to go.

## What to build

Replace the offer-list-only home with a landing page that has:

1. **A hero that explains the product in one sentence** — e.g. "Skujeg finder den billigste butik til din indkøbskurv" (finds the cheapest store for your basket), with the "Sku' jeg?" hook landing naturally. Plain Danish, no jargon, no corporate filler.
2. **Clear entry points to the core flows** — buttons/links to: build a list, upload a receipt, view offers. These are the paths from Task 035 — the landing page is where a cold user discovers them. Use the same routes (`/lists`, `/upload`, `/`-offers).
3. **A short "what you get" section** — 2–4 honest bullets: cheapest store for your basket, your spending tracker from receipts, price-vs-average, "is it worth driving to the store?" No hype.
4. **The offers list stays accessible** — don't delete the existing offer browsing; it moves below the hero (or becomes a section). Current-offers is still useful, just not the _only_ thing.
5. **Sign-in affordance** — a clear "Log ind" / "Opret profil" entry (magic-link, Task 010) since the product flows require it. A first-time user should see where to sign in.

## Important

- **Basic, not the full design** — this is a functional landing page in the basic layout (Task 036), NOT the design system (Phase 9/Task 040). Don't invent the final brand identity here; just make it communicate + guide.
- **Plain Danish** — no English leakage (pairs with Task 045).
- **Guide, don't overwhelm** — a non-technical user should know where to click. One clear primary action (e.g. "Start med en liste").
- **Don't break the offer browsing** — keep `/` offers reachable (it's the data showcase).
- **Compliance labels intact** — if any trust-tier / offer labels appear on the landing page, keep them correct.

## Acceptance criteria

- [ ] Home page (`/`) is a landing page: hero explains the product + lands the "Sku' jeg?" hook
- [ ] Clear entry points to build a list, upload a receipt, and browse offers
- [ ] A "what you get" section (2–4 honest bullets) in Danish
- [ ] Offer browsing still accessible (not deleted, just moved below/alongside the hero)
- [ ] Sign-in affordance visible
- [ ] Plain Danish, no English leakage
- [ ] `vp check` + `vp test` pass
