# Spec 001 — Drip Engine (rate calculator + metronome + concurrent drips)

- **Feature ID:** 001-drip-rate-core
- **Status:** Draft → pending Owner approval
- **Priority:** P0 (Sprint 1)
- **Version:** 1.6 (5 concurrent drips, up from 3; two-stage 10-min + 5-min
  pre-end alarm, up from the single 10-min alarm; per-drip alarm mute
  opt-out; louder/longer alarm tone; OS-level local-notification backstop so
  alarms fire with the screen locked, on a dedicated HIGH-importance channel,
  with a `patch-package` fix for a plugin bug that forced every notification
  private regardless of channel config — Owner decisions 2026-07-21/22; see
  `plan/architecture.md` §4a/§4a.1/§4a.2)
- **Depends on:** 005-clinical-content-pipeline (for the `drip_rate` engineering formula).

## Constitution Check

- Art. I: the drip formula is an `engineering` record (`drip_rate`), source-tagged;
  no clinical dose values are introduced here. ✔
- Art. III: out-of-range inputs yield a clear refusal, never a fabricated rate. ✔
- Art. IV: persistent disclaimer present; integer output shown clearly. ✔

---

## 1. Why

The medic has a prepared bag and needs to run it over a target time (or at a target
rate) on a gravity set, pace the drip, and get warned before it runs dry — often
for **more than one line at once**. This is the core, most-used function: instant,
unambiguous, usable one-handed with gloves at night.

## 2. User stories

- **US-1** I enter volume + target time + drop factor → exact **gtt/min** to set on
  the roller clamp.
- **US-2** I enter volume + target rate (gtt/min) + drop factor → the run time and
  ml/hr, so I can plan.
- **US-3** I start a **metronome** ticking at the drip interval and match the roller
  clamp to it; I can independently toggle sound, vibration, and the animated drop
  (silence discipline → vibration-only).
- **US-4** I see the wall-clock time the bag empties, and get **two explicit
  alarms before it does — at 10 minutes and at 5 minutes remaining** — and again
  **at empty** ("prepare next bag / reassess").
- **US-5** I can run **up to 5 drips at once**, each with its own rate, countdown,
  and alarms, and see them together without confusion.
- **US-6** I can explicitly mute all alarms for **one specific drip** (checkbox,
  off by default) if I judge it unnecessary for that line — this never affects
  any other concurrent drip's alarms.

## 3. Functional requirements

- **FR-1** Compute `gtt_per_min = round(volume_ml / time_min × drop_factor)` from
  the `drip_rate` record. Integer output.
- **FR-2** Inverse mode: volume + gtt/min + drop factor → run time + ml/hr.
- **FR-3** Drop-factor selector: a **prominent, glove-friendly** control (large
  buttons ≥48 px, e.g. a 2×2 grid) offering **10 / 15 / 20 / 60 gtt/ml** + a custom
  integer. Default **20 gtt/ml** (common UA macrodrip). The chosen value is always
  visible and echoed in every result.
- **FR-3a** Weight-based infusion → rate: for a drug with a concentration
  (mg/ml) and a dose rate (mg/kg/h), compute `ml/h` and `gtt/min` via the
  `dose_rate_to_gtt` engineering formula (`ml/h = mg/kg/h × weight / conc`;
  `gtt/min = round(ml/h × drop_factor / 60)`). Concentration + dose come from the
  VERIFIED drug record; only the arithmetic is done here.
- **FR-3b** For slow drips (gtt/min < ~10), also show **"1 drop / X s"** — it is
  more precise to pace than a rounded drops-per-minute for low rates.
- **FR-3c** Numeric inputs (weight, dose rate) use **large −/+ steppers** with big
  centred numerals — **no fine sliders** (glove-friendly, one-tap changes). Steps:
  weight 5 kg, dose 0.05 mg/kg/h (confirm). Values clamp to Spec-000 bounds.
  Drops/min is the hero output; ml/h and mg/h are secondary. (Owner design, 2026-07-13.)
- **FR-3d** If a drip has a linked loading/priming bolus record (`bolus_for`), show
  that bolus computed for the patient weight (e.g. 0.2–0.3 mg/kg → 16–24 mg), **only
  when the bolus record is VERIFIED**. Selecting a sedation concentration shows a
  telemedicine caution ("седація без телемедицини краще не застосовувати"). Analgesia
  is the default; sedation is never the default. (Owner, 2026-07-13.)
