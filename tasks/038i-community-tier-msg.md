# Task 038i — Reward Message: "Community" → "Fællesskab" (Tier Consistency)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 7b (beta usability) + Phase 9 Task 045 (Danish consistency). Found **2026-08-15** (Ultron, during batch-deploy verification of 038f/038g/038h).

## Objective

Fix one remaining English/inconsistent tier label. Task 038f unified the trust-tier display label to **Fællesskab** across the client pages (products, reported-items, compare, report, about), but a **server-side** user-facing message still says **"Community"**. This breaks the tier-label consistency that 038f established — a user who sees "Fællesskab" on the product page then gets "Community" in a reward message.

## Root cause (verified 2026-08-15)

`src/server/report.ts:156` returns a user-facing reward message with "Community":

```ts
? `Tak! Din pris hjalp gruppen til Community — du fik ${earned} point.`
```

The 038f sweep covered the 5 client `.tsx` files but this message lives in a server module (`src/server/report.ts`), so it was missed.

## What to build

**Copy-only change** in `src/server/report.ts` (around line 156): change `"Community"` to `"Fællesskab"` in the reward message, so it reads:

```ts
? `Tak! Din pris hjalp gruppen til Fællesskab — du fik ${earned} point.`
```

(Confirm the exact sentence with the surrounding context; the fix is swapping the tier noun, not rewriting the message.)

## Important

- **Copy-only, no logic.** Do not change the points/earned logic or message structure.
- **Match the established tier label** — it's `Fællesskab` everywhere else now (038f decision). Do NOT introduce a variant.
- **Grep the whole `src/` for any other user-facing "Community"** after this fix — the 038f sweep missed server files; verify no other server-side message (report, moderation, crowd-points) still emits "Community" as a display label. Code comments and the `"community"` data value (the tier prop) are fine — those are not display labels.
- Plain, natural Danish; the sentence should read naturally with the label swapped in.

## Acceptance criteria

- [ ] `src/server/report.ts` reward message says "Fællesskab", not "Community"
- [ ] No other user-facing "Community" display label remains in `src/` (server or client)
- [ ] Copy-only change — no logic/data changes; `"community"` data value and code comments untouched
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified live on `beta.skujeg.dk` (report-a-price flow shows "Fællesskab" reward message)
