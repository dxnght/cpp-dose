# Technical Plan — Architecture (the HOW)

Covers all P0 features (Specs 001–003, 005). This is the *implementation* plan;
intent lives in the specs. Nothing here may weaken `memory/constitution.md`.

## Constitution Check

- Art. V: no runtime network. Enforced by CSP + a build-time network-call lint +
  a CI airplane-mode test. ✔
- Art. II/III: the "field bundle" compile step is what makes fail-closed real. ✔
- Art. VI: this doc exists because a spec was approved first. ✔

---

## 1. Stack (from the plan, confirmed — ADR-0001)

- **App:** React + TypeScript + Vite, as a **PWA** (service worker, full offline).
- **Android packaging:** **Capacitor** → APK. No iOS (non-goal).
- **Haptics:** Capacitor Haptics.
- **Audio:** Web Audio API (`AudioContext`) with a pre-computed tick buffer.
- **State:** keep it minimal — Zustand (or React context). No global data layer;
  there is no server.
- **No backend. No SDKs that phone home.** Dependencies are audited for network
  use at build time.

## 2. Module map

| Module | Spec | Notes |
|--------|------|-------|
| `drip/` | 001 | formula, drop-factor, metronome scheduler, end-of-bag timer |
| `dose/` | 002 | weight input, drug list from field bundle, dose math, confirm-to-reveal |
| `burn/` | 003 | Rule of Nines diagram, Rule of Ten rate, hand-off to `drip/` |
| `clinical/` | 005 | field-bundle loader, guards, source/verification badges |
| `shell/` | 000 | night theme, disclaimer, navigation, ≥48 px targets, i18n (uk) |

## 3. Clinical content build pipeline (safety-critical)

Source of truth: `clinical/uk-cpp.v1.json` (authoring file, may contain
`UNVERIFIED` / `TODO`). Build steps:

1. **validate** — `uk-cpp.v1.json` against `clinical/protocol.schema.json`
   (Draft 2020-12). Fails build on any schema error.
2. **verify-report** — emit the list of non-`VERIFIED` records (Owner checklist).
   Does not mutate.
3. **compile field bundle** — produce `field-bundle.json` containing **only**
   records with `review_status` matching `^VERIFIED:` **and** whose
   `source_document` has a real (non-`TODO`) checksum in the registry. Engineering
   formulas (`kind: "engineering"`) are always included (deterministic math).
4. **release gate** — a build flagged `--field` fails if the field bundle would
   expose any record that is not fully verified/archived, or if any `TODO(` string
   remains in included content.

The app in field mode imports **only** `field-bundle.json`. It never has the
authoring file. Therefore an unverified value cannot render even by mistake
(fail-closed by construction, Art. III). A `dev` build may load the authoring file
behind a loud watermark and is never shippable.

## 4. Audio + haptic timing (ADR-0005)

- The metronome must not use `setInterval`/`setTimeout` for the tick — they drift
  and jitter under load. Instead:
  - Compute drop interval `T = 60 / gtt_per_min` seconds.
  - Schedule tick buffers on the `AudioContext` timeline
    (`source.start(ctx.currentTime + n·T)`), refilling a look-ahead window
    (~200 ms) from a `requestAnimationFrame`/worker loop.
  - Derive the **animation** and **haptic** pulses from the same scheduled tick
    times (single clock → all three channels stay in phase).
- Haptics: fire Capacitor Haptics at the scheduled time; if the platform can't
  hit sub-frame accuracy, accept it but keep audio as the timing master.
- **Drift budget (SC-2):** < 1 drop / 10 min ⇒ mean interval error < 0.6 s over
  10 min for a 100 gtt/min rate; the look-ahead scheduler achieves this. A test
  logs actual vs ideal tick timestamps and asserts cumulative drift.
- Backgrounding: audio may be suspended by the OS; on resume, re-anchor the
  schedule to `ctx.currentTime` (never replay missed ticks). Document this to the
  user (metronome is a pacing aid, not a delivered-dose guarantee).

## 4a. Pre-end/at-empty alarms & backgrounding (Spec 001 FR-12, 2026-07-21)

- **Problem:** the in-app alarm (`alarm()` in `DripScreen.tsx` — AudioContext
  beep + Capacitor Haptics) only fires while the JS runtime is actually
  ticking (`setInterval` driving `now`). Android suspends a WebView's timers
  on screen-lock; Owner-reported 2026-07-21 that the alarm fired 7 min late
  after locking the screen. This was anticipated in Spec 001 §6 ("timers/
  alarms must still fire — local notifications") but never built (flagged as
  a follow-up in the Sprint 1 report) until now.
- **Fix:** `src/drip/notifications.ts` wraps `@capacitor/local-notifications`,
  which schedules through Android's `AlarmManager` — independent of the
  WebView/JS runtime, so it keeps working with the screen locked. Still 100%
  on-device, no network call (Art. V unaffected).
