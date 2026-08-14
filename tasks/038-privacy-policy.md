# Task 038 — Privacy Policy + GDPR Page (Phase 7b legal gate)

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
   - Contact for data requests (Nick's email: `jensen0710@gmail.com`)
2. **Cookie handling — NO banner for the beta.** The site sets exactly one cookie: `pw-session` (the SolidStart auth-session cookie from `useSession` in `src/server/auth.ts`), which is **strictly necessary** for sign-in. Under the Danish Cookie Order (cookiebekendtgørelsen, implementing ePrivacy), strictly-necessary cookies are **exempt from consent** — so no cookie banner is required while that's the only cookie. **Do NOT add a banner now** (that's over-engineering and a false signal).
   - **The privacy policy must state this explicitly, in Danish:** "Vi sætter kun en nødvendig sessions-cookie for at holde dig logget ind; vi bruger ingen sporings- eller analyse-cookies." Make it a genuine trust point, not an omission.
   - **Revisit when:** a cookie banner becomes REQUIRED the moment any non-essential cookie is added — e.g. analytics (Phase 10 measure), ad/tracking pixels, or affiliate-adjacent tracking. At that point add a banner + consent. Not before. Note this trigger in the policy/plan so it's a conscious decision, not an accident.
3. **Wire the address-collection privacy note** — the settings/home-address flow (Task 025) already has a privacy note; confirm it's consistent with the policy.

## Important

- **Content is legal-ish — get Nick's sign-off.** Ultron/OpenCode drafts the policy from what the code actually does; **Nick reviews and approves the final text** (it's his legal exposure). This is a deliverable with a human approval gate, not a code-only task.
- **Accurate, not generic** — the policy must describe what the code _actually_ does (deletion after parse, address used only for distance). Don't copy a template that overclaims or underclaims.
- **Danish** — per the language policy. The privacy policy is user-facing legal text in Danish.
- **No full GDPR machinery** — this is a policy page + accurate cookie handling, not a consent-management platform. Boring on purpose.

## Acceptance criteria

- [ ] `/privacy` route exists with a Danish privacy policy covering email, receipt images, address; how long kept; never sold; contact
- [ ] Policy accurately reflects code behavior (receipt deletion, address distance-only use)
- [ ] Cookie handling matches reality: no banner (only the strictly-necessary `pw-session` cookie); policy explicitly states no tracking/analytics cookies, in Danish; banner-trigger (adding non-essential cookies) noted
- [ ] Link to the policy in the footer
- [ ] Home-address privacy note (Task 025) consistent with the policy
- [ ] **Nick approved the policy text** (human gate)
- [ ] `vp check` + `vp test` pass
