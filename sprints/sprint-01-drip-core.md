# Sprint 1 — Drip Engine

**Goal:** the most-used function works end-to-end, paces the drip reliably, and
runs **up to 3 concurrent drips** each with a **5-minute pre-end alarm**.

**Primary spec:** 001-drip-rate-core (v1.1).

## Backlog

- **T1.1** `gtt_per_min = round(volume/time × drop_factor)` from the `drip_rate`
  record; unit-tested. *(FR-1)*
- **T1.2** Inverse mode (volume + rate → run time + ml/hr). *(FR-2)*
- **T1.3** Drop-factor selector 10/15/20/60 + custom. *(FR-3)*
- **T1.4** Metronome scheduler on AudioContext look-ahead; derive audio + haptic +
  animation from one clock. *(FR-4/5, ADR-0005)*
- **T1.5** Independent channel toggles; vibration-only silence mode. *(FR-4)*
- **T1.6** Per-drip end-of-bag timer + local notification: alarm **5 min before
  empty** (default lead 5 min, configurable) **and at empty**. *(FR-6)*
- **T1.7** Input clamps + out-of-range blocking with reasons. *(FR-10, Art. III)*
- **T1.8** Show rounding/units transparently. *(FR-11)*
- **T1.9** Drift test harness logging tick timestamps vs ideal. *(SC-2)*
- **T1.10 (concurrency)** Model 1–3 independent drips (own volume/rate/drop-factor/
  timer/alarms); block a 4th; free a slot on finish/remove. *(FR-7)*
- **T1.11 (concurrency UX)** Show all active drips together (label, gtt/min, time
  remaining), distinguishable at a glance. *(FR-8)*
- **T1.12 (multi-drip metronome)** One audible metronome at a time by default;
  others show visual countdown. *(FR-9 — confirm behavior with Owner)*

## Acceptance criteria (exit)

- **AC-1.1 (SC-1)** (500 ml, 4 h, 20) → 42; **(500 ml, 20 h, 20) → 8**;
  (1000 ml, 8 h, 15) → 31; (250 ml, 30 min, 60) → 500. *(automated)*
- **AC-1.2 (SC-2)** One drip: audio+haptic+animation sync ≥10 min, drift < 1 drop/10 min.
- **AC-1.3** Channel toggles behave; vibration-only produces no audio.
- **AC-1.4 (SC-9)** Per-drip finish time within ±1 min; **5-min pre-end alarm** and
  at-empty alarm both fire in airplane mode.
- **AC-1.5 (SC-9)** 3 concurrent drips at different rates each keep correct
  independent countdowns + fire own alarms; a 4th is blocked.
- **AC-1.6** Out-of-range input blocked with reason; no number shown.
- **AC-1.7 (SC-3)** Fully functional offline; zero network.

## Definition of Done

Global DoD + AC-1.x green. Metronome + timers documented re: background suspension
/ app-killed behavior (live drips not persisted in MVP; warn on relaunch).

## Risks

- Cross-device haptic/audio timing variance (R2) — audio is timing master; drift
  test on the Owner's device.
- Concurrency timer/alarm interference (R5) — independent units; SC-9 tests.
