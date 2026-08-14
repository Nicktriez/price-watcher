# Task 046 — Smart Auth Redirect: Return to the Intended Page After Login

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → post-beta UX improvement (Nick, 2026-08-14). **Runs AFTER the beta (Phase 8 evaluation), not before.** This is polish, not a beta blocker.

## Objective

Fix the auth redirect so a user who hits a **protected page while signed out**, then signs in, is returned to **the page they originally wanted** — not dumped on the landing page `/`.

**The bug today:** an unauthenticated user clicks a shared deep link like `/lists/xyz` or `/compare/[id]`. The route redirects to `/signin`, they log in, and the sign-in flow sends them to `/` (root). Their intended destination is lost. That's jarring — especially for shared links, which is exactly how this site grows (the "Sku' jeg?" + madplan shareable content).

## Context

Every protected route currently does `<Navigate href="/signin" />` (e.g. `lists/index.tsx`, `lists/[id].tsx`, `upload.tsx`, `report.tsx`, and the others that gate on `getCurrentUser()`). The `signin.tsx` flow, on successful login, does `navigate("/")` (or equivalent). So the intended URL is never carried across the login.

**The fix — the standard "return to" pattern:**

1. When a route detects the user is signed out, redirect to `/signin` **carrying the intended destination** as a query param, e.g. `/signin?next=/lists/xyz`.
2. The sign-in flow, on success, reads `next` and navigates there. If there's no `next` (user went to `/signin` directly), fall back to the default (currently `/`, or `/offers` if that's the agreed default — keep consistent with the 037b/037c decision that signed-in home is offers via nav, but the default post-login destination is a separate choice; Nick's call).

## What to build

1. **A small redirect helper** (e.g. in `src/server/auth.ts` or a shared lib): `redirectToSignIn(next?: string)` that returns a `/signin` URL with the `next` query param. Or a helper that builds the `<Navigate>` target. Reuse it across all protected routes so the intent is captured consistently — don't hand-edit each route's `<Navigate href="/signin" />` independently (DRY).
2. **Update the protected routes** to capture their current path (including dynamic segments like `/lists/xyz`) and pass it as `next` when redirecting to sign-in. Every route that gates on `getCurrentUser()` and redirects to `/signin` should carry `next=<its own path>`.
3. **Update the sign-in flow** (`signin.tsx`) to read `next` from the URL on successful login and navigate there. If `next` is absent, navigate to the default (Nick's call — see below). **Validate `next`** — only allow it to be a site-internal path (same-origin, starts with `/`, not `//` or an external URL) to avoid an open-redirect.
4. **Edge cases to handle:**
   - `next` pointing at `/signin` itself → don't loop; ignore it and use the default.
   - `next` containing characters that need encoding → the helper must build a safe query string.
   - A signed-in user who somehow lands on `/signin?next=...` → they're already in; just send them to `next` or the default (no re-login).

## Important

- **After the beta, not before.** This is a post-Phase-8 task. The beta runs with the current simple flow; this improves it for launch/shareable links.
- **DRY** — one helper, not a copy-paste per route. The routes all redirect to sign-in the same way today; make them all use the helper.
- **No open redirect** — `next` must be validated as a same-origin internal path. Never navigate to an arbitrary URL from a query param.
- **Keep it consistent** with the signed-in-home decisions (037b/037c): don't reintroduce the landing reroute. This task is about _post-login destination_, which is separate.
- **Plain Danish** — the sign-in flow copy stays Danish.

## Acceptance criteria

- [ ] An unauthenticated user hitting a protected deep link (e.g. `/lists/xyz`, `/compare/[id]`) is returned to **that exact page** after login — not `/`
- [ ] Going to `/signin` directly still works (default destination after login)
- [ ] `next` is validated as a same-origin internal path (no open redirect)
- [ ] `next=/signin` doesn't loop
- [ ] One shared helper used by all protected routes (no per-route copy-paste)
- [ ] `vp check` + `vp test` pass
