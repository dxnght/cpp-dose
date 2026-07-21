# Changelog

Append-only, one entry per meaningful change (per `TACMED-POC-MASTER-BRIEF.md` §0.3
working agreement #5). Grouped by day; not a 1:1 mirror of `git log` — see that for
full commit-level detail. Clinical-content verification changes are also logged
separately, per-record, in `clinical/VERIFICATION-LOG.md`.

## 2026-07-21 (later)
- **Alarms now fire with the screen locked.** Owner reported the in-app alarm
  fired 7 min late after locking the phone — Android suspends the WebView's
  JS timers on lock, so `setInterval`-driven alarm logic can't be trusted in
  the background. Added `@capacitor/local-notifications` (v6.1.3, matching
  the existing Capacitor 6.x line) as an OS-level backstop: each drip with a
  bag timer schedules matching 10-min/5-min/at-empty notifications through
  Android's AlarmManager, which keeps working screen-locked. Still 100%
  on-device, no network (Art. V unaffected). New `src/drip/notifications.ts`;
  wired into `DripScreen.tsx` (schedule/cancel on add/remove/retitrate/
  silence-toggle); `USE_EXACT_ALARM` added to `AndroidManifest.xml` for
  precise timing under Doze (auto-granted, sideloaded app); notification
  permission requested once per session with a visible warning if denied.
  Spec 001 FR-12/AC-9, `plan/architecture.md` §4a. **Needs on-device
  confirmation** (screen-off/Doze/permission-prompt behavior) — can't be
  verified from the build sandbox.
- `android/` is gitignored (regenerated, not version-controlled — see
  `.gitignore`), so the `USE_EXACT_ALARM` manifest permission above isn't
  captured by committing code. Added `scripts/patch-android-manifest.mjs`
  (`npm run android:patch`) to re-apply it idempotently; chained into
  `npm run cap:sync` and `npm run apk:debug` so it's never a forgettable
  manual step.
- Fixed a **stepper bug**: bag-volume min was 1 ml with a 50 ml step, so the
  stepper could clamp to 1 and then climb off-grid (51, 101, 151 ml…) —
  Owner-reported. Root cause fixed at the source: `VOLUME.min` raised 1 → 50
  ml in `src/drip/calc.ts` (also a more realistic minimum IV bag size).
- `npm run validate/lint/test (38/38)/gate:release/tsc` all green (added a
  regression test asserting `VOLUME.min` stays step-aligned). `npm run
  build` blocked again by the same sandbox dist-cleanup EPERM (unrelated to
  the code); `npx cap sync android` partially failed on the same class of
  issue (couldn't overwrite generated Gradle files) — manually applied the
  equivalent `capacitor.settings.gradle`/`capacitor.build.gradle` edits that
  `cap sync` would have produced; `capacitor.plugins.json` updated cleanly.

## 2026-07-21
- Owner verified `tccc_cephalexin_po` (TCCC-2026 §12.b) — the last of the 4
  TCCC-2026 general antibiotics; all 25 MOZ-ATB-2023 records were already
  verified. `clinical/OPEN-CLINICAL-QUESTIONS.md` §A item 4 closed.
- Drip pre-end alarm is now **two-stage**: a distinct alarm at **10 min**
  remaining (single beep) and a second, more urgent one at **5 min**
  remaining (double beep), before the existing at-empty alarm (triple beep) —
  Owner decision. `warnedPreEnd` renamed to `warned10` + new `warned5` flag
  per drip (`src/drip/DripScreen.tsx`).
- Concurrent-drip cap raised **3 → 5** (`MAX_DRIPS` in `DripScreen.tsx`) —
  Owner decision. Specs 000 (SC-9), 001 (FR-6/FR-7/AC-5/AC-6/US-4/US-5), 002
  (US-5), README, ROADMAP, IDEAS updated to match; historical sprint/report
  docs and the withdrawn/on-hold timer specs left as-is (accurate record of
  what shipped/was proposed at the time).
- `npm run validate / lint / test (37/37) / gate:release` all green; `tsc -b`
  clean. Production `vite build` blocked in this sandbox by a stale-artifact
  permission error unrelated to the code change (same class of issue as the
  recurring git-lock quirk) — re-run `npm run build` from a normal terminal
  to confirm.
- Confirmed (code review, not a code change): the alarm was already
  independent of the "Звук"/"Вібрація" metronome-channel checkboxes — those
  only gate the pacing tick, never the pre-end/at-empty `alarm()` calls.
- Added a **per-drip alarm mute opt-out**: a "Без будильника" checkbox (off by
  default) on each drip with an end-of-bag timer, scoped to that drip only —
  never global, never on by default. A live informational hint next to it
  shows how much of the remaining time is still ahead of the 10-min alarm
  window; purely informational, doesn't drive any logic (Owner decision).
- Alarm tone made **louder and longer** — square wave instead of sine,
  near-max gain, ~0.45 s per beep (was a soft 0.3-gain, 0.2 s sine beep) —
  after field feedback that the original was too quiet to trust.

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
