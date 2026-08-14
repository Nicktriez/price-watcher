# Task 041 — Danish-Consistency Pass

**Repo:** `~/price-watcher`
**Plan source:** `docs/reference/build-plan.md` → Phase 9 (Task 6) + Language policy

## Objective

Every **user-facing string** in the UI must be **Danish**. Today there's English leakage (e.g. `/reported-items` H1 "Reported items", tier badges "Community"/"User-reported") while most of the site is Danish — mixed-language UI reads as broken to a Danish user. Also check **links** (nav, footer, CTAs) resolve and are correctly labelled in Danish.

## Context

This is an **audit, not i18n**. Full English localization is explicitly OUT of scope for launch (see Language policy in the plan). This task just makes the Danish consistent. **Language policy: Danish-first; keep the eventual English switch painless (don't bury hardcoded strings where extraction hurts later), but no i18n framework now.**

## What to build

1. **Grep for hardcoded English strings** across `src/` — translate the stragglers to Danish. Known examples: `/reported-items` H1, "Community"/"User-reported" tier badges, any other English UI copy.
2. **Consistent Danish copy** — the same concept uses the same Danish term everywhere (e.g. "brugerrapporteret", "Tilbud", "Indkøbsliste"). No Danish/English alternation.
3. **Links** — nav, footer, CTAs all resolve and are correctly labelled in Danish.
4. **Keep it painless for a future locale** — don't deliberately hardcode in a way that makes later extraction painful, but don't build i18n infra either.

## Important

- **Audit, not i18n** — this is translate + consistent, not an i18n framework or `/en/` routing.
- **Danish-first** — per the language policy. English is deferred to real expat demand or Phase 10 (export).
- **Compliance labels stay correct in Danish** — "user-reported" = "brugerrapporteret"; never "discount" for crowd/receipt prices (matches Task 040).
- **Links resolve** — a broken or mislabelled link is a UX bug; fix it.

## Acceptance criteria

- [ ] No English leakage in user-facing UI (all strings Danish)
- [ ] Consistent Danish terminology for the same concept across routes
- [ ] Nav/footer/CTA links resolve + are correctly labelled in Danish
- [ ] Trust/compliance labels correct in Danish (brugerrapporteret, never discount)
- [ ] `vp check` + `vp test` pass
