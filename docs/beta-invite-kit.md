# Beta Invite Kit — Sku' jeg? (Phase 7c)

Prep date: 2026-08-15. Ready when the Task 0 cold-user test passes.

---

## 1. The invite (Danish — approve/trim to your voice, then send)

> Hej [navn] — jeg tester et dansk værktøj, der fortæller dig, hvilken butik der er billigst på hele din indkøbskurv denne uge — inkl. brændstof tur-retur. Lige nu er det en lukket beta.
>
> **Hvad du får:** du laver indkøbslister, og siden siger "handl hos MENY" (eller Netto, REMA, Bilka…). Du uploader også dine kvitteringer og ser dit forbrug og pris-vs-gennemsnit.
>
> **Tre ting, jeg beder om:** (1) log ind med en passkey (sikkerhedsnøgle på din enhed — fingeraftryk eller PIN), (2) upload 3–5 kvitteringer fra din uge, og (3) lav én indkøbsliste og se sammenligningen.
>
> **Én ærlig begrænsning:** tilføjer du varer som _fritekst_ (fx "Coca-Cola"), kan siden endnu ikke regne prisen ud for dem — det kan kun varer, der er koblet til en rigtig vare. Brug "tilføj vare" og søg på den rigtige vare, når du kan. Fuzzy-genkendelse kommer senere.
>
> **Hvis noget er i stykker:** sig det bare til mig direkte — det er en beta, og det er hele pointen.
>
> Linket er [beta.skujeg.dk](https://beta.skujeg.dk). Du kan forlade til enhver tid — det er lukket for nogen andre, ikke en fælde.

---

## 2. Cohort log (copy this to a note/Sheet; fill per user)

| Name  | Type                                    | Date invited | Onboarded (passkey set) | Week-1 active (M1 action) | Week-2 returned (M1 action) | Notes / stalls |
| ----- | --------------------------------------- | ------------ | ----------------------- | ------------------------- | --------------------------- | -------------- |
| (you) | founder                                 | 2026-08-15   | ✅                      | —                         | —                           | —              |
|       | friend/family (non-technical)           |              |                         |                           |                             |                |
|       | friend/family (non-technical)           |              |                         |                           |                             |                |
|       | friend/family (non-technical)           |              |                         |                           |                             |                |
|       | price-watch group (technical)           |              |                         |                           |                             |                |
|       | price-watch group (technical)           |              |                         |                           |                             |                |
|       | skeptic (will try to break it)          |              |                         |                           |                             |                |
|       | technical peer (keep out of data layer) |              |                         |                           |                             |                |

**Types to target (Task 2):** 3–5 friends/family (non-technical) · 2–3 price-watch group members (technical) · 1 skeptic · 1–2 technical peers. Start with 3–5 people you trust to be honest, broaden later.

---

## 3. Feedback thread (Task 6) — one pinned message

> **Sku' jeg? beta-feedback** — sig det her, hvis noget er i stykker, forvirrende eller mangler. Ingen besked er for lille. Jeg læser tråden ugentligt.

(Channel: Discord thread, Signal group, or a single email thread. Pick one. No issue tracker.)

---

## 4. The 3-week clock

| Week   | Dates        | Focus                                                                                              |
| ------ | ------------ | -------------------------------------------------------------------------------------------------- |
| Week 1 | Aug 15–21    | Recruit + onboard. Task 0 cold-user test FIRST. Users upload 3–5 receipts + build one list.        |
| Week 2 | Aug 22–28    | First return measurement. Query: week-1-active users who did an M1 action in week 2. Rate vs ≥30%. |
| Week 3 | Aug 29–Sep 4 | Confirm the rate + decide launch vs. fix. Run the receipt-dedup edge-case harvest.                 |

---

## 5. The "return" query (Task 1 — settle before measuring)

"Return" = a signed-in user who did an M1 action (build/update a list, get a store ranking) in **week 2**, having done one in **week 1**. NOT "visited again."

- Observation window: calendar week 1 → week 2.
- Measure: lists per user per week (M1 action = list build/update + a ranking).
- If the query can't measure it from existing data, add a minimal `last_active`/event log (small task — flag it). Verify the query works BEFORE recruiting.
