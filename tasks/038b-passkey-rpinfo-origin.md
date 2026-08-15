# Task 038b — Fix Passkey rpId/Origin Behind Reverse Proxy

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7b (deploy) + 037e (passkey). **Bug found 2026-08-15** during beta deploy verification.

## Objective

Fix WebAuthn passkey sign-in failing on `beta.skujeg.dk`. Both **register** and **login** silently fail (the browser shows nothing). Root cause: the server sends the wrong `rpId` behind the nginx reverse proxy, so the browser rejects every ceremony.

## Context / root cause (verified 2026-08-15)

`src/server/auth.ts` → `rpInfo()` derives the WebAuthn `rpId`/origin from `event.request.url`:

```ts
function rpInfo(): { origin: string; rpID: string } {
  const event = getRequestEvent();
  const url = event?.request?.url;
  const origin = url ? new URL(url).origin : (process.env.ORIGIN ?? "http://localhost:3100");
  return { origin, rpID: new URL(origin).hostname };
}
```

Behind the nginx proxy, the request URL the app sees is the **internal** one (`http://127.0.0.1:3000/...`), so `origin` resolves to `http://127.0.0.1:3000` and `rpID` becomes **`127.0.0.1`**. The browser page is on `https://beta.skujeg.dk` and requires `rpId` to equal its own host — so it rejects the `navigator.credentials.create`/`get` call. Both registration and authentication fail, and the `NotAllowedError`/`AbortError` branch in `signin.tsx` clears the error message, making it look like nothing happened.

The code already has a `process.env.ORIGIN` fallback — **but it's dead**: it only runs when `event.request.url` is _absent_, which never happens (the URL is always present, just internal). So setting `ORIGIN` alone won't help with the current code; the precedence must change first.

## What to build

Change `rpInfo()` in `src/server/auth.ts` so **`process.env.ORIGIN` takes precedence when set**, falling back to the request URL only when unset:

```ts
function rpInfo(): { origin: string; rpID: string } {
  const url = getRequestEvent()?.request?.url;
  const origin = process.env.ORIGIN ?? (url ? new URL(url).origin : "http://localhost:3100");
  return { origin, rpID: new URL(origin).hostname };
}
```

- `rpID` must be `beta.skujeg.dk` in production (set `ORIGIN=https://beta.skujeg.dk` in the box's `.env`).
- In local dev (no `ORIGIN` set), behavior is unchanged: `http://localhost:3100` → `rpID = localhost`.

## Important

- **`rpID` must equal the host the user is on.** It's the WebAuthn "Relying Party ID" — the browser refuses to create/use a credential whose `rpId` isn't its own host. `127.0.0.1` vs `beta.skujeg.dk` is the entire failure.
- **Don't hardcode `beta.skujeg.dk` in the code** — use `process.env.ORIGIN` so it stays correct in dev (`localhost`) and prod (`beta.skujeg.dk`). The code is country/brand-neutral; don't bake the domain into it.
- **Do not change the ceremony logic** — only `rpInfo()`'s origin resolution. The rest of `auth.ts` (challenge storage, counter check, session) is correct.
- The `process.env.ORIGIN` precedence is the only change. Everything else in `auth.ts` stays as-is.

## Acceptance criteria

- [ ] `rpInfo()` returns `rpID = beta.skujeg.dk` when `ORIGIN=https://beta.skujeg.dk` is set
- [ ] `rpInfo()` returns `rpID = localhost` in dev when `ORIGIN` is unset
- [ ] No hardcoded `beta.skujeg.dk` in the code (domain comes from env)
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified on the box: browser register/login completes with `rpId: beta.skujeg.dk` (verify via the WebAuthn options the server sends)
