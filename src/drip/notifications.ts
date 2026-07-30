// OS-level local notifications for the drip pre-end/at-empty alarms — Spec 001
// FR-12. The in-app alarm() (AudioContext + Haptics) only fires while the JS
// runtime is running; Android suspends a WebView's timers on a locked screen,
// so the in-app alarm alone can fire minutes late or not at all. Local
// notifications go through Android's AlarmManager (via the Capacitor plugin),
// which keeps working with the screen locked. Entirely on-device — no network
// call, consistent with Art. V.
//
// ⚠ This module went through seven on-device iterations. The full account —
// what each round fixed, and which invariants must not be re-broken — is in
// `decisions/ADR-0008-notification-saga.md`. Read it before changing anything
// here. The short version of the two rules it exists to protect:
//
//   1. The OS notification and the in-app alarm are INDEPENDENT channels for
//      the same event. `warned10/5/Empty` gate the in-app audio ONLY and must
//      never cause an OS notification to be cancelled (v5 self-cancel bug).
//   2. Notification ids are session-local; the alarms they name outlive the
//      process. cancelOrphanedAlarms() reconciles that at startup, and
//      scheduling must wait for it (v6).
//
// This module is deliberately decoupled from `ActiveDrip` (DripScreen.tsx
// passes a plain plan object) so it stays easy to reason about and test in
// isolation. All calls are best-effort: any failure (unsupported browser in
// the web/PWA build, permission denied, plugin unavailable) is swallowed —
// this is a reliability *enhancement*, it must never crash or block the
// in-app alarm path, which remains the fail-closed baseline.
import { LocalNotifications } from "@capacitor/local-notifications";
import { NOTIFICATIONS_ENABLED } from "../config";

// Play Store variant (VITE_VARIANT=play): the whole OS-notification layer is
// compiled out behaviourally — every exported function below early-returns,
// so DripScreen keeps one unconditional call site and doesn't sprout `if
// (variant)` branches. See src/config.ts for why this is a build flag rather
// than the separate branch it used to be.
//
// checkHealth() reports "granted" in that build on purpose: the in-app alarm
// is then the only channel, and warning the medic about a notification
// permission that this build never uses would be noise, not safety.

/** Dedicated alarm channel — deliberately not the plugin's implicit "Default"
 * one (see note above). IMPORTANCE_HIGH (5) = heads-up popup + sound even
 * over other apps; visibility PUBLIC (1) = full text shown on the lock
 * screen (not redacted); vibration on. Combined with the patch-package fix
 * (VISIBILITY_PUBLIC on the notification itself, not just the channel). */
// IMPORTANCE_HIGH is 4 on Android (NONE=0, MIN=1, LOW=2, DEFAULT=3, HIGH=4 —
// there is no 5). The v2/v3 code above requested `importance: 5`, an
// out-of-range value the plugin's TS types (loosely `1|2|3|4|5`) don't catch
// at compile time; found while re-checking this against Android's actual
// NotificationManager constants. Not confirmed as the cause of the v3 field
// report, but a real bug on its own — fixed to the correct constant.
const CHANNEL_ID = "drip-alarms-v4";
let channelReady = false;

async function ensureChannel(): Promise<void> {
  if (channelReady) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Будильники дріпів",
      description: "10 хв / 5 хв / порожньо — сигнали про закінчення мішка.",
      importance: 4,
      visibility: 1,
      vibration: true,
      lights: true,
    });
    channelReady = true;
  } catch {
    /* web/unsupported — fine, falls back to whatever default exists */
  }
}

/** Live health snapshot — re-checked on every call, not cached at mount.
 * `channelImportance` is Android's actual reported value for our channel (4
 * = HIGH is what we ask for); if it comes back lower, either the user or the
 * system downgraded it after creation (channels are user-editable in
 * Settings), which explains a "used to work, now silent" report better than
 * anything this module can control. `null` = channel not created yet, or
 * `listChannels` unsupported on this platform. */
export interface NotificationHealth {
  permissionGranted: boolean;
  channelImportance: number | null;
}

