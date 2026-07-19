# Sprint 5 — Timer Modules (TQ-timer + PFC nursing-care timer)

**Goal:** two small, tightly source-locked reminder modules — never clinical
decisions, always sourced to an already-registered CPG. Reuses the drip screen's
alarm/local-notification/two-tap-confirm patterns rather than inventing new
mechanics.

**Primary specs:** 006-tq-timer (v1.0), 007-pfc-nursing-timer (v1.0).
**Branch:** `feature/timer-modules` (isolated, same discipline as
`feat-antibiotics`).

## Backlog

- **T5.1** Data model: add a "timer reminder" shape to `clinical/uk-cpp.v1.json` /
  `protocol.schema.json` for the TQ 2h/6h thresholds and the PFC q2h reminder text
  — resolve the `formulas[]` vs. new-array question flagged in both specs'
  Clarifications, get schema `validate` green. *(Art. I — transcription only)*
- **T5.2** TQ-timer: start/stop, per-limb label, live elapsed display, 2 h + 6 h
  one-shot alarms with distinct patterns, fail-closed guidance text. *(Spec 006
  FR-1..FR-7)*
- **T5.3** TQ-timer: "mark on the TQ and casualty card" reminder always visible
  while a timer runs; app-kill warning copy. *(FR-6, FR-9)*
- **T5.4** PFC nursing-timer: start/stop, recurring 2 h alarm, combined
  repositioning + splint/pulse-check reminder text, "time since / next check in"
  display. *(Spec 007 FR-1..FR-5)*
- **T5.5** Multi-timer concurrency for both modules (cap TBD per spec
  Clarifications — default 4 for TQ, 3 for PFC pending Owner confirm).
- **T5.6** Automated tests: threshold-timing accuracy (reuse the fake-clock
  pattern from `tests/metronome-drift.test.ts`), fail-closed guard (reuse
  `guard.test.ts` pattern), offline (extends `offline.test.tsx`).
- **T5.7** i18n strings; no hardcoded UI text.

## Acceptance criteria (exit)

- **AC-5.1** Spec 006 AC-1..AC-6 green.
- **AC-5.2** Spec 007 AC-1..AC-5 green.
- **AC-5.3** `npm run validate && npm run lint && npm run test && npm run build`
  green on the branch.
- **AC-5.4** Both threshold/reminder records ship `UNVERIFIED` until the Owner
  verifies them against the archived TCCC-2026 and JTS-CPG-91 PDFs — same
  fail-closed discipline as every other clinical record, no exception for
  "just a timer."

## Definition of Done

Global DoD + AC-5.x green + specs 006/007 status updated from Draft once
implemented + `IDEAS.md` entries updated from "parked" to "shipped" (or kept
parked if Owner declines at spec review).

## Explicitly not in this sprint

The rest of JTS-CPG-91 Table 17 (lip/oral/dental care, cough/deep-breathing,
hypothermia positioning, nutrition, hygiene, IV/IO site care, bowel management) —
real, sourced, already citable, deliberately deferred per Owner's minimalism
direction (2026-07-18). Stays as a ready-to-go backlog note in `IDEAS.md`, not
built until asked for.
