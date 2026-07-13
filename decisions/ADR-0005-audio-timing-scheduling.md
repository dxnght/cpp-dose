# ADR-0005 — Metronome timing via AudioContext look-ahead scheduling

- **Status:** Accepted (2026-07-12)
- **Deciders:** Owner
- **Related:** Spec 001 (SC-2); `plan/architecture.md` §4

## Context

The metronome must pace the drip with three synchronized channels (audio, haptic,
animation) and hold sync for ≥10 min with drift < 1 drop / 10 min. JavaScript
timers (`setInterval`/`setTimeout`) drift and jitter under load and when the tab is
throttled, which is unacceptable for a pacing aid.

## Decision

Use the **Web Audio API** as the timing master with a **look-ahead scheduler**:

- Drop interval `T = 60 / gtt_per_min` s.
- A short loop (rAF or worker) runs every ~25 ms and schedules any tick whose time
  falls within a ~200 ms look-ahead window via `bufferSource.start(ctx.currentTime
  + n·T)`.
- **Animation and haptic pulses are derived from the same scheduled tick times**,
  so all three channels share one clock and stay in phase.
- Ticks use a pre-computed audio buffer (not synthesized per-tick) for low latency.
- On OS audio suspend/resume, re-anchor to `ctx.currentTime`; do not replay missed
  ticks.

## Consequences

- (+) Meets the SC-2 drift budget; standard, well-proven technique.
- (+) Single clock guarantees cross-channel sync (no per-channel timers to skew).
- (−) Background suspension can pause audio; handled by re-anchoring and a user
  note that the metronome is a pacing aid, not a delivered-dose guarantee.
- (−) Haptic hardware timing varies by device; audio remains the master and a test
  asserts the audio drift budget.

## Alternatives considered

- **`setInterval` per channel:** rejected — drift/jitter, channels desync.
- **Three independent timers:** rejected — no shared clock, guaranteed skew.