export async function checkNotificationHealth(): Promise<NotificationHealth> {
  // Play build: nothing to be unhealthy about — see the note at the import.
  if (!NOTIFICATIONS_ENABLED) {
    return { permissionGranted: true, channelImportance: null };
  }
  // The two checks are independent — run them concurrently instead of
  // sequentially awaiting one after the other; each keeps its own fallback
  // via Promise.allSettled so one platform not supporting listChannels
  // (iOS/web) still leaves the permission check intact.
  const [permResult, channelsResult] = await Promise.allSettled([
    LocalNotifications.checkPermissions(),
    LocalNotifications.listChannels(),
  ]);

  const permissionGranted =
    permResult.status === "fulfilled" && permResult.value.display === "granted";

  let channelImportance: number | null = null;
  if (channelsResult.status === "fulfilled") {
    const ch = channelsResult.value.channels.find((c) => c.id === CHANNEL_ID);
    channelImportance = ch?.importance ?? null;
  }
  /* listChannels unsupported (iOS/web) — permission check above still stands */

  return { permissionGranted, channelImportance };
}

/** Per-drip notification id bookkeeping. Ephemeral by design — matches the
 * existing precedent that live drips are not persisted across app restarts
 * (see DripScreen.tsx edge cases). Android notification ids are 32-bit ints;
 * a simple session-local counter avoids ever needing something bigger. */
const idMap = new Map<
  string,
  { warn10: number; warn5: number; empty: number }
>();
let nextId = 1;

function idsFor(dripId: string): {
  warn10: number;
  warn5: number;
  empty: number;
} {
  let ids = idMap.get(dripId);
  if (!ids) {
    ids = { warn10: nextId++, warn5: nextId++, empty: nextId++ };
    idMap.set(dripId, ids);
  }
  return ids;
}

let permissionRequested = false;

/** Request notification permission once per app session (if not already
 * granted). Returns whether notifications can actually be shown — the caller
 * uses this to warn the medic if background alarms won't work. */
export async function ensureNotificationPermission(): Promise<boolean> {
  // Play build: never prompt for a permission this build doesn't use.
  if (!NOTIFICATIONS_ENABLED) return false;
  try {
    const cur = await LocalNotifications.checkPermissions();
    if (cur.display !== "granted" && !permissionRequested) {
      permissionRequested = true;
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== "granted") return false;
    } else if (cur.display !== "granted") {
      return false;
    }
    await ensureChannel();
    return true;
  } catch {
    return false; // unsupported (web/PWA fallback) — in-app alarm is still the baseline
  }
}

/** Pure key for "does this drip's scheduled notification need to be
 * rewritten" — used by DripScreen.tsx to decide whether to call
 * rescheduleDripAlarms() at all. Deliberately excludes warned10/warned5/
 * warnedEmpty (see the v5 note above): those flags gate only the separate
 * in-app alarm and must never trigger a re-cancel of the OS-level
 * notification. Includes `label`: withOrdinal()'s auto-renumbering
 * (DripScreen.tsx) can rename an already-running drip without touching its
 * timing, and the label is baked verbatim into the notification body text at
 * schedule time — omitting it here left a renumbered drip's already-scheduled
 * notification showing the stale, un-suffixed label. */
export function dripScheduleKey(
  bagMl: number,
  mlPerH: number,
  startedAt: number,
  silenced: boolean,
  label: string,
): string {
  return `${bagMl}:${mlPerH}:${startedAt}:${silenced}:${label}`;
}

export interface DripAlarmPlan {
  id: string;
  label: string;
  silenced: boolean;
  /** Absolute epoch-ms fire time, or null if that stage already fired
   * in-app (or the drip has no bag timer) and needs no native backstop. */
  fireAt10: number | null;
  fireAt5: number | null;
  fireAtEmpty: number | null;
}

/** (Re)schedule a drip's three alarm notifications from scratch. Always
 * cancels first — simplest correct way to reflect retitration, silence
 * toggling, or a stage having just fired in-app. */
