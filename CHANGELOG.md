# Changelog

Append-only, one entry per meaningful change (per `TACMED-POC-MASTER-BRIEF.md` §0.3
working agreement #5). Grouped by day; not a 1:1 mirror of `git log` — see that for
full commit-level detail. Clinical-content verification changes are also logged
separately, per-record, in `clinical/VERIFICATION-LOG.md`.

## 2026-07-18
- Backfilled this file (flagged as missing against the project's own working
  agreements).
- Drip end-of-bag pre-end alarm lead time changed **5 min → 10 min** (Owner
  decision) — more warning before a bag runs dry. Live spec (000/001), README,
  ROADMAP updated to match; historical sprint/report docs left as-is (accurate
  record of what shipped at the time).
- Spec 006 (TQ-timer) **withdrawn** — superseded by the alarm change above; a
  separate tourniquet-timer subsystem isn't wanted. Spec 007 (PFC nursing-timer)
  **on hold** — Owner still deciding necessity. `IDEAS.md`/`ROADMAP.md`/
  `sprints/sprint-05-timer-modules.md` updated to reflect both.
- Resolved 2 of 3 outstanding `[v1.0]` source-provenance questions: PCC-BURN's
  exact JTS CPG ID (57, 13 Jan 2017, confirmed via jts.health.mil) and a direct
  cross-check of all 4 verified ketamine drip records against the archived
  JTS-CPG-61 English original — clean match, no discrepancies. TCCC-2026 edition
  corroborated via web search (title/date match the official release).
- Merged `feature/antibiotics-reference` → `master` (fast-forward): antibiotics
  reference section in "Препарати" (TCCC-2026 general + MOZ-ATB-2023 by-injury,
  source-separated, read-only); Bolus UI now shows the calculated dose alongside
  the raw mg/kg range instead of only a small subtext.
- Owner verified all 25 MOZ-ATB-2023 records (13 drugs + 12 by-injury prophylaxis
  groups) and 3/4 of the TCCC-2026 general antibiotics; drug names and prophylaxis
  durations translated from an English gloss to the exact Ukrainian wording in the
  archived source.
- Added automated metronome drift-regression test (`tests/metronome-drift.test.ts`,
  closes AC-1.2/SC-2/T1.9); fixed a test that hardcoded a since-verified seed
  record as a "known UNVERIFIED" fixture (`tests/compile-field.test.ts`).
- Drafted Spec 006 (TQ-timer) and Spec 007 (PFC nursing-care timer, minimal q2h
  subset) + Sprint 5 — next development vectors, Owner-prioritized. `ROADMAP.md`
  updated with the full set of proposed vectors (fixed-dose reference, v1.0-tails
  close-out, timer modules, field-hardening).

## 2026-07-17
- Spec 004 (antibiotics reference) + ADR-0007 (UI placement: read-only,
  source-separated, no new nav tab, no schema `category` field) + Sprint 4.
- `pcc_ketamine_analgesia_infusion` re-verified after a citation fix (JTS CPG-61
  Appendix C, superseding an earlier "not specified in this guide" note).
- `OPEN-CLINICAL-QUESTIONS.md` reorganized into `[v1.0]` vs `[post-v1.0]`.

## 2026-07-13 – 2026-07-15
- Sprint 1: drip engine (classic + weight-based rate calc, AudioContext-scheduled
  metronome with independent audio/haptic/animation channels, up to 3 concurrent
  drips with 5-min-pre-end + at-empty alarms, focus mode, tap calibrator, phase
  sync). Ketamine analgesia/sedation infusions + boluses, burn Rule-of-Ten
  (replacing Parkland — ADR-0003) Owner-verified.
- Light/dark themes; Capacitor Android + iOS scaffolds; PWA icons.
- Owner decisions recorded in `ROADMAP.md`: v1.0 = focused minimum (ketamine
  drips + burn fluid); Android-first (iOS not a v1.0 blocker).

## 2026-07-12
- Sprint 0: project constitution, spec-driven governance (specs 000/001/002/003/005,
  ADRs 0001–0006), fail-closed clinical content pipeline (`validate` / `verify` /
  `compile:field` / `gate:release`), protocol schema + seed dataset, source
  archive with checksums (TCCC-2026, MOZ-ATB-2023, JTS-CPG-61/91, PCC-BURN),
  offline-first React+TS+Vite PWA shell with disclaimer + fail-closed rendering
  guard, initial test suite, README/IDEAS/CI.
