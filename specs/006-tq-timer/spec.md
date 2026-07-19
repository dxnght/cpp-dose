# Spec 006 — TQ-Timer (per-limb tourniquet application timer)

- **Feature ID:** 006-tq-timer
- **Status:** Draft → pending Owner approval
- **Priority:** P2 (M3 growth vector, Owner-prioritized 2026-07-18)
- **Version:** 1.0
- **Depends on:** 005-clinical-content-pipeline (fail-closed gate, source-badge pattern),
  001-drip-rate-core (reuses the alarm/local-notification pattern — `alarm()` in
  `src/drip/DripScreen.tsx`, the `LS` localStorage helper).
- **Was:** "TQ-timer module" in `IDEAS.md` ("Deferred from the original plan").

## Constitution Check

- **Art. I:** the only values shown are the **2 h / 6 h thresholds**, transcribed
  verbatim from TCCC-2026 §6.a.3 (exact citation below). No dose, no clinical
  decision, no invented number. This is a **reminder/timer**, never an instruction
  to convert or remove a tourniquet — the app states the doctrine text; the medic
  decides.
- **Art. II/III:** the threshold text is a sourced clinical record like any other —
  `UNVERIFIED` until the Owner checks it against the archived TCCC-2026 PDF, gated
  by the same `assertRenderable`/compile pipeline. Fail-closed: if unverified, the
  timer still runs (it's just a stopwatch), but the **threshold guidance text is
  hidden** until verified — never show doctrine text that wasn't Owner-checked.
- **Art. V:** offline; local notifications only, no network.

---

## 1. Why

TCCC 2026 §6.a.3: tourniquets should be converted "in less than 2 hours if bleeding
can be controlled with other means," and should not be removed "if in place more
than 6 hours unless close monitoring and lab capability are available." In a
multi-casualty or prolonged-hold scenario a medic can lose track of exactly when
each tourniquet went on, especially with more than one casualty or more than one
limb. TCCC itself mandates marking application time on the tourniquet **and** the
casualty card (§6.a.4) — this feature is a **digital backup reminder** for that
same doctrine, not a replacement for it.

## 2. User stories

- **US-1** I mark a tourniquet applied (limb label + start time = now) and the app
  shows a live elapsed-time count for it.
- **US-2** At 2 h elapsed, I get an alarm + on-screen note: the TCCC 2-hour
  conversion guidance, source-tagged.
- **US-3** At 6 h elapsed, I get a second, distinct alarm + the TCCC 6-hour
  no-removal-without-monitoring guidance.
- **US-4** I can track **more than one tourniquet at once** (multi-limb, or
  multiple casualties), each independent, each clearly labeled.
- **US-5** The app never tells me to convert or remove anything — it shows the
  sourced guidance text and lets me decide, exactly like the drip screen never
  auto-administers anything.

## 3. Functional requirements

- **FR-1** "Start TQ timer": capture start timestamp (device local clock) + a
  short label (free text or a small limb preset list: ліва рука / права рука /
  ліва нога / права нога / інше). Multiple independent timers, one per
  tourniquet — no artificial cap beyond what fits the screen cleanly (recommend
  **up to 4**, matching the drip screen's "up to 3" precedent for glove-friendly
  clarity; Owner to confirm the cap).
- **FR-2** Live elapsed-time display per timer (HH:MM:SS), always visible while
  the app is open; independent of any drip/metronome state.
- **FR-3** At **2:00:00** elapsed: fire the "warn" alarm pattern (reuse
  `alarm("warn")`) + show the TCCC 2-hour text, source-badged. Non-recurring
  (fires once per timer).
- **FR-4** At **6:00:00** elapsed: fire the "empty" alarm pattern (reuse
  `alarm("empty")`, distinct sound/vibration from the 2 h alarm) + show the
  TCCC 6-hour text, source-badged. Non-recurring.
- **FR-5** Both threshold texts are **gated on `VERIFIED`** status (Art. II) —
  transcribed now, `UNVERIFIED`, shown only after Owner sign-off; the timer
  itself (elapsed time, alarms firing) works regardless — a stopwatch needs no
  clinical verification, only the doctrine text quoting TCCC does.
- **FR-6** On-screen reminder, always visible while a TQ timer is running:
  *"Познач час на самому джгуті та в картці постраждалого (форма 002-О)"* —
  reinforces TCCC §6.a.4 doctrine, not a substitute for the physical marking.
- **FR-7** Stop/remove a timer with the same two-tap confirm pattern as removing
  a drip (`confirmId` pattern in `DripScreen.tsx`).
- **FR-8** Local notifications fire even if the app is backgrounded (same
  mechanism as the drip end-of-bag alarm); airplane mode has no effect.
- **FR-9** App-killed caveat: like drip timers, MVP does not persist across a
  full app relaunch — on relaunch, if a TQ timer *was* running, show an explicit
  warning rather than silently losing it (same discipline as Spec 001 §6 edge
  case). Given the multi-hour duration here, this caveat is **more consequential
  than for a drip** — flag prominently in the UI copy, and lean harder on FR-6
  (physical marking is the real backup).

## 4. Acceptance criteria

- **AC-1** Starting a timer captures the correct start time; elapsed display is
  accurate to the second.
- **AC-2** 2 h and 6 h alarms fire at the correct elapsed time, in airplane mode,
  with distinct alarm patterns (automated timestamp test, same style as
  `tests/metronome-drift.test.ts`).
- **AC-3 (Art. III)** With the threshold record `UNVERIFIED` (seed state), the
  timer still counts and still alarms, but the guidance text is absent —
  automated fail-closed test (same pattern as `guard.test.ts`).
- **AC-4** Up to the configured cap of concurrent TQ timers run independently;
  each fires its own alarms on its own schedule.
- **AC-5 (SC-3)** Zero network calls (extends `offline.test.tsx`).
- **AC-6** The "mark on the TQ and casualty card" reminder is always visible
  while any TQ timer is active.

## 5. Out of scope (this feature)

Any decision logic about *whether* to convert/remove (medic judgment only, never
automated); tracking bleeding-control method or casualty vitals; syncing/sharing
timer state between devices; anything beyond the two TCCC-stated thresholds.

## 6. Edge cases

- Timer running past 6 h with no action: keep counting past 6 h (no cap), no
  further repeated alarms (avoid alarm fatigue) — a persistent "6 h+" visual
  state is enough.
- Wrong start time entered: allow manual time correction (Owner to confirm
  whether editing a running timer's start time needs a confirm step, given the
  safety weight of this number).

## Clarifications needed

- **Data representation:** the 2 h / 6 h threshold text needs a place in
  `clinical/uk-cpp.v1.json` — likely a new `formulas[]` entry (`kind: "clinical"`,
  since these are literal source thresholds, not deterministic math like
  `drip_rate`) or a small schema addition. Recommend reusing the existing
  `formula` shape with `notes` carrying the two threshold texts; final call at
  spec review.
- Concurrent-timer cap (recommended 4, matching the "up to 4 limbs" framing) —
  confirm with Owner.
- Manual start-time correction UX — confirm.
