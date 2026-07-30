# ADR-0008 — Locked-screen alarm delivery: seven iterations, and why the design ended where it did

- **Status:** Accepted (2026-07-24)
- **Deciders:** Owner (all seven rounds were driven by Owner field reports)
- **Related:** Constitution Art. III/V; Spec 001 FR-12/FR-13, AC-9/AC-6e/AC-6f;
  `plan/architecture.md` §4a–§4a.4; `src/drip/notifications.ts`;
  `src/drip/persistence.ts`; `src/config.ts`

## Why this ADR exists

`src/drip/notifications.ts` had grown to 368 lines of which **177 (48%) were
comments** — an archaeological record of seven rounds of on-device debugging.
That history is genuinely valuable (it is the only thing stopping a future
change from re-introducing v5's self-cancel), but a working module is the
wrong place to keep it: it doubled the reading cost of every subsequent
change. Moved here; the code keeps short pointers back to this file.

**Nothing about the implementation changed when this was written.** This is a
documentation move plus the decisions recorded for the record.

## Context

The in-app alarm is an `AudioContext` beep driven by a 1-second `setInterval`.
It only runs while the JS runtime runs. Android suspends a WebView's timers
when the screen locks, so the in-app alarm alone is not a dependable
end-of-bag warning — Owner-reported 2026-07-21, an alarm fired **7 minutes
late** after screen-off. For a bag running dry unattended, that is the whole
point of the feature failing.

## The seven rounds

### v1 (2026-07-21) — add an OS-level backstop
Scheduled matching 10-min/5-min/at-empty local notifications through
`@capacitor/local-notifications`, which reaches Android's AlarmManager and
keeps working with the screen locked. On-device only, no network (Art. V).

### v2 (same day) — dedicated channel
v1 posted onto the plugin's implicit "Default" channel
(`IMPORTANCE_DEFAULT`): the text appeared but without a dependable
audible/vibration signal. Android notification channels are **immutable after
creation** (importance/sound/vibration can only be changed by the user in
system settings), so the fix was a new, explicitly HIGH-importance channel
rather than an attempt to reconfigure the old one. Channel id is versioned for
exactly this reason — a stale channel on a test device would otherwise stick
forever.

### v3 (2026-07-22) — a plugin bug, patched
v2 made things *worse*: no vibration on the lock screen, and the notification
stopped appearing there at all. Root cause found by reading the plugin's
Android source: `LocalNotificationManager.buildNotification()` unconditionally
called `.setVisibility(VISIBILITY_PRIVATE)` on every notification, ignoring
the channel's configured lock-screen visibility — so v2's channel-level
`visibility` setting was a no-op. Fixed with `patch-package`
(`patches/@capacitor+local-notifications+6.1.3.patch`); editing `node_modules`
by hand does not survive `npm install`, a patch does.

Also removed `ongoing: true` (added in v2): several OEM Android skins
deprioritise "ongoing" notifications for heads-up/lock-screen display,
treating them as a background-service indicator like a music player.

**Noted and not fixed:** the plugin has no `fullScreenIntent` /
`CATEGORY_ALARM` support at all. That is the actual mechanism alarm-clock and
incoming-call apps use to break through a fully locked screen. Getting it
would need a small custom native plugin — deliberately deferred until field
use shows whether ordinary notifications are sufficient.

### v4 (2026-07-22) — out-of-range constant
The channel requested `importance: 5`. Android's scale is `0..4`
(`NONE`/`MIN`/`LOW`/`DEFAULT`/`HIGH`); there is no 5. The plugin's loose
TypeScript type (`1|2|3|4|5`) did not catch it. Found by re-checking against
Android's real `NotificationManager` constants. Fixed to `4`.

Same round: `checkNotificationHealth()` was changed to re-check permission and
*actual* channel importance on every drip change, instead of snapshotting once
at mount — otherwise the in-app warning banner could keep showing "fine" after
the OS silently downgraded something mid-session.

### v5 (2026-07-22) — the self-cancel race
Three separate, confusing field reports turned out to share one cause:
1. the empty-bag notification looked like a stray, context-free glitch;
2. the notification consistently appeared ~1 min *before* the in-app alarm;
3. with the drip's own sound toggle off and the screen locked, no notification
   appeared at all — but it was "абсолютно вірна" with sound on.

Cause, in `DripScreen.tsx` rather than in the notification module: the
reschedule effect gated `fireAt10/5/Empty` on the drip's `warned10/5/Empty`
flags, and `rescheduleDripAlarms()` unconditionally cancels a drip's three
notification ids before rescheduling. So the moment the in-app tick (an
independent 1-second poll) noticed the same threshold and flipped a flag, the
effect re-ran and **cancelled — i.e. dismissed — a notification the OS had
already delivered**. On a locked screen the WebView's timers are suspended and
only catch up on unlock, so the self-cancel fired at precisely the moment the
medic looked at the phone.

Report 3 was a confound, not a separate bug: an actively playing
`AudioContext` exempts the page from Chromium's background-timer throttling,
so with sound *on* the in-app tick barely lagged and the self-cancel window
was too narrow to notice; with sound off the window widened.

**Decision, and the invariant to preserve:** the OS notification and the
in-app alarm are two *independent delivery channels for the same event*. That
was the entire point of adding notifications. `warned10/5/Empty` may gate the
in-app audio/haptic **only**, and must never cause the OS notification for
that stage to be touched. Enforced by `dripScheduleKey()`, which deliberately
excludes those flags; `tests/notifications.test.ts` pins the signature.

### v6 (2026-07-24) — orphaned alarms
Field report: notifications for a drip ending fired even though every drip had
been deleted and the app was not running.

A lifetime mismatch, not a logic error — which is why five previous rounds
never touched it. The module's id bookkeeping (`idMap`, `nextId`) is
in-memory, deliberately, since live drips were not persisted either. The
notifications are armed in AlarmManager, which survives the process being
killed, swiped away, or the device rebooting. Once the process died, every id
handed out was forgotten while the alarms those ids referred to stayed armed —
so `cancelDripAlarms()`/`forgetStaleDrips()`, which can only cancel ids still
in `idMap`, had nothing left to cancel *with*. Within a single session,
cleanup always worked correctly.

Fix: `cancelOrphanedAlarms()`, a memoised once-per-launch sweep cancelling all
pending notifications and clearing delivered ones. Sweeping unconditionally
was safe *because* live drips were never restored — any pending drip alarm at
startup belonged to no drip, by construction.

**Ordering matters:** `rescheduleDripAlarms()` awaits that sweep before
touching any id. `nextId` restarts at 1 each launch, so a drip added right
after opening gets exactly the ids the sweep is cancelling; without the gate,
an in-flight sweep could cancel the *new* drip's alarms — silence instead of a
spurious warning, a strictly worse failure.

### v7 (2026-07-24) — state and alarms given one lifetime
Follow-up report: drips started, app swiped away, notifications still arrive.

The notifications were **correct** — that is FR-12 working. But it exposed the
deeper problem, and one the v6 fix had made worse in a specific case: drip
state died with the process (spec §6, on purpose) while alarms survived it
(FR-12, on purpose). So an alarm could fire for a drip the app could no longer
show; and after v6, reopening the app could cancel the remaining alarms of a
bag that was **physically still running** (Android reclaiming the app under
memory pressure is indistinguishable from a swipe).

Also found: §6 required a "running drips were lost" warning on relaunch. It
had never been implemented.

**Decision (Owner, asked explicitly — it overturns a documented spec
decision): persist drips and restore them `unconfirmed`.** See FR-13/AC-6f and
`src/drip/persistence.ts`. Restoring is what gives state and alarms one
lifetime; the `unconfirmed` marking is what preserves §6's real concern ("no
false sense of a still-running countdown") without discarding the state that
keeps the medic warned. Restored drips still count down and still arm alarms —
a spurious alarm beats a missed one.

Rejected alternatives:
- *Keep discarding state, just warn on relaunch.* Cheap and honest, but the
  medic still loses the countdown for a bag that is genuinely running.
- *Stop sweeping pending alarms; only clear delivered ones.* Keeps warnings
  alive for real drips, but brings back the original complaint — alarms with
  no context behind them.

## Consequences

- Two independent alarm channels, by design. Do not re-couple them.
- Notification ids are session-local and meaningless across restarts; the
  startup sweep is what reconciles them.
- Drips are persisted; `displayTag` deliberately is not (it may hold a
  callsign — see FR-8a and the 2026-07-24 threat-model discussion).
- The Play Store build removes this entire subsystem via `VITE_VARIANT=play`
  (`src/config.ts`), because it needs `USE_EXACT_ALARM`, a Play-restricted
  permission. The in-app alarm is then the only channel and the UI says so.
- `fullScreenIntent` remains unavailable. Revisit only if field use shows
  ordinary notifications are not enough — and note it would only matter for
  the direct-APK build.
- **All of this still needs on-device confirmation.** Every round was found on
  real hardware and none of it can be verified from a build sandbox.
