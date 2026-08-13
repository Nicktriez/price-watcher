# Task 032 — Moderation (report, auto-expiry, ignore-list)

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 6 (Task 5)

## Objective

Keep the crowd layer honest: a **report button** on questionable prices, **auto-expiry** of stale/unverified reports, and an **ignore-list** for chronic spammers. This is the last line of defense for data quality — without it, garbage reports erode the trust the whole crowd model depends on.

## Context

The trust-tier system (Task 030) handles _statistical_ quality (3+ agreeing reports). Moderation handles _malicious_ or _broken_ input that statistics can't catch — a user spamming fake prices, or a report that's just wrong. The plan: "report button, auto-expiry, ignore-list for chronic spammers." Nick is the moderator (solo dev — no moderation team, so it must be low-touch).

**Sequencing:** depends on crowd reports (Task 029) + trust tiers (Task 030). Low-touch by design — a solo dev can't review every report.

## What to build

1. **Report button** — on any crowd price, a "report" action (flag this price as wrong/spam). Stores the flag + reason (wrong price / spam / other). A price flagged by enough users (e.g. 3) is demoted/hidden pending review — statistical self-policing, not manual.

2. **Auto-expiry** — a `crowd_report` that stays **Single and unverified** for too long expires automatically (Task 030 already marks Single as stale after 24h; expiry is the natural end-state). An expired report is removed from active pricing but its history is kept (don't delete data — just stop showing it).

3. **Ignore-list for chronic spammers** — a per-user "muted/ignored" list: a user whose reports are repeatedly flagged gets their reports excluded from Community calculation and de-prioritized. Simple: a `user` flag or `reporting_user` ignore table. **Solo-dev friendly:** the ignore-list is mostly automatic (repeated flags → excluded), with Nick able to manually mute a user if needed.

4. **Moderation surface** — a minimal admin view for Nick: a queue of flagged/expired reports with one-click hide/restore. No full admin panel, no roles system — just a protected route that shows the flagged items. Keep it brutally simple.

## Important

- **Low-touch, automatic-first** — Nick is solo; the moderation must run on automatic rules (flag-threshold, auto-expiry) with a minimal manual queue, not require reviewing every report.
- **Flag-threshold, not manual** — 3 flags demotes/hides a price automatically. Nick only intervenes on the edge cases.
- **Expiry hides, doesn't delete** — an expired Single report stops being shown but its history is retained (the plan's "never delete, preserve history" ethos).
- **Ignore-list is mostly automatic** — repeated flags exclude a user's reports from Community; manual mute is the fallback.
- **Don't build a full admin panel or roles** — that's scope creep. A protected queue route is enough.
- **Compliance** — hidden/expired prices never show as offers or discounts.

## Acceptance criteria

- [ ] A "report" button flags a crowd price (wrong/spam/other); N flags (e.g. 3) demote/hide it
- [ ] A Single, unverified report auto-expires after a set period — hidden from active pricing, history retained
- [ ] An ignore-list excludes chronic spammers' reports from Community calculation (automatic + manual mute)
- [ ] A minimal protected admin view shows the flagged/expired queue with hide/restore
- [ ] Expired/hidden prices never appear as offers or discounts (compliance)
- [ ] `vp check` + `vp test` pass
