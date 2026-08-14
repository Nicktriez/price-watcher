# Task 039 — Mobile Check: Receipt Upload Flow

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 9 (Task 4)

## Objective

Verify and fix the **receipt upload + receipt flow** so it's genuinely usable on **mobile** (phone camera), not just desktop. Receipts are uploaded from a phone camera — this is the primary real-world path.

## Context

The beta's onboarding reward is the receipt → spending-view → price-vs-average flow (Phase 3). Users do this from their phone. If upload is broken or painful on mobile, the retention hook (Task 015) is dead before it starts.

## What to build

1. **Test the flow on mobile** (dev tools mobile viewport, or a real phone): upload a receipt photo → OCR → see the parsed receipt → spending view updates → price-vs-average shows.
2. **Fix mobile-blocking issues**: camera/photo-picker usability (accept `capture="environment"` if not present), responsive layout of the upload + parsed-receipt screens, touch targets, image size handling (large photos on a phone must still upload — compression/preview if needed).
3. **Verify the design-system restyle (Task 036) didn't regress mobile** — the upload + receipt screens must be usable in the new design.

## Important

- **Mobile-first for this flow** — it's the real path. Test at phone viewport widths, not just desktop.
- **Photo handling** — phone photos are large; ensure upload doesn't fail or stall on a big image (size limit, compression, or clear error).
- **Keep the trust/compliance framing** — the "user-reported"/"Community" labels must still read correctly on mobile.
- **Not a feature build** — this is verify + fix usability blockers.

## Acceptance criteria

- [ ] Receipt upload works end-to-end on a phone viewport (photo → OCR → parsed receipt → spending view)
- [ ] Upload + parsed-receipt screens are responsive and usable on mobile
- [ ] Large phone photos upload without failing/stalling
- [ ] Trust labels still correct on mobile
- [ ] `vp check` + `vp test` pass