- **FR-3e Focus mode.** Tap an active drip → full-screen night view: big label, big
  drops/min with live **retitration** (±1 gtt/min), and a large chamber. The chamber
  shares the card's phase via a per-drip `animStart` anchor, so opening focus
  **continues the phase — it never restarts**.
- **FR-3f Phase sync.** The audio metronome, the optional silent **screen flash**,
  and the chamber animation are all anchored to the active drip's `animStart` (ticks
  at `animStart + n·period`) so sound, flash and drop share one phase. (ADR-0005.)
- **FR-3g Tap calibrator.** Tapping in time with the real chamber (≥3 taps) measures
  the actual gtt/min being run + its bag run-time; applies to the "Час мішка" calc.
- **FR-3h** Confirm-to-remove (two-tap) for a running drip; remembered last drop
  factor + drug (local only); three distinct alarm patterns — 10-min warning
  (single beep), 5-min warning (double beep), and empty (triple beep) — so the
  medic can tell the stage apart without looking. Beeps are a **square-wave
  tone at near-max gain, ~0.45 s each** (louder/longer than the original soft
  sine beeps — Owner decision 2026-07-21, field feedback that the original was
  too quiet to trust).
- **FR-3i** Auto-dim the screen in night focus — *needs the Capacitor screen-brightness
  plugin + native build; deferred to the APK step.*
- **FR-3j Pacing model (UX).** Exactly one drip paces at a time (its metronome runs).
  Pacing is an explicit play/pause control on the card **and** in focus; **opening
  focus never starts or stops pacing**. The audio/haptic/flash channel toggles are
  shown **only while a drip is pacing** (they only describe how the metronome
  signals) — so there is no "sound is on but nothing plays" state. (Fixed 2026-07-15.)
- **FR-3k** The drip-chamber drop is **muted/grey when that drip is not pacing** (its
  animation then has no true rhythm). The channel toggles are also available inside
  the focus view, only while that drip is pacing. The animation models a real
  chamber: the drop **forms slowly** (this is what varies with flow rate) then falls
  in a **short, snappy segment** (a fall always looks quick). (2026-07-15.)
- **FR-4** Metronome interval = `60 / gtt_per_min` s. Channels: (a) audio tick,
  (b) haptic pulse, (c) animated falling drop — each independently on/off.
- **FR-5** Audio/haptics scheduled on a monotonic audio clock (ADR-0005), NOT
  `setInterval`.
- **FR-6** End-of-bag timer per drip: from start + volume + rate, show finish
  wall-clock time; fire **two local pre-end alarms — at 10 min and at 5 min
  before empty** (lead times, Owner decision 2026-07-21; supersedes the single
  10-min-only alarm from 2026-07-18) and a third alarm **at empty**. No network.
- **FR-7 (concurrency)** Support **1–5 concurrent drips** (raised from 3, Owner
  decision 2026-07-21). Each drip is an independent unit (its own volume, rate,
  drop factor, timer, alarms). Adding a 6th is blocked with a message.
  Removing/finishing one frees a slot.
- **FR-7a (alarm opt-out)** Each drip with an end-of-bag timer configured shows
  a **"Без будильника"** checkbox, **off by default**. When checked, all three
  of that drip's alarms (10-min, 5-min, at-empty) are muted; every other
  concurrent drip's alarms are unaffected. Scoped to one drip only — never a
  global setting, never on by default. A live, informational-only hint next to
  the checkbox shows how much of the remaining run time is still ahead of the
  10-min alarm window (does not drive any logic). (Owner decision 2026-07-21.)
- **FR-8 (concurrency UX)** All active drips are visible together (name/label,
  gtt/min, time remaining). The medic can tell them apart at a glance under stress.
- **FR-9 (metronome + concurrency)** Define audible behavior with multiple drips:
  the medic selects **one "active" drip** whose metronome sounds/vibrates at a time
  (others show visual countdown only), OR distinct cues per drip — **Owner to pick**
  (see Clarifications). Default: one audible metronome at a time to avoid tick
  collisions.
- **FR-10** Input bounds/clamps; out-of-range → blocked with a reason (Art. III).
  Exact bounds in `plan/architecture.md`.
