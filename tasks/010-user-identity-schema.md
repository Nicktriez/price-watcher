# Task 010 — User Identity (Magic-link) + Receipt Schema

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 3 (Task 4 = user identity, Tasks 2/3 = receipt schema) + `src/db/schema.ts`

## Objective

Two foundations that Phase 3 depends on: **(1) a lightweight user identity** (magic-link / email-OTP, no full auth) so receipts can be tied to a `user_id`, and **(2) the receipt + baseline-price schema**. Everything else in Phase 3 builds on these.

## Part 1 — User identity (magic-link, NO full auth)

Per the plan: **magic-link / email-OTP only. No passwords, no reset, no social login, no roles.** This is deliberately minimal — just enough identity that receipts, the spending view, and gamification can be per-user.

Build:
1. **A `user` table** (migration):
   - `id` — PK, uuid
   - `email` — text, unique
   - `created_at`, `updated_at` — timestamptz

2. **Magic-link / OTP sign-in flow**:
   - User enters their email → server generates a one-time code/link → email it (dev: log it to console)
   - User clicks/enters it → signed in, session cookie issued
   - A `login_token` (or equivalent) table or column — short-lived, single-use
   - Session handling: a signed cookie (SolidStart session) holding `user_id`

Keep it boring and minimal. Don't add password hashing, reset flows, or roles. The point is identity, not auth machinery.

## Part 2 — Receipt schema

Now that `user` exists, `receipt.user_id` is a **real FK** (NOT nullable-deferred like before):

1. **`receipt` table**:
   - `id` — PK, uuid
   - `user_id` — FK to `user`, NOT NULL (identity now exists)
   - `store_id` — nullable FK to `store`
   - `chain_id` — nullable FK to `chain`
   - `store_name` — text, the OCR-extracted store name
   - `receipt_date` — date, nullable
   - `total` — numeric, nullable (the anchor value)
   - `currency` — text, default 'DKK'
   - `confidence` — jsonb, nullable (per-field OCR confidence)
   - `image_path` — text, nullable (short-lived; deleted after parse)
   - `source` — 'receipt' | 'import', default 'receipt'
   - `trust_tier` — 'community' | 'single', default 'community' (NOT official)
   - `created_at`, `updated_at` — timestamptz

2. **`receipt_item` table**:
   - `id` — PK, uuid
   - `receipt_id` — FK to `receipt`, NOT NULL
   - `product_id` — nullable FK to `product`
   - `name` — text
   - `quantity` — text, nullable
   - `unit` — text, nullable
   - `price` — numeric, nullable
   - `raw_line` — text (audit)
   - `status` — 'clean' | 'garbled' | 'wrapped' (the three OCR failure modes)
   - `confidence` — 'high' | 'medium' | 'low'
   - `created_at` — timestamptz

3. **Baseline prices** — reuse `price_point` with a `source` column ('offer' | 'receipt') so receipt-derived prices are distinguishable from offers. Add `source` to `price_point` if not present.

## Important

- **User identity is the early dependency** — this task must land before the upload flow (Task 012) so uploads can be tied to a user.
- **`trust_tier` is NOT 'official'** — receipts are community/single crowd data. Enforces the data/legal boundary.
- **`receipt_item.status` encodes the three OCR failure modes** (clean/garbled/wrapped) from the spike.
- Don't build anything beyond magic-link identity — no password auth, no roles, no reset.

## Acceptance criteria

- [ ] `user` table exists; magic-link/email-OTP sign-in works and issues a session
- [ ] Login without password (only email + one-time link/code)
- [ ] Migration adds `receipt` + `receipt_item` tables with the exact columns above
- [ ] `price_point` has a `source` column (or a `baseline_price` table exists)
- [ ] `pnpm db:migrate` runs clean, re-run is a no-op
- [ ] `vp check` + `vp test` pass