export async function rescheduleDripAlarms(plan: DripAlarmPlan): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return;
  // Must complete before we hand out/reuse any id — see cancelOrphanedAlarms()
  // for why (session-local ids restart at 1 and would collide with the very
  // orphans being swept). Memoised, so this is a no-op after the first call.
  await cancelOrphanedAlarms();
  const ids = idsFor(plan.id);
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: ids.warn10 }, { id: ids.warn5 }, { id: ids.empty }],
    });
  } catch {
    /* nothing pending, or unsupported — fine */
  }
  if (plan.silenced) return;
  await ensureChannel();
  const now = Date.now();
  const notifications: Parameters<
    typeof LocalNotifications.schedule
  >[0]["notifications"] = [];
  if (plan.fireAt10 != null && plan.fireAt10 > now) {
    notifications.push({
      id: ids.warn10,
      title: "CPP-DOSE — 10 хв до кінця",
      body: `${plan.label}: дріп/мішок закінчується приблизно через 10 хв.`,
      channelId: CHANNEL_ID,
      autoCancel: true,
      schedule: { at: new Date(plan.fireAt10), allowWhileIdle: true },
    });
  }
  if (plan.fireAt5 != null && plan.fireAt5 > now) {
    notifications.push({
      id: ids.warn5,
      title: "CPP-DOSE — 5 хв до кінця",
      body: `${plan.label}: дріп/мішок закінчується приблизно через 5 хв.`,
      channelId: CHANNEL_ID,
      autoCancel: true,
      schedule: { at: new Date(plan.fireAt5), allowWhileIdle: true },
    });
  }
  if (plan.fireAtEmpty != null && plan.fireAtEmpty > now) {
    notifications.push({
      id: ids.empty,
      title: "CPP-DOSE — дріп/мішок закінчився",
      body: `${plan.label}: дріп/мішок закінчився — час готувати наступний / переоцінити стан.`,
      channelId: CHANNEL_ID,
      autoCancel: true,
      schedule: { at: new Date(plan.fireAtEmpty), allowWhileIdle: true },
    });
  }
  if (notifications.length === 0) return;
  try {
    await LocalNotifications.schedule({ notifications });
  } catch {
    /* unsupported (web/PWA) — in-app alarm remains the baseline */
  }
}

/**
 * One-time sweep of notifications left over from a *previous* app session.
 *
 * v6 (2026-07-24, Owner field report): "надсилає повідомлення про закінчення
 * дріпу навіть коли всі дріпи видалено і додаток не запущено."
 *
 * Root cause — a lifetime mismatch, not a logic error:
 * - `idMap`/`nextId` above are **in-memory only** (deliberately: live drips
 *   aren't persisted either, see DripScreen.tsx edge cases).
 * - The notifications themselves are handed to Android's **AlarmManager**,
 *   which survives the app being killed, swiped away, and even a reboot.
 *
 * So once the process dies, every id this module ever handed out is
 * forgotten, while the alarms those ids refer to are still armed in the OS.
 * `cancelDripAlarms()`/`forgetStaleDrips()` can only cancel ids they can
 * still see in `idMap`, so on the next launch there is nothing left to
 * cancel *with* — and the orphaned alarm fires on schedule, with no drips
 * on screen and possibly no app running at all. Exactly the report.
 *
 * Fix: because live drips are never restored across a restart, **any**
 * pending drip alarm at startup is by definition an orphan — there is no
 * drip it could legitimately belong to. So sweep all of them, plus anything
 * already sitting delivered in the tray from the same dead session.
 *
 * Memoised, and awaited by rescheduleDripAlarms() below, which closes a real
 * race: `nextId` restarts at 1 each session, so a newly added drip would
 * otherwise be handed the same ids as the orphans this sweep is cancelling,
 * and an in-flight sweep could cancel the *new* drip's alarms. Gating
 * scheduling on the sweep having finished makes that ordering impossible.
 */
let orphanSweep: Promise<void> | null = null;

export function cancelOrphanedAlarms(): Promise<void> {
  // Play build schedules nothing, so there is nothing to orphan. (A build
  // switched play→apk on the same device is covered too: the apk build does
  // sweep, and it sweeps everything pending.)
  if (!NOTIFICATIONS_ENABLED) return Promise.resolve();
  orphanSweep ??= (async () => {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map((n) => ({ id: n.id })),
        });
      }
    } catch {
      /* unsupported (web/PWA) — nothing scheduled natively to clean up */
    }
    try {
      // Already-delivered ones from the dead session: same orphan status,
      // and the medic would otherwise find a stale "мішок закінчився" in the
      // tray for a drip that no longer exists.
      await LocalNotifications.removeAllDeliveredNotifications();
    } catch {
      /* unsupported — fine */
    }
  })();
  return orphanSweep;
}

/** Cancel and forget a drip's notifications entirely (removed/finished drip). */
export async function cancelDripAlarms(dripId: string): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return;
  const ids = idMap.get(dripId);
  if (!ids) return;
  idMap.delete(dripId);
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: ids.warn10 }, { id: ids.warn5 }, { id: ids.empty }],
    });
  } catch {
    /* unsupported — fine, nothing to clean up on this platform */
  }
}

/** Cancel/forget any tracked drip that no longer exists (e.g. removed while
 * backgrounded). Call with the current set of live drip ids. */
export async function forgetStaleDrips(liveIds: Set<string>): Promise<void> {
  const stale = [...idMap.keys()].filter((id) => !liveIds.has(id));
  await Promise.all(stale.map((id) => cancelDripAlarms(id)));
}