- **FR-11** Rounding/units shown explicitly (e.g. "8 gtt/min ≈ 1 drop every 7.5 s").
- **FR-12 (locked-screen alarm delivery)** The 10-min, 5-min, and at-empty
  alarms must still fire while the screen is locked. The in-app AudioContext
  alarm alone is not sufficient (Owner-reported 2026-07-21: fired 7 min late
  after screen-off, since the WebView's timers are suspended on lock). Each
  drip with a bag timer schedules matching OS-level local notifications
  (`@capacitor/local-notifications`, on-device only — no network, Art. V
  unaffected) as a backstop; muted via "Без будильника" (FR-7a) exactly like
  the in-app alarm. Notification permission is requested once per session; if
  denied, a visible warning tells the medic rather than failing silently.
  Notifications post to a dedicated HIGH-importance, public-visibility,
  vibrating channel (not the plugin's implicit default) — the first version
  posted the text on time but with no audible/vibration signal, which
  defeats the purpose (Owner-reported same day). The public-visibility part
  needed a `patch-package` fix too: the plugin hardcodes every notification
  to `VISIBILITY_PRIVATE` regardless of channel config (found in its Android
  source) — patched to `VISIBILITY_PUBLIC`. `autoCancel: true` so it clears
  on tap; `ongoing: true` was tried and then removed (likely cause of a
  lock-screen-visibility regression on some OEM skins). No `fullScreenIntent`
  support in this plugin — that's the real mechanism for "breaks through a
  fully locked screen" (alarm-clock/incoming-call style), a separate, bigger
  native-plugin item if still needed after on-device testing. (Owner
  decisions 2026-07-21/22; see `plan/architecture.md` §4a/§4a.1/§4a.2.)

## 4. Acceptance criteria

- **AC-1 (SC-1)** (500 ml, 4 h, 20) → **42**; (500 ml, 20 h, 20) → **8**;
  (1000 ml, 8 h, 15) → 31; (250 ml, 30 min, 60) → 500. (Automated.)
- **AC-2 (SC-2)** One drip: audio+haptic+animation stay in sync ≥10 min, drift
  < 1 drop/10 min. (Automated timestamp test.)
- **AC-3** Toggling a metronome channel affects only that channel.
- **AC-4** Vibration-only mode produces no audio (silence discipline).
- **AC-5 (SC-9)** Each drip's finish time = start + volume/rate within ±1 min; the
  **10-min pre-end alarm**, the **5-min pre-end alarm**, and the **at-empty
  alarm** all fire, in airplane mode, each with a distinguishable pattern.
- **AC-6 (SC-9)** With **5 concurrent drips** at different rates, each keeps its own
  correct countdown and fires its own alarms independently; a 6th is blocked.
- **AC-6a** With **"Без будильника" checked** on one drip, none of its three alarms
  (10-min, 5-min, at-empty) fire; other concurrent drips' alarms are unaffected
  and fire normally. Unchecking it re-enables future alarms for that drip
  (already-passed thresholds do not fire retroactively).
- **AC-7** Out-of-range input → blocking message, no computed number.
- **AC-8 (SC-3)** Fully functional offline; zero network.
- **AC-9 (FR-12)** With the screen locked (or the app backgrounded) before a
  drip's 10-min mark, the medic still receives the 10-min, 5-min, and
  at-empty alerts (as OS notifications) without unlocking the phone. If
  notification permission is denied, the app shows a visible warning instead
  of silently doing nothing. **Needs on-device confirmation** — cannot be
  verified from a build sandbox without a real Android device.

## 5. Out of scope (this feature)

Which drug/dose to run (Spec 002), burn-rate computation (Spec 003), infusion-pump
modes, >5 concurrent drips, cross-drip interaction logic.

## 6. Edge cases

- gtt/min rounds to 0 → "< 1 gtt/min; check parameters", no metronome.
- Very fast rate (>600 gtt/min) → warn gravity set/metronome may be impractical.
- Screen sleep / app backgrounded → alarms must still fire — **implemented
  2026-07-21 via local notifications (FR-12)**; audio metronome may still be
  suspended and re-anchors on resume (documented in architecture, §4a).
- App killed → on relaunch, warn that running drips/timers were lost (no false
  sense of a still-running countdown). MVP does not persist live drips.

## Clarifications needed

- **FR-9 multi-drip metronome behavior** (one audible at a time vs distinct cues) →
  Owner preference.
- **Pre-end lead times — RESOLVED (Owner, 2026-07-21):** two-stage, 10 min and
  5 min before empty (not configurable in the MVP). Exact input clamps →
  confirm.
- **Rounding policy — RESOLVED (Owner, 2026-07-13):** compute **exact**, round only
  the final displayed drops/min (option A). Keep full precision internally (e.g.
  ml/min = 0.267, not 0.26). Consequence accepted: two cells of the *sedation* table
  (1.25 & 1.75 mg/kg/h) read 1 ml/h below CPG-61's printed card (CPG derives ml/h
  from rounded µg/kg/min) — clinically trivial, and the analgesia drip has no printed
  card to clash with.
