# Sprint 1 — Drip Engine — Report

- **Date:** 2026-07-13
- **Spec:** 001-drip-rate-core (v1.1)
- **Constitution check:** drip math is engineering (`drip_rate`, `dose_rate_to_gtt`);
  drug concentrations read only from VERIFIED records; no clinical value originated;
  no network added. ✔

## Built

- `src/drip/calc.ts` — deterministic math: classic `drip_rate` (volume/time × df),
  weight-based `dose_rate_to_gtt` (dose × wt ÷ conc → ml/h → gtt/min), `1 drop / X s`,
  bag run-time, concentration parser, clamps.
- `src/drip/metronome.ts` — AudioContext look-ahead scheduler (ADR-0005): audio tick
  scheduled on the timeline; haptic fired at the same tick time; channel toggles.
- `src/drip/DripScreen.tsx` — the screen:
  - prominent drop-factor selector (10 / 15 / 20 gtt/ml, ≥56 px, default 20);
  - **By-drug mode** — concentration presets built from VERIFIED drip records
    (ketamine 1 mg/ml analgesia, 3 mg/ml sedation); weight + dose steppers; gtt/min hero;
  - **Volume/time mode** — classic bag calculator (SC-1);
  - **up to 3 concurrent drips**, 4th blocked; each with a drop animation + bag timer;
  - **end-of-bag timer + 5-min pre-end alarm + at-empty alarm** (beep + vibrate);
  - one audible metronome at a time (FR-9); audio/vibration toggles;
  - SourceBadge on the selected drug.
- Wired `drip` screen into Navigation/App (now the default screen) + `nav.drip` string
  + field-theme styles.

## Verification

| Check | Result |
|---|---|
| `npm run test` | ✅ 26/26 (incl. `drip-calc` 11: SC-1 42/8/31/500 + dose math) |
| `tsc -b` | ✅ 0 type errors |
| `vite build` (fresh outDir) | ✅ PWA + service worker, 165 KB JS |
| offline test | ✅ zero network with drip screen as default (SC-3) |
| `gate:release` | ✅ 3 verified drips + 2 engineering formulas exposed |

## Acceptance criteria

- **AC-1.1 (SC-1)** ✅ automated. **AC-1.3 / AC-1.4** ✅ channel toggles + vibration-only.
- **AC-1.5 (SC-9)** ✅ 3 concurrent drips, 4th blocked; each own countdown + alarms.
- **AC-1.7 (SC-3)** ✅ offline.
- **AC-1.2 (SC-2)** ✅ *(closed 2026-07-17)* — automated drift harness
  `tests/metronome-drift.test.ts` drives the real scheduler with a fake AudioContext +
  fake timers over a simulated 10.5 min run at 20 & 42 gtt/min, logs every audio tick vs
  the ideal grid, and asserts drift < 1 drop / 10 min (in fact sub-ms) with audio,
  haptic and animation firing the same tick count. On-device confirmation stays an M2
  step (real hardware clock), but the scheduling logic is now regression-guarded in CI.

## Notes / follow-ups

- Per-card drop **animation** is CSS-timed (independent visual); the single-clock
  audio+haptic drives the **active** drip. Deriving the active card's animation from
  the audio clock is a refinement.
- Background alarms are in-app (beep + vibrate); OS-level local notifications when the
  app is backgrounded → Capacitor LocalNotifications (follow-up). **Shipped
  2026-07-21** — see Spec 001 FR-12 / `plan/architecture.md` §4a.
- Custom drop-factor entry not added (10/15/20 per Owner; 60 removed).
- Some drip-UI strings are inline Ukrainian rather than in `uk.json` (functional;
  externalize later).
