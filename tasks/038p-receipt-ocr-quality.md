# Task 038p — Receipt OCR Quality: Store-from-Address + Price-Column Recovery

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 3 (OCR spike, Task 011/012) + Phase 7c (beta — receipt upload is a core user flow). Found **2026-08-15** (Nick): a perfectly-readable SPAR Broby receipt uploads but parses with **store=null, total=null, only 12.5% item recovery**.

## Context: the crash vs the quality issue

The immediate error ("Vi kunne ikke læse den kvittering") was caused by **Tesseract not being installed on the beta box** (a deploy gap) — fixed by Ultron 2026-08-15 (`apt install tesseract-ocr tesseract-ocr-dan`). OCR now runs without throwing. **This task is the separate quality problem that the crash was hiding:** even with Tesseract working, this SPAR receipt parses poorly.

## Root cause (verified 2026-08-15 on the SPAR Broby receipt)

`src/lib/receipt-ocr.ts`:

1. **Store = null** — `findStore` (line 101) only matches chain names in the OCR _text_ (`CHAIN_PATTERNS`). This SPAR receipt has "SPAR" only in the **logo graphic**, which OCR can't read as text — the OCR text has no "SPAR" token. BUT the OCR _did_ read "STATIONSVEJ 30 / BROBY" and "CVR.NR. 38714295" — enough that a human (or a lookup) knows it's SPAR Broby. **The store detector has no address/CVR fallback.**

2. **Total = null** — `findTotal` (line 178) needs the label "AT BETALE" + a price together. "AT BETALE" appears, but the right-hand price column wasn't recovered alongside it in the OCR.

3. **Item recovery = 12.5%** (4 of 32 items priced) — thermal receipts with **right-aligned price columns** merge/miss the prices. This is the core OCR weakness.

## What to build

1. **Store-from-address/CVR fallback.** When no chain name is found in the OCR text, try to identify the store from the address/CVR. The app has a `store` table with addresses/CVR (from Tjek store sync). Match the OCR'd address/city/CVR against known stores to recover the chain (e.g. "STATIONSVEJ 30, BROBY" + CVR → SPAR Broby → chain SPAR). Return the chain with appropriate confidence, clearly labeled as lower-confidence than a direct chain-name match.

2. **Better price-column recovery.** Improve how the OCR line-parser associates the right-hand price column with the left-hand item description on thermal receipts. This is the highest-value fix (12.5% → target meaningfully higher). Investigate:
   - Whether the current rotation/PSM selection is optimal for this layout.
   - Whether a dedicated "two-column price extraction" pass (description | price) beats the current line classifier.
   - The existing recovery classifier (Task 011) — see why so few lines get a price and improve it.

3. **Verify against the 6 real receipt fixtures** (Task 011/012) — the fix must not regress the existing OCR test fixtures (REMA×3, SPAR×2, Lidl×1). Add the SPAR Broby receipt as a new fixture if it isn't already.

## Important

- **Don't regress the working cases** — receipts that already parse well (store + total + good recovery) must stay working. This is about raising the floor, not breaking the ceiling.
- **Store-from-address is a fallback, not a replacement** — a direct chain-name match (Netto, REMA, Lidl in text) still wins. Address/CVR matching is lower-confidence and only when the name is logo-only.
- **Honest about confidence** — a store recovered from address/CVR shouldn't be shown as high-confidence as one read directly from the receipt text.
- **Receipt upload is a core beta flow** (Phase 7c Task 2 asks users to upload 3–5 receipts) — a receipt that recovers no store and 12.5% of items makes the comparison useless. This is a beta-quality priority.
- Plain Danish for any user-facing text.

## Acceptance criteria

- [ ] The SPAR Broby receipt (logo-only store name) is identified as SPAR (via address/CVR fallback)
- [ ] Its total is recovered
- [ ] Item price recovery on that receipt is meaningfully improved (target: well above 12.5%)
- [ ] The existing 6 receipt test fixtures still pass (no regression)
- [ ] A direct chain-name match still wins over the address/CVR fallback
- [ ] Store recovered from address/CVR is flagged lower-confidence than a direct text match
- [ ] `vp check` + `vp test` pass
- [ ] Deployed + verified live on `beta.skujeg.dk` (uploading the SPAR Broby receipt yields a store + total + better recovery)
