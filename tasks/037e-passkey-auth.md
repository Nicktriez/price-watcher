# Task 037e — Replace Email Magic-Link with Passkey (WebAuthn) Sign-In

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7b (deploy) + Phase 7c (beta). Decision **2026-08-15** (Nick): switch sign-in from email OTP to passkeys.

## Objective

Replace the email magic-link / OTP sign-in with **passkey (WebAuthn)** authentication. The email delivery path was never built (Task 010 scoped it as "dev: log it to console" and production email was never wired) — so magic-link cannot work for real beta users. Passkey removes the email delivery problem entirely: users authenticate with a device passkey (browser/OS/phone authenticator), no SMTP, no email, no code.

This is a **closed beta** (Phase 7c), so the known WebAuthn limitation — no self-serve recovery if a user loses their authenticator — is acceptable: Nick resets manually by deleting the user's credential(s). Do NOT build email/TOTP fallback now (YAGNI for a 10–20 person cohort Nick knows). Note it as a future requirement in the code comment.

## Context

- Current auth is `src/server/auth.ts` ("use server"): email → `requestLoginCode` (creates user + OTP, **only `console.log`s the code**) → `verifyLoginCode` (checks hashed token, sets session). The sign-in UI is `src/routes/signin.tsx` (email step → code step).
- `UserTable` has `email: string` (NOT NULL), plus `points/receipt_count/current_streak/last_receipt_date/home_address/home_lat/home_lon/fuel_type/efficiency/ev_charging/muted` — **all of those are used by other features; keep them.**
- `LoginTokenTable` exists but will become unused after this task (keep the table or drop it in a migration — prefer a migration that drops it so the schema stays honest, but this is a judgment call; if keeping it is less churn, keep it and note it as dead).
- Session handling (`session()`, `getCurrentUser()`, `signOut()`, `SESSION_COOKIE="pw-session"`, `SESSION_SECRET`) stays **unchanged** — only the login method changes.
- The privacy policy (`src/routes/privacy.tsx`, Task 038) currently claims "vi sender dig en login-kode pr. e-mail". This becomes **wrong** after this task — update it (see What to build #5).

## Dependencies

Add:

- `@simplewebauthn/server`
- `@simplewebauthn/browser`

(These are the de-facto standard WebAuthn libraries. Do NOT hand-roll the WebAuthn challenge/attestation — it's a security-critical protocol and these libs are the maintained path.)

## What to build

### 1. Schema: `passkey_credential` table (Kysely migration)

```
passkey_credential:
  id            string PK (uuid)          // our row id
  user_id       string FK user.id         // NOT NULL, indexed
  credential_id string UNIQUE NOT NULL    // the WebAuthn credential.id (base64url)
  public_key    string NOT NULL           // stored public key (base64url, from simplewebauthn)
  counter       bigint NOT NULL           // signature counter, for clone detection
  transports    jsonb NULL                // ["usb","nfc","ble","internal"] from registration
  created_at    timestamptz NOT NULL
  last_used_at  timestamptz NULL
```

Also add a migration step: make `user.email` **nullable** (the user may register with no email). Backfill existing rows are fine (they have emails). Do NOT delete the `email` column — keep it as an optional display/lookup field for now (some users may still give one; the spending/identity features reference `user_id`, not email).

**Migration decision:** add `0018_passkey_credential` (or the next available number — check `src/db/migrations/`). Decide in the migration whether to drop `login_token` (preferred) or leave it.

### 2. Server auth: replace OTP with WebAuthn ceremonies

Rewrite `src/server/auth.ts` to keep session/`getCurrentUser`/`signOut` as-is but replace `requestLoginCode`/`verifyLoginCode` with:

- **Registration (first-time user):**
  - `startRegistration(): { options, userHandle }` — generate a `PublicKeyCredentialCreationOptions` via `@simplewebauthn/server`'s `generateRegistrationOptions()`. Fields: `rpName="Sku' jeg?"`, `rpID = hostname` (the `beta.skujeg.dk` host — derive from request, or `process.env.ORIGIN`/`HOST` so it works in dev on `localhost` too), `user.id` = a stable random 16-byte user handle (store it — you'll need it on login), `user.name`/`user.displayName` (a label — can be "Sku' jeg? bruger" or the email if provided), `attestationType="none"` (do NOT verify attestation statements — we don't need device provenance, keeps it simple), `authenticatorSelection` with `residentKey="required"` + `userVerification="preferred"` (resident key = discoverable credential, so a returning user can sign in without typing anything). Store the challenge (hashed) in a short-lived record — reuse a pattern like the old `login_token` table (a `webauthn_challenge` table with `challenge_hash`, `user_id`, `expires_at`, or extend in-memory is NOT acceptable — must survive across the two-step ceremony; use a DB table).
  - `finishRegistration(attestationResponse)` — call `@simplewebauthn/server`'s `verifyRegistrationResponse()`, verify the expected challenge matches, look up the user by handle, store the credential (`credential_id`, `public_key`, `counter`) in `passkey_credential`, then set the session `{ userId }` and return the user. Returns `{ ok, user } | { ok: false, error }`.

- **Authentication (returning user):**
  - `startAuthentication(): { options }` — generate `PublicKeyCredentialRequestOptions` via `generateAuthenticationOptions()` (allow `userVerification="preferred"`). Store the challenge (DB, as above).
  - `finishAuthentication(assertionResponse)` — `verifyAuthenticationResponse()`, match the `credential_id` to a `passkey_credential`, **check the counter increased** (clone detection — if the returned counter ≤ stored counter, reject), update the counter, set the session `{ userId }`, return the user. Returns `{ ok, user } | { ok: false, error }`.

- Keep `getCurrentUser()`, `session()`, `signOut()` **unchanged** (session mechanics are untouched).
- On registration: create the `user` row (with `points:0, receipt_count:0, current_streak:0, last_receipt_date:null, muted:false, email: null` unless the user optionally provides one). The user row is created on **first registration**, not on every sign-in.

### 3. Sign-in UI: passkey flow

Rewrite `src/routes/signin.tsx`:

- **Single step, no email.** Show a primary button **"Log ind med passkey"** and (for first-timers) a **"Opret en passkey"** / "Opret konto med passkey" affordance. The distinction is: if the user already has a passkey, they authenticate; if not, they register. In practice with `residentKey="required"` + discoverable credentials, a single "Log ind" flow can detect the user via `navigator.credentials.get({ publicKey })` with no email — but keep it simple and explicit for the beta: two clear buttons ("Log ind" / "Opret konto").
- On button click:
  - **Login:** `startAuthentication()` (server) → `navigator.credentials.get({ publicKey: options })` (client, via `@simplewebauthn/browser`'s `startAuthentication`) → send the assertion to `finishAuthentication` (server) → on success `navigate("/")`, on failure show a plain-Danish error ("Kunne ikke logge dig ind. Prøv igen.").
  - **Register:** `startRegistration()` → `navigator.credentials.create({ publicKey })` (via `@simplewebauthn/browser`'s `startRegistration`) → `finishRegistration` → on success `navigate("/")`.
- Handle the browser's `NotAllowedError`/`AbortError` (user cancelled) gracefully — don't throw an ugly error.
- **Plain Danish throughout**, no English leakage (consistent with 037d).

### 4. Navigation / "Log ind" references

- `Nav.tsx` and the landing page (037c) render **"Log ind og kom i gang"** → `/signin`. That path is unchanged (`/signin` now hosts the passkey flow). Just confirm the copy still makes sense ("Log ind" is accurate for passkey; if the landing CTA implies email, adjust the copy minimally — but do not redesign).
- The magic-link sign-in being email-free means the landing's sign-in CTA text should not promise an email. Check `src/routes/index.tsx` + `Nav.tsx` and adjust copy only if it says "vi sender dig en kode" or similar. Otherwise leave it.

### 5. Privacy policy update (Task 038 follow-up)

Update `src/routes/privacy.tsx`:

- Replace the "E-mail-adresse — til at logge dig ind (vi sender dig en login-kode pr. e-mail)" bullet with the new reality: **passkey sign-in**. State, in Danish, something like: _"Log ind sker med passkey (sikkerhedsnøgle på din enhed) — vi sender dig ikke længere en login-kode pr. e-mail."_ If the user can still optionally provide an email (for display/recovery later), say that plainly; if not, remove the email-as-login claim.
- The cookie section (`pw-session`) is **unchanged** — passkey still uses the same session cookie.

## Important

- **HTTPS is mandatory for WebAuthn.** Passkeys only work in a secure context (`https://` or `localhost`). The app must be served over TLS on `beta.skujeg.dk` for this to function at all. Local dev on `localhost` is fine (secure context). Do not test passkey over plain HTTP on a remote host — it won't work.
- **rpID/origin consistency:** the `rpID` used to create the credential must match the origin the user is on. Derive it from the request host (or a `HOST`/`ORIGIN` env var) so it's correct in dev (`localhost`) and prod (`beta.skujeg.dk`). If these mismatch, authentication silently fails.
- **Store challenges in the DB, not in memory** — the two-step ceremony spans two HTTP requests; in-memory state won't survive a serverless/restart boundary and breaks multi-instance. Reuse the pattern the old `login_token` table used (hashed challenge + expiry).
- **Counter check is non-negotiable** — reject authentication if the assertion counter ≤ stored counter (clone/token-attack detection).
- **Attestation `"none"`** — we do not verify attestation statements (no device provenance needed for a consumer beta). This is the standard, simpler choice. Do not block registration on attestation.
- **No recovery fallback now** — no email, no TOTP, no backup codes. For a closed beta this is fine (Nick resets by deleting a user's `passkey_credential` rows). Add a `// TODO(beta): add email or TOTP recovery before public launch` note so it's a conscious decision, not an accident.
- **`user.email` stays nullable-but-present** — do not drop the column; some downstream references may read it. Keep it optional.
- **Don't break existing users/tables** — `receipt`, `list`, `price_point`, etc. all key on `user_id`; they're untouched. Only the login method + the new credential table change.

## Acceptance criteria

- [ ] `passkey_credential` table exists (migration applied); `user.email` nullable
- [ ] `@simplewebauthn/server` + `@simplewebauthn/browser` added; no hand-rolled WebAuthn
- [ ] A user can **register** with a passkey (browser prompt → credential stored → session set)
- [ ] The same user can **sign in** with their passkey on a later visit (assertion verified → session set)
- [ ] Counter-increase check works (a replayed/reused assertion is rejected)
- [ ] `getCurrentUser()` / `signOut()` / `pw-session` cookie still work unchanged
- [ ] Sign-in UI is plain Danish, single clean flow, graceful cancel handling
- [ ] Privacy policy updated to reflect passkey sign-in (no more "vi sender dig en login-kode")
- [ ] Works over HTTPS (or `localhost` in dev); `vp check` + `vp test` pass
- [ ] Migration applied cleanly on the beta box (`pnpm db:migrate`)
