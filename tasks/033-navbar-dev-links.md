# Task 033 — Temporary Navbar Dev Links (dev convenience)

**Repo:** `~/price-watcher`
**Plan source:** dev convenience for testing — NOT a Phase 6 product feature. **Remove before launch (Phase 8).**

## Objective

Add temporary links to the navbar so the hidden feature routes are reachable while developing/testing. Currently `src/components/Nav.tsx` only links Home and About — every real route (lists, settings, upload, spending, etc.) must be typed by hand. This makes the main dev flows one click away. **This is scaffolding for testing, not product UI — it comes out before launch.**

## What to build

Edit **`src/components/Nav.tsx`** to add:

1. **Lists** → `/lists` — the core M1 action (build a basket). Highest-value test target.
2. **Settings** → `/settings` — home address + car profile (needed to test the travel-cost verdict, Task 028).
3. **Sign in / Sign out (conditional)** — when NOT authenticated, link to `/signin`; when authenticated, show **"Sign out"** instead. This is the one non-obvious bit (below).

**Do NOT add:** `/upload`, `/spending`, `/madplan`, `/report`, `/leaderboard`, or the dynamic routes (`/compare/[id]`, `/products/[id]`, `/receipts/[id]`, `/stores/[id]`). Those are either reachable from the natural flows (upload/spending link off lists; compare off a list) or need an ID (dynamic). Keep it to the 3 core links.

## The conditional Sign in / Sign out (important)

`src/server/auth.ts` already has `"use server"` at module level, and exports both:

- `getCurrentUser(): Promise<AuthUser | null>` — returns the authenticated user or null
- `signOut(): Promise<void>` — clears the session

Both are callable directly from the client component (no action-wrapping needed — the `"use server"` directive handles the RPC).

**Pattern (matches how `signin.tsx` calls server functions directly from handlers):**

```tsx
const user = createAsync(() => getCurrentUser());
// in the nav:
{
  user() ? (
    <a href="#" onClick={handleSignOut}>
      Sign out
    </a>
  ) : (
    <a href="/signin">Sign in</a>
  );
}
```

With:

```tsx
const handleSignOut = async (e: Event) => {
  e.preventDefault();
  await signOut();
  navigate("/");
};
```

Use `createAsync` from `@solidjs/router` and `useNavigate` for the redirect after sign-out.

## Important

- **Temporary — removed before launch.** This is dev/testing scaffolding. Before Phase 8, strip these links back to a clean navbar. A comment marking it `// TEMP: dev links — remove before launch` is welcome.
- **Reuse the existing `active()` highlighting pattern** in Nav.tsx for the new links so they match Home/About.
- **The `user()` conditional** must handle the loading state gracefully — `user() === undefined` (still loading) should not flash "Sign out" to a logged-out user. Guard so only a resolved `null` shows "Sign in".
- **Don't over-engineer** — this is 3 links + a conditional. No routing changes, no new components, no auth changes.

## Acceptance criteria

- [ ] Navbar shows Home, About, **Lists**, **Settings**
- [ ] When logged out: shows **Sign in** (→ `/signin`)
- [ ] When logged in: shows **Sign out** instead; clicking it signs out and redirects to `/`
- [ ] New links use the same `active()` highlight styling as the existing ones
- [ ] No loading-state flash: a still-loading `user()` doesn't falsely show "Sign out"
- [ ] `vp check` + `vp test` pass (and the compare page still renders — no hydration regression)
