# Task 0 — Cold-User Test (the gate before ANY invite)

**What:** one non-technical person completes three flows **cold** — no walkthrough, no help. You watch, log every stall, fix only blockers. Re-test until all three complete unaided.

**Why it's the gate:** if a user gets stuck on "can't find the button," the beta measures _usability_, not _retention_ — and M1 (≥30% return) is polluted. A cold friend must get through the core loop on their own.

## Setup

- Use a real phone (mobile is the target) — or a laptop if that's their device. Test the device type your real cohort will use.
- Hand them the device with `beta.skujeg.dk` open. Say one sentence: **"Prøv at bruge siden. Sig højt, hvis du sidder fast, men jeg hjælper ikke før du har prøvet selv."**
- Do NOT explain the site. Do NOT click anything. Do NOT answer "what should I do?" — reply "hvad tror du, du skal gøre?"
- Have them create a passkey first (that's expected setup, not a flow — you can help with the OS passkey prompt, since it's device setup, not the app).

## The three flows (watch each, log stalls)

### Flow A — Build a list

- Can they find the lists page and create a list **without being told**?
- Can they add at least 2 items via the product search (NOT free-text)?
- **Pass =** a list with ≥2 real products exists.

### Flow B — Upload a receipt

- Can they find the upload page and upload a photo of a real receipt?
- Do they see the "we're reading it" state and understand it processes in the background?
- Does it eventually show as processed (or a clear failure + retry)?
- **Pass =** they upload a receipt and understand the result.

### Flow C — View a comparison

- Can they find the compare page for their list?
- Do they see a store ranking and understand "handle hos X"?
- **Pass =** they identify the cheapest store from the page.

## Log sheet (fill per stall)

| Stall point | What they did | What they expected | Fix (blocker vs polish) |
| ----------- | ------------- | ------------------ | ----------------------- |
|             |               |                    |                         |
|             |               |                    |                         |
|             |               |                    |                         |

**Blockers:** anything that stops a flow completing (button missing, broken link, crash, nothing happens). Fix before invites.
**Polish:** anything that works but confuses. Log it, note it, don't block invites on it.

## Re-test rule

- Any blocker → fix → re-test that flow with the same person (or a fresh cold user) until it passes unaided.
- All three flows must complete **unaided** before the first invite goes out.

## Notes from the run

- Date: ______ Tester: ______ Device: ______
- Flow A: PASS / FAIL → ______
- Flow B: PASS / FAIL → ______
- Flow C: PASS / FAIL → ______
- Blockers found: ______
- Polish noted: ______
- **Gate decision:** invites can start when A+B+C all PASS.
