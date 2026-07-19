# Spec 007 — PFC Nursing-Care Timer (minimal, q2h subset)

- **Feature ID:** 007-pfc-nursing-timer
- **Status:** ⏸ Draft, **on hold** — Owner still deciding whether this module is
  needed in the project at all (2026-07-18); not approved for implementation.
  Its sibling, Spec 006 (TQ-timer), was withdrawn the same day. Do not start
  building until the Owner explicitly greenlights it.
- **Priority:** — (on hold)
- **Version:** 1.0
- **Depends on:** 005-clinical-content-pipeline, 001-drip-rate-core (reused alarm
  pattern), 006-tq-timer (shares the "recurring reminder timer" building block).
- **Was:** "PFC / PCC care-timer module" in `IDEAS.md` ("Deferred from the original
  plan").

## Constitution Check

- **Art. I:** the reminder interval is transcribed verbatim from an already
  registered, archived source — **JTS-CPG-91, Table 17** ("PCC Role-based
  Guidelines for Nursing Care and Wound Management"), which states
  **"Repositioning/Check Padding — Every 2 hours"** and **"Splint Care — Every 2
  hours ... Re-check all pulses after splint placement"**. No interval or
  guidance is invented — this feature deliberately implements only the rows of
  Table 17 that share the same **2-hour** cadence, not the full 14-row checklist
  (see §5 Out of scope) — keeps the source-lock minimal and precise per Owner
  direction (2026-07-18).
- **Art. II/III:** gated the same way as 006-tq-timer — the reminder *fires* on a
  plain interval regardless of verification (it's a clock), the **guidance text**
  it shows is gated on `VERIFIED`.
- **Art. V:** offline, local notification only.

---

## 1. Why

Table 17 of JTS-CPG-91 is explicit that most PFC nursing tasks (repositioning,
padding, splint/pulse checks) are basic tasks anyone can perform, but they're
easy to forget over a multi-hour hold without a prompt — "using a nursing care
checklist assists with developing a schedule" (CPG-91, Nursing Care section).
This is a minimal, source-locked reminder — not a full nursing dashboard.

## 2. User stories

- **US-1** I start a "PFC nursing check" timer for a casualty in prolonged care.
- **US-2** Every 2 hours I get a reminder: *"Перевернути на інший бік, підкласти
  під кісткові виступи; перевірити шини та пульси дистальніше"* (repositioning +
  splint/pulse check, combined — both are the same 2 h cadence in the source
  table), source-badged to JTS-CPG-91 Table 17.
- **US-3** The reminder repeats every 2 hours for as long as the timer runs (unlike
  the TQ timer's one-shot thresholds — this is a recurring nursing-care prompt).
- **US-4** I can stop the timer when care ends or the casualty is handed off.

## 3. Functional requirements

- **FR-1** "Start PFC nursing timer": single start action (optionally labeled per
  casualty if more than one is being tracked in parallel — reuse the TQ-timer's
  label pattern).
- **FR-2** Recurring alarm every **2 hours** (reuse the alarm-pattern
  infrastructure; a distinct, gentler tone from both the drip alarms and the
  TQ-timer alarms — this is a lower-urgency prompt, not an emergency one).
- **FR-3** Each firing shows the combined **Repositioning/Check Padding + Splint
  Care (re-check pulses)** reminder text, source-badged to `JTS-CPG-91`, gated on
  `VERIFIED` (Art. II/III) exactly like 006-tq-timer.
- **FR-4** Live "time since last check" + "next check in" display, so the medic
  can see at a glance whether they're on schedule without waiting for the alarm.
- **FR-5** Stop with the same two-tap confirm pattern used elsewhere.
- **FR-6** Multiple independent nursing timers if tracking more than one
  casualty (same concurrency pattern as drips/TQ-timers; recommend the same
  small cap, e.g. up to 3, for screen clarity).
- **FR-7** Local notifications fire even backgrounded; airplane mode has no
  effect.

## 4. Acceptance criteria

- **AC-1** First reminder fires at exactly 2 h after start, then every 2 h
  thereafter, accurate to the second, in airplane mode (automated test, same
  style as `tests/metronome-drift.test.ts` — a longer-period recurring-alarm
  variant rather than a sub-minute drip tick).
- **AC-2 (Art. III)** With the underlying record `UNVERIFIED`, the timer still
  runs and still alarms on schedule, but the reminder text is absent.
- **AC-3** "Time since last check" / "next check in" stay accurate across app
  foreground/background transitions.
- **AC-4 (SC-3)** Zero network calls.
- **AC-5** Multiple concurrent nursing timers (different casualties) fire
  independently on their own 2 h cycles.

## 5. Out of scope (this feature)

**Deliberately not built, to stay minimal** — the rest of JTS-CPG-91 Table 17 is
real, sourced content but a different cadence each (lip care hourly, oral/nasal
care 24 h, oral/dental care 12 h, cough/deep-breathing hourly, hypothermia
prevention continuous, head-injury positioning continuous, nutrition 4–6 h,
hygiene 24 h, IV/IO site care — flush q8–12h / tubing change q96h, bowel
management as-required). These stay **explicitly parked in `IDEAS.md`** as a
documented, already-sourced backlog (citations ready, Table 17 fully
transcribable) — extend only if the Owner decides the minimal q2h reminder isn't
enough in practice. No automated nursing-care decision logic; no vitals
tracking; no casualty record-keeping (that's the physical casualty card, form
002-О, per the master brief).

## 6. Edge cases

- Timer running many hours/days: no cap on recurrence; consider a lighter
  "overdue" visual state if a reminder is dismissed without action rather than
  repeated aggressive alarms (avoid alarm fatigue over a long hold) — Owner to
  confirm desired behavior.
- App backgrounded across a reminder boundary: notification must still fire
  (same mechanism as drip end-of-bag / TQ-timer alarms).

## Clarifications needed

- Same data-representation question as 006-tq-timer (new `formulas[]` clinical
  entry vs. schema addition) — resolve both together at spec review, likely one
  shared schema shape for "timer reminder" records.
- Whether to extend beyond the q2h subset later (§5) — explicitly **not** a
  question to resolve now; revisit only after the minimal version is field-used.
- Concurrent-timer cap (recommended 3) — confirm with Owner.
