# Task 012 — Signed-in Receipt Upload Flow + Baseline Price Writing

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 3 (Task 1, Task 3, Task 4) + `docs/setup-dev.md`

## Objective

The user-facing path: **signed-in user photographs a receipt → upload → OCR → parse → write baseline prices tied to their `user_id`.** This wires Task 010's identity + schema and Task 011's OCR engine into a working flow.

## Context

Phase 3 is the crowd-data moat — receipts are the highest-quality, Tjek-independent data. The retention hook is that a user's receipts become _their_ spending history. So uploads are **tied to a signed-in user** (Task 010's magic-link identity), NOT anonymous.

**Sequencing:** depends on Task 010 (identity + schema) + Task 011 (OCR engine). Don't start until those exist.

## What to build

1. **Require sign-in** — the upload route checks the session cookie (from Task 010). If not signed in, redirect to the magic-link flow. The upload is attributed to the logged-in `user_id`.

2. **Upload route** (e.g. `src/routes/upload.tsx` or a POST API route): accepts a receipt image (JPEG/PNG), responsive web form, no app needed.

3. **Store the image** temporarily → run Task 011's OCR → parse → produce `receipt` + `receipt_item` rows, with `user_id` set from the session.

4. **Write baseline prices** — for each clean item, upsert into `price_point` with `source='receipt'`: product, store, price, observed_at.

5. **Trust-tier + GDPR from day one:**
   - `receipt.trust_tier = 'community'`/'single' (NOT official)
   - **Image deleted after parse** — keep only extracted numbers. If OCR fails, tell the user and delete the image anyway.

6. **Feedback:** after upload, "we parsed X items from your receipt." Honest about clean vs garbled (don't pretend a crumpled receipt parsed perfectly).

## Same-receipt dedup (CRITICAL — build this in)

A user may upload the same physical receipt more than once — a **better** re-scan, a **worse** re-scan, or an **accidental double-tap**. The load-bearing rule: **one physical receipt = one baseline price record = points awarded once.** Without this, `price_point` inflates with duplicate observations and users can farm points by re-uploading.

1. **Fingerprint** each receipt by content (NOT image hash — re-photographing changes pixels): `(user_id, store_name, receipt_date, total)`, optionally + item count or first-item name as tiebreaker. These fields survive even crumpled/faded receipts (per the OCR spike: store + total are the most reliable).
2. **On match, replace-or-keep, never both:**
   - Better image (higher confidence) → **replace** old rows with the new parse; points awarded once
   - Worse image → **keep** the original; don't downgrade
   - Identical (double-tap) → silent dedup, "you already uploaded this receipt"
3. **Do NOT dedup cross-user** — two people in a household uploading the same receipt is _desired_ for the community trust tier (multiple reports agree). Different `user_id` = separate observations.
4. **Feedback** should make retries feel rewarded: "your re-scan was cleaner" is encouragement, not a punish.

## Important

- **Signed-in only** — no anonymous uploads. This is what makes receipts a retention loop (they're tied to a user's spending history).
- **Product matching** — receipt item name → `product.id`. Start simple (exact-ish via the Phase 2 `normalizeName`). Unmatched → `product_id = null`, flagged for later. Don't block the whole upload on a failed match.
- **Delete the image after parse.** Non-negotiable (GDPR).
- Don't build the spending view or gamification here — those are separate tasks (014, 015).

## Acceptance criteria

- [ ] Upload requires sign-in (redirects to magic-link if not logged in)
- [ ] Upload route accepts an image, runs OCR + parse, writes `receipt` + `receipt_item` with the signed-in `user_id`
- [ ] Clean items upsert into `price_point` with `source='receipt'`
- [ ] `trust_tier` is `community`/`single` (never `official`)
- [ ] **Re-uploading the same receipt (by fingerprint) does NOT create duplicate baseline prices or re-award points** — replace-or-keep, better parse wins
- [ ] Image is deleted after parse (`image_path` cleared, no lingering file)
- [ ] User gets honest feedback on how many items were recovered
- [ ] `vp check` + `vp test` pass
