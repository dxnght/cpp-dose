# Changelog

Append-only, one entry per meaningful change (per `TACMED-POC-MASTER-BRIEF.md` §0.3
working agreement #5). Grouped by day; not a 1:1 mirror of `git log` — see that for
full commit-level detail. Clinical-content verification changes are also logged
separately, per-record, in `clinical/VERIFICATION-LOG.md`.

## 2026-07-25 (later — vibration on iPhone, and the screen flash removed)
- **Vibration on iPhone: genuinely impossible in the web build, unlike the
  alarm sound.** Owner reported the drip doesn't buzz on iPhone. Re-checked
  rather than assumed, because the sound turned out to be our bug an hour
  earlier: **WebKit has never shipped the Vibration API** — no flag, no
  prefixed variant, nothing a web page can reach the taptic engine with.
  Where vibration does work: Android web/PWA ✔, Android APK ✔, native iOS app
  ✔ (Capacitor Haptics → `UIImpactFeedbackGenerator`), iPhone PWA ✘.
- **Why that matters more than a missing nicety:** on an iPhone PWA with the
  ring switch on silent, there is now **no non-visual alarm channel at all**.
  The drip hint says that outright — check the ring switch, and use the
  Android APK if vibration is needed — instead of leaving the medic to assume
  a buzz that can't come. `haptics.ts` documents the per-platform matrix so
  this isn't rediscovered later.
- **Screen flash removed (Owner: "не потрібен наразі").** The metronome's
  third, fully silent channel — a full-screen tint pulsing on each drop —
  is gone: state, refs, tick handler, the overlay element, both toggles, the
  CSS layer, and the hint text that advertised it. Taken out rather than
  hidden behind a setting: an unused option on a safety-critical night screen
  is one a medic can switch on by accident. Spec 001 FR-3l records the removal
  and FR-3f no longer claims a three-channel phase anchor; `IDEAS.md` notes how
  to restore it (the metronome's `setTickHandler` seam still exists) and that
  on iPhone PWA a visual channel is the *only* silent option there could be —
  worth remembering if a medic ever asks for silent pacing.
- Spec 001 → 1.14. `test` 80/80, `tsc -b`/lint clean. No clinical values
  changed.

## 2026-07-25 (alarm was silent on iPhone — four real bugs, not a platform limit)
- **Owner field report:** on iPhone the alarm changed the card colour but made
  **no sound**. Easy to write off as "PWA/iOS limitation" — it wasn't. Four
  separate defects in `alarm()`, each independently enough to silence it, and
  all four failing *silently* because the function swallowed everything in a
  bare `catch`. For the app's primary safety signal that's the worst possible
  failure mode.
  1. **A fresh `AudioContext` built inside a timer callback.** iOS starts any
     context created outside a user gesture in `suspended` state, and a
     suspended context plays nothing. The metronome worked only because
     `Metronome.start()` happens to run from a tap, unlocking *its own,
     different* context — which is exactly why it looked like "the app makes
     sound but the alarm doesn't".
  2. **`resume()` never called.** iOS suspends the context whenever the app is
     backgrounded and leaves it that way on return.
  3. **No `webkitAudioContext` fallback** (the metronome had one). On Safari
     builds exposing only the prefixed constructor, `alarm()` found
     `undefined` and did nothing at all.
  4. **A leaked context per alarm, never closed.** iOS caps concurrent
     AudioContexts (historically ~4); past that, construction throws — into
     that same empty `catch`.
- **Fix:** new `src/drip/audio.ts` — one shared context for the whole app,
  created once, unlocked from the first user gesture (a one-sample silent
  buffer, which is what iOS actually requires; `resume()` alone isn't enough
  on older versions), and resumed defensively before every sound. `alarm()`
  and `Metronome` now both use it. `DripScreen` unlocks on the first
  pointerdown/touchstart of the session, so the alarm is armed long before
  it's needed rather than depending on the medic having started the metronome.
- **A test caught a bug in the fix itself** — `alarm()` called `resumeAudio()`
  *before* `getAudioContext()`, and since resume only acts on an
  already-created context, the very first alarm of a session skipped the
  resume entirely. That is precisely the case that matters. Order swapped;
  the test pins it.
- New `tests/alarm-audio.test.ts` (6 tests), one per defect plus the
  beep-count-per-stage escalation. `tests/metronome-drift.test.ts` updated for
  the now-shared context (it memoises, so each case resets it).
- **Still genuinely not fixable here, and now said in the UI:** on iPhone the
  hardware Ring/Silent switch mutes Web Audio. A native app can override that
  with an AVAudioSession `playback` category; a web app cannot. The drip
  screen's hint now tells the medic to check the switch and notes that
  vibration and the card highlight work regardless.
- **Notifications not arriving in the PWA is expected**, not a bug: the PWA is
  built with `VITE_VARIANT=play`, which compiles the OS-notification layer out
  entirely — and iOS PWAs can't schedule local notifications anyway.
- Attribution added to the About screen and README: «Створено інструкторами
  151 НЦ, за підтримки Тактичної Медицини "ПІВНІЧ"».
- `test` 80/80 (was 74), `tsc -b`/lint clean. No clinical values changed.
- **Needs on-device recheck:** iPhone, ring switch ON, tap the screen once,
  then let a drip reach its 10-min mark.

## 2026-07-24 (simplification pass, branch `fix/ux-review-findings`)
- **`variant/play-store` replaced by a build flag — it had rotted 20 commits
  behind.** Found while answering the Owner's "should we rewrite natively"
  question: the branch we were preparing *specifically to publish on Google
  Play* was missing every fix from the preceding two days (mute
  text-selection, short-bag false alarm, `displayTag`, v6 orphan sweep, v7
  persistence, the new icon). A release cut from it would have shipped
  known-broken. New `src/config.ts` + `VITE_VARIANT=play|apk`: one codebase,
  the notification subsystem no-ops in the Play build, and
  `patch-android-manifest.mjs` now actively *removes* `USE_EXACT_ALARM` for
  that variant (so switching variants can't leave it behind). New
  `npm run build:play` / `apk:play`. 7 tests in `tests/variant-play.test.ts`
  pin that the flag really disables scheduling — including two that prove the
  default build still schedules, so the test can't pass by mocking things
  into silence.
- **Notification archaeology moved to `decisions/ADR-0008-notification-saga.md`.**
  `notifications.ts` was 368 lines of which 177 (48%) were comments — seven
  rounds of on-device debugging history. Valuable (it's what stops v5's
  self-cancel being reintroduced) but it doubled the reading cost of the
  module. File is now 330 lines with a short header naming the two invariants
  that must not be re-broken, pointing at the ADR for the full account.
  **No behaviour changed.**
- **`DripScreen.tsx` 1479 → 1244 lines.** Extracted the self-contained leaves:
  `format.ts` (nowMs/fmtHours/fmtHM/dur), `alarm-audio.ts` (the in-app tone),
  `components.tsx` (Stepper/Chamber/SilenceToggle). Mechanical, behaviour
  unchanged, covered by the existing suite. The larger hook extraction
  (`useDrips`/`useDripAlarms`) is still worth doing but is a bigger, riskier
  change — left for its own pass rather than bundled in here.
- New `reports/DEPLOY-PWA.md` — step-by-step to a public PWA URL (~3 h). The
  PWA was already fully configured in `vite.config.ts`; nothing needed
  building, only hosting. This is the cheapest route to real users: no store
  review, no 12-testers-for-14-days, no fees, and it's a way to test iOS
  *now* without the macOS/Xcode upgrade.
- Grant materials reviewed before first send: stale "50 автотестів" → 74,
  `[PWA_URL]` slots added to every pitch, and a pre-send checklist added at
  the top of `outreach/PITCH-MESSAGES-2026-07-24.md`.
- `test` 74/74 (was 67), `tsc -b`/lint/validate/gate:release clean.

## 2026-07-24 (v7 — drip state now survives a restart, `fix/ux-review-findings`)
- **Owner report:** started drips, swiped the app away, notifications still
  arrived — "баг чи фіча, навіть не знаю".
- **Diagnosis: the notifications are correct** (that's the entire point of
  FR-12 — the process *is* dead; Android's AlarmManager holds the alarms, not
  a leaked process). **The real defect was underneath it:** drip state and
  alarms had different lifetimes. Drips died with the process (§6, on
  purpose); alarms survived (FR-12, on purpose). So an alarm fired for a drip
  the app could no longer show.
- **And the v6 sweep made one case actively worse — flagged rather than
  buried.** Medic starts a 4 h drip → Android reclaims the app (memory
  pressure, indistinguishable from a swipe) → medic reopens an hour later →
  the sweep cancels every remaining alarm, while the bag is *physically still
  running*. Before v6: a contextless alarm. After v6: silence. That's a
  regression in the dangerous direction.
- Also found: §6 required a "running drips were lost" warning on relaunch.
  Grepped for it — **never implemented**.
- **Owner decision (asked, not assumed — this changes a documented spec
  decision): persist drips + require confirmation.** New
  `src/drip/persistence.ts`; drips are written to `localStorage` (on-device,
  no network — Art. V untouched) and restored on launch as `unconfirmed`:
  dashed border, dimmed, warning banner, explicit "підтвердь, що ще крапає"
  per card. They still count down and still arm alarms — a spurious alarm
  beats a missed one — but can't be read as verified until acknowledged. That
  keeps §6's original concern (no false sense of a still-running countdown)
  while ending the lifetime mismatch that caused all of this.
- **Deliberately not persisted:** `displayTag` (may hold a callsign — the
  2026-07-24 threat model keeps it in memory only; `serializeDrips` rebuilds
  the record field-by-field so this holds at *runtime*, not just in the type
  system, and there's a test that smuggles the field past a cast to prove it);
  the `sourceRecord` snapshot (re-resolved by id from the field bundle, so
  verified clinical content is never duplicated into mutable storage — Art.
  I/II); `warned10/5` (recomputed from the clock, so a stale flag can't
  suppress a warning still due).
- Storage that's absent, malformed, or describes a bag that ran dry over an
  hour ago is discarded silently — a dosing tool must always start. The
  one-hour cutoff is an engineering/UX judgement, not a clinical value, and is
  documented as such; say the word if it should be different.
- The v6 sweep is now safe as-is: restored drips re-arm fresh alarms in the
  same pass, and v6's scheduling gate already guarantees the sweep finishes
  first.
- Spec 001 → 1.13 (FR-13, AC-6f; §6's "does not persist live drips" marked
  superseded). `test` 67/67 (was 54), `tsc -b`/lint clean.
- **Needs on-device confirmation:** kill the app with a drip running, reopen,
  check the drip is back, marked unconfirmed, with a sane countdown.

## 2026-07-24 (v6 notifications, branch `fix/ux-review-findings`)
- **Fixed: alarms fired for drips that had been deleted, with the app not
  even running** (Owner field report). This is the last one in the
  notification saga that wasn't a logic error at all — it was a **lifetime
  mismatch**.
- **Root cause:** `notifications.ts` keeps its notification-id bookkeeping
  (`idMap`, `nextId`) **in memory**, deliberately — live drips aren't
  persisted either. But the notifications themselves are armed in Android's
  **AlarmManager**, which survives the app being killed, swiped away, or the
  device rebooting. So the moment the process died, every id the module had
  handed out was forgotten while the alarms those ids referred to stayed
  armed in the OS. `cancelDripAlarms()`/`forgetStaleDrips()` can only cancel
  ids still visible in `idMap`, so after a restart there was nothing left to
  cancel *with*, and the orphan fired on schedule. Within a single session
  cleanup always worked — which is why this survived five previous rounds of
  notification fixes.
- **Fix:** new `cancelOrphanedAlarms()` — a memoised, once-per-launch sweep
  that cancels every still-pending notification and clears already-delivered
  ones from the tray. It's safe to do unconditionally *because* live drips
  are never restored across a restart: any pending drip alarm at startup
  belongs to no drip, by construction. Called at mount in `DripScreen.tsx`.
- **Subtle part, worth knowing:** `rescheduleDripAlarms()` now `await`s that
  sweep before touching any id. `nextId` restarts at 1 every launch, so a
  drip added right after opening the app gets exactly the ids the sweep is
  busy cancelling — without the gate, an in-flight sweep could cancel the
  *new* drip's alarms, which is a worse failure than the one being fixed
  (silent no-warning instead of a spurious warning).
- New `tests/notification-orphans.test.ts` (4 tests, Capacitor plugin
  mocked). **Verified these actually catch the bug** — removed the fix and
  confirmed the ordering test fails, then restored it. The first draft of
  that test passed with *and* without the fix (a bare `indexOf` comparison
  is vacuously true when the sweep never runs at all: `-1 < anything`);
  rewritten to assert presence before order.
- Spec 001 → 1.12 (FR-12 note, AC-6e). `test` 54/54 (was 50), `tsc -b`/
  lint/validate/gate:release clean. No clinical values changed.
- **Needs on-device confirmation** — like the rest of this saga, the
  reasoning is grounded in the actual code, but the symptom was only ever
  observed on a real device.

## 2026-07-24 (still later, branch `fix/ux-review-findings`)
- **Fixed: a short bag (<10 min total) immediately fired the "10 min
  left" alarm at creation** (Owner report). Root cause: `warned10`/
  `warned5` always started `false`, and the in-app tick effect fires a
  stage the instant `remaining <= threshold`. For a bag whose whole run
  time is already ≤10 min, remaining time starts below the threshold —
  there's no moment of *crossing down through it*, so firing that alarm
  at t=0 was announcing something that was never a real event, just an
  inherent (and already-known) property of a short bag.
- **Fix:** new `preSatisfiedAlarmStages()` in `calc.ts` (pure, unit
  tested) — seeds `warned10`/`warned5` as already-satisfied at `addDrip()`
  time when the bag's total duration never exceeds that threshold, so
  only a stage the drip can genuinely cross still fires. Deliberately a
  one-time seed at creation, not a new dependency in the reschedule
  effect — doesn't touch `dripScheduleKey`/`rescheduleDripAlarms` at all,
  so it can't reintroduce the v5 self-cancel class of bug (warned-flag
  changes still don't drive OS-notification rescheduling). Scoped only to
  drip *creation*; retitration that shortens a running drip below a
  threshold still fires normally (that's a real, alarm-worthy change in
  circumstances, not a bag that was always going to be short) — out of
  scope for this report, not touched.
- Spec 001 bumped to 1.11 (FR-6 note, AC-5a). 6 new unit tests in
  `tests/drip-calc.test.ts` (8-min/3-min/15-min/exactly-10-min/no-bag-
  timer/mlPerH-0 cases).
- `test` 50/50 (was 44), `tsc -b`/lint/validate/gate:release all clean.
  No clinical values changed.

## 2026-07-24 (even later, branch `fix/ux-review-findings`)
- **Owner did their own code review pass on this new branch** (several
  real fixes: keyboard reachability on `SilenceToggle`, an aria-label
  mismatch, a stale-closure bug in `addDrip`'s renumbering, a missing
  `label` dependency in a schedule effect, perf tightening on
  `checkNotificationHealth`, the flex-`order` visual reorder replaced with
  a real JSX move, a spec FR-8 example fix, plus a spelling pass on the
  notification strings). Not this agent's work — noted here since it's
  the base everything below builds on. 44/44 tests (was 43).
- **New: optional in-app-only per-drip display tag (FR-8a, AC-6d)** —
  Owner asked whether concurrent drips should be labelable (callsign? bed
  number?) as a "think about it" question. Worth walking through the
  reasoning since it shaped the design: a free-text tag is fine to keep
  purely in-memory (confirmed by reading the code — `drips` is a plain
  `useState`, never hydrated from `localStorage`, and §6 already documents
  that MVP doesn't persist live drips at all). But "never transmitted"
  isn't the same as "never exposed" — `notifications.ts` interpolates a
  drip's `label` directly into the OS notification body, and that channel
  is deliberately `VISIBILITY_PUBLIC` (a prior fix, specifically so it
  shows on a locked screen). Anything identifying in `label` would
  therefore appear on the lock screen every 10/5 min and at bag-empty,
  visible to anyone glancing at the phone — a materially bigger exposure
  than local persistence, and one "in-memory only" doesn't address by
  itself. Resolution: split the two. `ActiveDrip.displayTag` is a new,
  separate, optional field — editable in Focus mode, shown on the card and
  in Focus — that is never read by `dripScheduleKey()` or
  `rescheduleDripAlarms()`; those keep using `label` alone, unchanged. The
  `rescheduleDripAlarms({...})` call site is kept as an explicit field
  list (not a `...d` spread) with a comment explaining why, specifically
  so a future refactor can't silently smuggle `displayTag` into a
  notification. No content validation on the tag; the input's placeholder
  ("мітка (напр. ліжко 3)") nudges toward a positional tag over a personal
  one (callsign/name) as a suggestion, not an enforced rule.
- Spec 001 bumped to 1.10 (FR-8a, AC-6d).
- `test` 44/44, `tsc -b` clean. No clinical values changed; no network
  code added (Art. V unaffected — this is presentation-layer state,
  scoped deliberately away from the one channel that does reach outside
  the app itself).

## 2026-07-24 (later, branch `feature/ux-review-improvements`)
- **App icon swapped again, superseding the entry directly below.** The
  droplet-in-a-dial icon looked wrong once actually seen on-device: pale
  and mostly white/light-gray, it reads as washed-out against a real home
  screen next to other apps' bolder icons. Owner picked a different one of
  the same original 5 candidates instead — 4 IV bottles (VOL/TIME/RATE/
  DOSE) converging on a "CP" logo ring, dark background with pink/cyan
  neon. High contrast, reads clearly even at true 48px (checked directly,
  not assumed).
- New source `design/app-icon/icon-2-2407.jpg`; `scripts/design/
  generate-app-icon.py` updated in place (`SRC`/`CROP_BOX`, now a
  1490x1490 square framing all 4 bottles + the ring right at the
  composition's own soft-vignette edge) and re-run — same script, same
  output targets, just pointed at the new source. Old source
  (`drop_hovering.jpg`) kept on disk for the record; no longer referenced.
- This art has no separable wordmark to crop out: the small "CPP-DOSE"
  caption sits inside the ring as part of the "CP" logotype itself, not a
  banner below it like the droplet source had — left in place rather than
  cutting into the logo mark to remove it.
- `test` 43/43, `tsc -b` clean. Icon swap only.

## 2026-07-24 (branch `feature/ux-review-improvements`)
- **Real app icon**, replacing Capacitor's generic default (teal "C" on a
  grid) everywhere it was still showing. Owner generated 5 candidate icon
  concepts externally (Flow/Gemini/ChatGPT, per Owner's own earlier call
  that icon art is their task, not an agent's); picked the "droplet
  hovering in a glass dial, drops/min + RATE … ml/hr readout, timer-tick
  ring, flowing wave beneath" concept as the strongest fit — it's the only
  one of the 5 that depicts the app's actual computed values (gtt/min,
  ml/hr) and a timer face, versus a generic tech abstraction or a neon/
  gaming treatment that fit poorly against "tool a medic trusts under
  stress."
- Source art `design/app-icon/drop_hovering.jpg` (tracked; lives outside
  `public/` so Vite never bundles the source into the shipped offline PWA).
  Cropped to a 1792×1792 mark (drops the source's own baked-in "CPP-DOSE"
  wordmark — the OS already labels the icon with the app name, so a second
  copy inside the graphic is redundant per both platforms' icon guidance —
  and the tail of the wave below it).
- New tracked, rerunnable `scripts/design/generate-app-icon.py`
  (Pillow-based; manual design tool, not wired into `npm run build`/`test`/
  `gate:release`) regenerates every platform size from that one source:
  PWA icons in `public/` (192/512/1024/maskable/apple-touch-icon), Android
  adaptive-icon foreground + legacy `ic_launcher`/`ic_launcher_round` at
  all 5 densities plus a background color sampled from the art itself
  (`#EDECF2`), and the iOS `AppIcon.appiconset` (single 1024×1024
  "universal" image, current Xcode/Capacitor format).
  **Why this script matters beyond today:** `android/` and `ios/` are
  gitignored (regenerated from the web build, per `.gitignore`) — a fresh
  `npx cap add android`/`ios` wipes any hand-edited native icon back to
  Capacitor's generic default with no warning. This script is what puts
  the real one back in one command; re-run it after any `cap add`.
- Android/iOS content each get a *padded* variant (mark scaled to ~68-72%
  of canvas, centered, background-color-filled margin) for the layers the
  OS itself crops to a circle/squircle/rounded-square (adaptive-icon
  foreground, maskable PWA icon) — every launcher mask shape guarantees
  the inner 66-80% stays visible, so the full mark clears all of them.
  Legacy square/full-bleed variants (iOS, `ic_launcher.png`, PWA icons) use
  a plain resize, since the source art already has natural margin.
- `test` 43/43, `tsc -b` clean. Icon swap only — no code path, clinical
  content, or spec changed.

## 2026-07-22 (new branch `feature/ux-review-improvements`)
- Implemented a batch of findings from `reports/UX-REVIEW-2026-07-22.md` (4
  parallel read-only expert passes; Owner picked which of the more
  consequential ones to act on, via AskUserQuestion).
- **Alarm mute is now press-and-hold to enable** (~600 ms), single tap to
  disable — silencing a drip's only alarm should be harder than turning it
  back on. Bigger touch target (was a bare 20px checkbox), and the enabled
  state is now the visually loud one (red pill), not dim.
- **Alarm-stage visual escalation** — a drip's card (and Focus view) now
  shows matching border/text-color escalation for the 10-min/5-min/empty
  stages, independent of `silenced`, so urgency is recoverable by sight, not
  only audible at the instant it fires.
- **Source/verification badge now persists on a running drip** — snapshotted
  onto the drip at add-time and shown (compact form) on the card and in
  Focus mode for its whole lifetime; previously only shown in the setup
  selector before the drip existed.
- **Drug name added to labels** — dose-mode presets and running-drip cards
  used to show only category+concentration ("Знеболення · 1 мг/мл"), never
  which drug.
- **Auto-numbering for duplicate concurrent drips** — two drips that would
  otherwise share an identical label now read "… 1"/"… 2", no patient data
  involved.
- **Card-level `ErrorBoundary`** (`ClinicalRecordBoundary`) around
  `DrugCard`/`ProphylaxisCard` — a non-VERIFIED record's fail-closed throw
  (Art. III) now degrades just that card instead of unmounting the whole
  app. The `presets` list in `DripScreen.tsx` switched from a throwing
  `assertRenderable` to a silent `isRenderable` filter instead (a bulk
  `useMemo`, not a per-card render — a boundary can't help there; excluding
  achieves zero blast radius instead of a contained one).
- **Mechanical fixes:** removed dead CSS (`.drip-label`/`.drip-row`/
  `.drip-gtt`, unused since an earlier card layout); fixed a real light-theme
  contrast failure on the bottom nav (was hardcoded to the dark rgba
  regardless of theme); `.theme-toggle`/`.seg button` bumped from 44px to the
  file's own documented 48px touch-target minimum; consolidated 4 near-
  duplicate "banner" box implementations onto one `.banner` base + modifiers;
  added a small font-size token scale for the 11.5/12/12.5/13px cluster;
  styled `.drugs-duration`/`.drugref-pending` (previously no rule at all).
- **Terminology:** renamed the dose-mode tab "Препарат" → "За дозою" (was
  colliding with the "Препарати" nav tab); standardized the bagtime-mode
  fallback drip label to "Дріп" (was "Крапельниця", the same word as the
  screen's own title); nav's disclaimer button now uses the already-written
  but previously-unused `disclaimer.reopen` string, with a visually distinct
  (`.nav-aux`) treatment since it opens a modal rather than switching tabs.
- **Setup-panel reordering** — active drips now render above the "add a new
  drip" calculator once any exist (via CSS `order`, not by moving the
  calculator's own JSX/logic), so checking or muting a running drip no longer
  requires scrolling past the whole setup panel.
- Deferred (not this pass, logged to `IDEAS.md`): a distinct badge color for
  engineering formulas vs. Owner-verified records; any patient-linked
  identifier (conflicts with the no-patient-data posture).
- `test` 43/43, `tsc -b` clean, `validate`/`gate:release` OK. No clinical
  values changed; no code-review of the review itself needed since nothing
  here touches dose/rate formulas.

## 2026-07-22 (even later, same branch `feature/notification-channel-fix`)
- **Three more field reports, root-caused to one bug:** the empty-bag
  notification's text looked like a context-free glitch; the notification
  reliably showed ~1 min before the in-app alarm sounded; and with the
  drip's metronome sound toggle off + screen locked, no notification arrived
  at all (fully correct with sound on).
- **Root cause:** the reschedule effect in `DripScreen.tsx` gated each
  stage's *OS* notification on that stage's *in-app* `warned10/5/Empty`
  flag, and `rescheduleDripAlarms()` unconditionally cancels a drip's
  notification ids on every call. The moment the in-app tick (an
  independent 1s poll) caught up and flipped a flag — which, since the
  WebView freezes while locked, happens right as the medic unlocks the
  phone — it silently dismissed a notification the OS had already
  delivered. The sound-toggle correlation was a confound: active audio
  exempts the page from background-tab timer throttling, narrowing the
  window in which the self-cancel is visible; with sound off the window
  widens. Full account in `plan/architecture.md` §4a.4.
- **Fixed:** OS notification and in-app alarm are now fully independent
  channels; a new pure `dripScheduleKey()` (unit-tested) means the
  reschedule effect only touches a drip's notifications when its actual
  timing changes, never on an unrelated `drips` update or a warned-flag
  flip. Empty-alarm text now mirrors the 10/5-min notifications' phrasing.
  Added a `visibilitychange`/`focus` listener to shave the small, avoidable
  extra delay off the in-app catch-up on unlock.
- `test` 43/43, `tsc -b` clean.
- **Needs on-device confirmation** — same as the rest of this notification
  saga; the reasoning is grounded in the actual code, not a guess, but the
  original reports were only ever observed on a real device.

## 2026-07-22 (later, same branch `feature/notification-channel-fix`)
- **Field report came back inconsistent** across 3 tests: unlocked (fine, no
  alarm tone as expected since the metronome sound toggle was off — that
  toggle has no code path to the alarm system at all); locked-but-lit
  (nothing — no notification, no sound); locked-and-asleep (worked fully,
  both locked and after unlocking). Neither of the two tracked variables
  actually explains the pattern; Doze theory doesn't fit either (Doze is
  *more* restrictive screen-off, but that's the case that worked).
- **Real bug found and fixed:** the notification channel requested
  `importance: 5` — Android's actual scale is `0..4` (HIGH=4), there is no
  5. The plugin's loose TypeScript type didn't catch this. Not confirmed as
  *the* cause of the inconsistent report, but a genuine bug regardless.
  Fixed to `4`; channel bumped to `drip-alarms-v4` (fresh id).
- **Most likely real explanation: Android's battery-optimization/App
  Standby bucketing** — outside anything this app's notification config
  controls, and exactly why messaging apps (Telegram, the Owner's own
  comparison) request exemption from it. Added a permanent, calm (non-alarm)
  in-app tip recommending the medic exempt CPP-DOSE from battery
  optimization via system settings. No new native plugin (per Owner
  instruction) — Android has a plain intent for prompting this
  (`ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`) but invoking it needs a
  native bridge; out of scope this pass, manual settings instruction only.
- Added `checkNotificationHealth()` (permission + live channel-importance
  check via `listChannels()`), re-run on every drip change instead of a
  one-time mount snapshot — the warning banner no longer shows a stale
  "fine" after the OS silently downgrades something mid-session.
- `validate/lint/test (38/38)/gate:release/tsc` all green.

## 2026-07-22 (same branch `feature/notification-channel-fix`)
- **Fixed a regression from the previous entry (2026-07-21):** the Owner
  reported the notification-channel fix made things *worse* — still no
  vibration on the lock screen, and the notification stopped showing on the
  lock screen at all. Root-caused by reading `@capacitor/local-notifications`
  6.1.3's Android source: `LocalNotificationManager.buildNotification()`
  unconditionally forces `VISIBILITY_PRIVATE` on every notification,
  overriding whatever the channel's own visibility is set to (a real bug in
  the plugin — even has a `// TODO` acknowledging it's hardcoded). Patched to
  `VISIBILITY_PUBLIC` via `patch-package` (`patches/@capacitor+local-
  notifications+6.1.3.patch`, `postinstall: patch-package` in
  `package.json`) — durable across `npm install`, unlike editing
  `node_modules` by hand.
- Also removed `ongoing: true` from the scheduled notifications (added
  2026-07-21) — the most likely trigger for the lock-screen regression, since
  some Android skins deprioritize "ongoing" notifications for heads-up/
  lock-screen display, treating them as a background-service indicator
  rather than an alert.
- Bumped the notification channel id to `drip-alarms-v3` (channel settings
  are immutable once created — a stale differently-configured channel from
  testing the previous fix would otherwise stick around).
- **Investigated "why does Telegram break through the lock screen but not
  this app"** — checked the plugin's Android source specifically for
  `fullScreenIntent`/`CATEGORY_ALARM` support (the actual Android mechanism
  for alarm-clock/incoming-call-style full-screen wake-and-display over the
  lock screen). **Not supported by this plugin at all.** Documented as a
  separate, bigger follow-up (custom native Android plugin) in
  `plan/architecture.md` §4a.2 — not attempted here.
- `validate/lint/test (38/38)/gate:release/tsc` all green. Still needs
  on-device confirmation; this environment can't verify Android lock-screen/
  heads-up/vibration behavior directly.

## 2026-07-21 (branch `feature/notification-channel-fix`, not master — per Owner)
- **Fixed: locked-screen notifications posted silently.** The same-day local-
  notifications backstop (below) posted its text on time but with no
  audible/vibration signal on a locked screen — Owner reconfirmed the bug
  persisted. Root cause: notifications were on the plugin's implicit
  "Default" channel (`IMPORTANCE_DEFAULT`), and Android channels can't be
  reconfigured after creation. Fix: a new dedicated channel
  (`drip-alarms-v2`, `IMPORTANCE_HIGH`, public lock-screen visibility,
  vibration on) in `src/drip/notifications.ts`; each notification also now
  sets `ongoing: true` (can't be swiped away by accident) + `autoCancel:
  true` (tap dismisses + opens the app).
- **Evaluated the Owner's "stopwatch" idea** (persistent, interactive,
  always-on-top notification with a live-updating remaining-time countdown
  on the lock screen). The "pinned + high-priority + lock-screen-visible"
  part is now covered by the channel fix above. A true, smoothly-ticking
  countdown text (Android's native chronometer, as used by timer/stopwatch
  apps) is **not exposed by `@capacitor/local-notifications`** — confirmed
  by reading its TypeScript defs and Android source; no `chronometer` field
  exists. Getting real chronometer behavior needs either a small custom
  native Android plugin (kept outside the gitignored `android/` folder so
  it survives regeneration) or an unattractive fallback (scheduling dozens
  of periodic notification updates per drip, which collides with Android's
  Doze throttling and multiplies badly across up to 5 concurrent drips).
  Documented in `plan/architecture.md` §4a.1 as a separate, bigger follow-up
  — not attempted opportunistically in this change, since it needs real
  native Android work and on-device testing this environment can't do.
- Per Owner instruction, this round's work (plus the prior two still-
  uncommitted rounds — mute opt-out/louder tone, and the first
  locked-screen-notifications pass) is on branch
  `feature/notification-channel-fix`, not pushed to `master` directly.
  `validate/lint/test (38/38)/gate:release/tsc` all green.

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