- Each drip with a bag timer gets up to 3 scheduled notifications (10-min,
  5-min, at-empty), tracked by a session-local id map (`DripScreen.tsx`'s
  `drips` are not persisted across restarts, so ids don't need to be either).
  Rescheduled from scratch on every alarm-relevant change (add/remove/
  retitrate/silence-toggle/a stage firing in-app) — see the `useEffect` keyed
  on `[drips]` in `DripScreen.tsx`.
- Permission (`POST_NOTIFICATIONS`) is requested once per session on mount;
  if denied, a visible warning banner tells the medic background alarms won't
  work rather than silently pretending they will (Art. III spirit).
- `USE_EXACT_ALARM` is declared in `AndroidManifest.xml` for precise timing
  under Doze — auto-granted (no user prompt) since this app is sideloaded,
  not Play-Store-distributed. Without it, the plugin still degrades to
  `setAndAllowWhileIdle` (approximate timing, capped at once per ~9 min per
  app in deep Doze — relevant since two alarm stages can be only 5 min apart).
  **`android/` is gitignored** (regenerated by `npx cap add android` / synced
  by `npx cap sync android` — see `.gitignore`), so this permission isn't
  version-controlled directly; `scripts/patch-android-manifest.mjs`
  (`npm run android:patch`, also chained into `npm run cap:sync` and
  `npm run apk:debug`) re-applies it idempotently. Only a from-scratch
  `npx cap add android` (deleting and recreating the folder) would need a
  manual re-run — normal `cap sync` never touches `AndroidManifest.xml`.
- **Known, accepted redundancy:** if the app was foregrounded when a stage's
  native notification fires, or reopened shortly after, the in-app `alarm()`
  may also fire for the same stage (JS "catches up" once `now` resumes
  ticking, since `warned10`/`warned5`/`warnedEmpty` don't advance while the
  JS runtime is suspended). A double alert is preferable to a missed one; not
  solved with extra state to keep the feature minimal.
- **Needs on-device confirmation** (screen-off + Doze behavior, exact-alarm
  auto-grant, notification permission prompt on real Android) — cannot be
  verified from the build sandbox; same division of labor as the existing
  APK field-test.

## 5. Offline & zero-exfiltration (Art. V)

- Service worker precaches the whole app shell + `field-bundle.json`. No runtime
  fetches.
- Content-Security-Policy forbids `connect-src` to anything but `'self'`.
- CI test runs the app with the network blocked and asserts zero outbound
  requests; a lint rule flags `fetch`/`XMLHttpRequest`/`navigator.sendBeacon`.
- No analytics/telemetry dependency may be added (dependency allow-list).

## 6. Input clamps (resolve the spec TODOs here)

Proposed defaults (Owner to confirm; these are engineering guardrails, not clinical
values):

| Input | Min | Max | On violation |
|-------|-----|-----|--------------|
| Patient weight | 30 kg | 150 kg | suppress outputs + reason |
| Volume (drip) | 1 ml | 1000 ml | block + reason |
| Time (drip) | 1 min | 24 h | block + reason |
| Drop factor | 1 | 100 gtt/ml | block + reason |
| gtt/min (inverse) | 1 | 600 | warn above practical gravity range |
| TBSA % | 0 | 100 | round to nearest 10% |

Per-drug `min_max` dose clamps come from the clinical record, not from this table.
Sub-40 kg / pediatric behavior is `TODO(clinical-review)` (Specs 002/003) — until
resolved, the burn rate and weight-based doses are suppressed below 40 kg rather
than extrapolated.

## 7. Night / field UI

- Modern dark theme (calm, phone-first) as default (Owner, 2026-07-13). A dedicated
  **night-vision red mode** (preserves scotopic vision) is deferred to `IDEAS.md` as
  a user toggle — the original always-on red-on-black was too harsh.
- All interactive targets ≥ 48 px (audited).
- Ukrainian UI strings (`i18n/uk.json`); no English UI (non-goal).
- Persistent disclaimer banner; first-run full disclaimer; disclaimer reachable
  from every screen (Art. IV).
- Every clinical number badge shows `source_version` + verification state.

## 8. Testing strategy (see also `sprints/`)

- **Unit:** drip math (AC table in Spec 001), Rule of Ten math (Spec 003), dose
  math + clamps (Spec 002).
- **Schema:** `uk-cpp.v1.json` validates; field-bundle compile excludes unverified.
- **Timing:** metronome drift test (SC-2).
- **Offline:** network-blocked run asserts zero requests (SC-3).
- **UI:** disclaimer reachability, ≥48 px, source/verification badge presence.
- **Guard test:** rendering a non-verified record in field mode is unreachable /
  throws (Art. III).
- **PWA:** Lighthouse installability (Sprint 3).

## 9. Repos / CI

- Single repo. CI runs: schema-validate → verify-report → build field bundle →
  unit/timing/offline tests → (for release) release gate. A red gate blocks merge.
