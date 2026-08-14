# Task 044 — Privacy Policy + GDPR Page (Phase 7b legal gate)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7b (legal before releasing)

## Objective

Add a **privacy policy page in Danish** covering what the site collects and why — the GDPR requirement that must be in place **before inviting any real beta user**. Also add minimal cookie/consent handling if any tracking is present.

## Context

The site collects real personal data: **email** (magic-link sign-in), **receipt images** (personal data — deleted after parse per Task 013), and **home address** (OSRM routing, Task 025 — used only for distance). Before real users join, a Danish privacy policy is non-negotiable. This is the legal gate for Phase 7b.

## What to build

1. **A `/privacy` route** (and a link to it — footer) with the privacy policy **in Danish**. Must state, plainly:
   - What data is collected: email, receipt images, home address
   - Why: sign-in, receipt parsing, distance calculation
   - How long it's kept: receipt images deleted after parse (Task 013); other data as described
   - That data is never sold; receipt images are not exposed
   - Contact for data requests (Nick's email)
2. **Cookie/consent handling** — only if the site actually sets non-essential cookies/tracking. If it uses none beyond what's strictly necessary (session cookie for sign-in), state that. Do NOT add a cookie banner for a single necessary session cookie — that's over-engineering. Verify what cookies exist and handle accordingly.
3. **Wire the address-collection privacy note** — the settings/home-address flow (Task 025) already has a privacy note; confirm it's consistent with the policy.

## Important

- **Content is legal-ish — get Nick's sign-off.** Ultron/OpenCode drafts the policy from what the code actually does; **Nick reviews and approves the final text** (it's his legal exposure). This is a deliverable with a human approval gate, not a code-only task.
- **Accurate, not generic** — the policy must describe what the code _actually_ does (deletion after parse, address used only for distance). Don't copy a template that overclaims or underclaims.
- **Danish** — per the language policy. The privacy policy is user-facing legal text in Danish.
- **No full GDPR machinery** — this is a policy page + accurate cookie handling, not a consent-management platform. Boring on purpose.

## Acceptance criteria

- [ ] `/privacy` route exists with a Danish privacy policy covering email, receipt images, address; how long kept; never sold; contact
- [ ] Policy accurately reflects code behavior (receipt deletion, address distance-only use)
- [ ] Cookie handling matches reality (no banner for a single necessary session cookie; consent added only if non-essential cookies exist)
- [ ] Link to the policy in the footer
- [ ] Home-address privacy note (Task 025) consistent with the policy
- [ ] **Nick approved the policy text** (human gate)
- [ ] `vp check` + `vp test` pass
