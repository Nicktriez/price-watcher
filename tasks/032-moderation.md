# Task 032 — Moderation (report, auto-expiry, ignore-list)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 6 (Task 5)

## Objective

Keep the crowd layer honest: a **report button** on questionable prices, **auto-expiry** of stale/unverified reports, and an **ignore-list** for chronic spammers. This is the last line of defense for data quality — without it, garbage reports erode the trust the whole crowd model depends on.

## Context

The trust-tier system (Task 030) handles _statistical_ quality (3+ agreeing reports). Moderation handles _malicious_ or _broken_ input that statistics can't catch — a user spamming fake prices, or a report that's just wrong. The plan: "report button, auto-expiry, ignore-list for chronic spammers." Nick is the moderator (solo dev — no moderation team, so it must be low-touch).

**Sequencing:** depends on crowd reports (Task 029) + trust tiers (Task 030). Low-touch by design — a solo dev can't review every report.

## What to build

1. **MIGRATION REQUIRED — moderation schema.** The current `crowd_report` table (0015) has no status/flags, and there's no flag or ignore table. Add a new migration with at least:
   - a `crowd_report_flag` table (`crowd_report_id`, `flagger_user_id`, `reason` — wrong price / spam / other, `created_at`)
   - a moderation `status`/`hidden` column on `crowd_report` (or a separate moderation table) so a flagged/expired report is hidden from active pricing without deleting history.

2. **Report button** — on any crowd price, a "report" action (flag this price as wrong/spam). Stores the flag + reason. **Anti-gaming guard (do not skip):** a price is demoted/hidden only after **N DISTINCT flaggers** (e.g. 3 different users) — never `COUNT(*)`. A single user flagging 3× must NOT hide a price (same distinct-user rule as Task 030). One user flagging repeatedly counts as 1 flag.

3. **Auto-expiry** — a `crowd_report` that stays **Single and unverified** for too long expires automatically (Task 030 marks Single stale after 24h; expiry is the natural end-state — pick a longer period, e.g. 7 days, and make it config). An expired report is removed from active pricing but its history is kept (don't delete data — just stop showing it).

4. **Ignore-list for chronic spammers** — a per-user "muted/ignored" list: a user whose reports are repeatedly flagged gets their reports excluded from Community calculation and de-prioritized. Simple: a `user` flag or `reporting_user` ignore table. **Solo-dev friendly:** the ignore-list is mostly automatic (repeated flags → excluded), with Nick able to manually mute a user if needed.

5. **Moderation surface** — a minimal admin view for Nick: a queue of flagged/expired reports with one-click hide/restore. No full admin panel, no roles system.
   - **Admin check — DEFINE ONE (do not guess):** Task 010 built magic-link identity with NO roles, so "protected route" currently means "any signed-in user." Decide + implement a concrete admin gate: an **email allowlist on the route, checked server-side** (Nick's `jensen0710@gmail.com`) — no roles system, just "is the signed-in user's email in the admin list?" Keep it brutally simple.

## Important

- **Low-touch, automatic-first** — Nick is solo; the moderation must run on automatic rules (flag-threshold, auto-expiry) with a minimal manual queue, not require reviewing every report.
- **Flag-threshold is DISTINCT flaggers, not manual** — 3 distinct users flagging demotes/hides automatically. Nick only intervenes on the edge cases.
- **Expiry hides, doesn't delete** — an expired Single report stops being shown but its history is retained (the plan's "never delete, preserve history" ethos).
- **Ignore-list is mostly automatic** — repeated flags exclude a user's reports from Community; manual mute is the fallback.
- **Don't build a full admin panel or roles** — that's scope creep. A protected queue route is enough.
- **Compliance** — hidden/expired prices never show as offers or discounts.

## Acceptance criteria

- [ ] A "report" button flags a crowd price (wrong/spam/other)
- [ ] N **distinct** flaggers (e.g. 3) demote/hide it; a single user flagging N× does NOT (unit-tested)
- [ ] A Single, unverified report auto-expires after a configurable period — hidden from active pricing, history retained
- [ ] An ignore-list excludes chronic spammers' reports from Community calculation (automatic + manual mute)
- [ ] A minimal admin view (email-allowlist gated) shows the flagged/expired queue with hide/restore
- [ ] Expired/hidden prices never appear as offers or discounts (compliance)
- [ ] `vp check` + `vp test` pass
