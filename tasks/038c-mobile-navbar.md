# Task 038c — Mobile-Friendly Navbar

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7a/b (usability + beta readiness). Decision **2026-08-15** (Nick).

## Objective

Make the navbar usable on a phone. Currently `src/components/Nav.tsx` renders a single horizontal row of 6 links + auth (`Forside`, `Tilbud`, `Lister`, `Upload kvittering`, `Rapporter en pris`, `Om`, `Log ind/ud`). On a narrow screen it overflows/wraps into a mess. The beta cohort (Phase 7c Task 0: cold non-technical user must navigate the three core flows unaided) will hit this on mobile — a broken nav means beta measures usability, not retention.

## Context

- `src/components/Nav.tsx` is the launch nav (built in Task 036). It's a `<ul class="container flex items-center p-3 ...">` with 6 `<li>` links + a `ml-auto` auth item, all visible at every breakpoint.
- Tailwind `sm:`/`md:` breakpoints are already used elsewhere (Footer, offers grid), so the responsive pattern is established. No hamburger/menu-toggle exists anywhere yet.
- The auth state pattern (`createAsync(getCurrentUser)`, `authVersion` signal, `signOut` → `navigate("/")`) must be **preserved unchanged** — don't touch session logic.
- Nav is rendered by the layout (every route). Keep it a single self-contained component; don't split into per-route variants.

## What to build

Make `src/components/Nav.tsx` responsive with a **hamburger menu on mobile** (the standard, expected pattern — no hidden-overflow cleverness):

1. **Desktop (`md:` and up):** keep the current horizontal row, unchanged behavior. All 6 links + auth visible, active-state `border-b-2` highlight preserved.

2. **Mobile (below `md:`):** show a **hamburger toggle button** (☰ / "Menu") on the right (next to auth), and hide the link row. Tapping the toggle expands/collapses a **vertical dropdown/panel** of the links. Behavior:
   - Links are stacked vertically, full-width, tappable (≥44px tap target).
   - Active link highlighted in the panel.
   - Toggle button has an `aria-expanded` attribute and `aria-label="Menu"` (accessibility — the beta cohort may be using screen readers / large text).
   - Tapping a link **closes the menu** (navigates normally).
   - Auth (Log ind / Log ud) stays visible in both states (either inline on mobile header or at the top of the panel — pick one, be consistent). **Recommend:** keep it in the mobile header next to the hamburger so a signed-out user always sees "Log ind".
   - Clicking outside the open panel (or pressing Esc) closes it — a small outside-click handler, not a library.

3. **State:** a `createSignal(false)` `menuOpen`. Reset to closed on route change (`useLocation().pathname` effect) so navigating never leaves a stale open menu.

## Important

- **Preserve the existing auth pattern exactly** — `createAsync(getCurrentUser)`, `authVersion`, `handleSignOut`, the `Suspense` + nested `Show`. Do not refactor session handling; only restructure layout/visibility.
- **Plain Danish** — no English leakage ("Menu" is acceptable as the standard icon label, but prefer "Menu" stays consistent; do not add English words like "Home"/"Offers").
- **Do not change routes or labels** — Forside `/`, Tilbud `/offers`, Lister `/lists`, Upload kvittering `/upload`, Rapporter en pris `/report`, Om `/about`. Copy stays as-is.
- **Use Tailwind only** — no CSS file additions unless unavoidable; the codebase is utility-first.
- **Touch-friendly** — ≥44px tap targets, no tiny hover-dependent elements on mobile.
- This is a **basic usability fix**, not Phase 9 design-system polish. Keep it simple and consistent with the current sky-800 navbar.

## Acceptance criteria

- [ ] Desktop (`md:`+): navbar renders exactly as before (horizontal, all links + auth, active highlight)
- [ ] Mobile (below `md:`): hamburger toggle shows; links hidden until expanded; tapping toggle expands/collapses a vertical panel
- [ ] Tapping a link navigates **and closes** the menu
- [ ] `aria-expanded` + `aria-label` on the toggle; ≥44px tap targets
- [ ] Outside-click / Esc closes the open menu
- [ ] Menu resets to closed on route change
- [ ] Auth (Log ind / Log ud) visible and functional in mobile view
- [ ] Plain Danish, no English leakage; routes/labels unchanged
- [ ] `vp check` + `vp test` pass
- [ ] Browser-checked at a mobile viewport (e.g. ~390px) and desktop (~1280px)
