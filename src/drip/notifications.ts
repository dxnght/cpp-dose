// OS-level local notifications for the drip pre-end/at-empty alarms — Spec 001
// FR-12 (2026-07-21). The in-app alarm() (AudioContext + Haptics) only fires
// while the JS runtime is actually running; on a locked screen, Android
// suspends the WebView's timers, so the in-app alarm can fire minutes late (or
// not at all) — Owner-reported 2026-07-21 (fired 7 min late after screen-off).
// Local notifications are scheduled via Android's AlarmManager (through the
// Capacitor plugin), which keeps working with the screen locked. Runs
// entirely on-device — no network call, consistent with Art. V.
//
// v2 (2026-07-21, same day): the first version scheduled onto the plugin's
// implicit "Default" channel (IMPORTANCE_DEFAULT), which posted the
// notification but produced no audible/vibration signal reliably enough to
// notice on a locked screen — Owner-reported. Android notification channels
// are immutable after first creation (importance/sound/vibration can't be
// changed later, only by the user in system settings), so this uses a new,
// dedicated, explicitly HIGH-importance channel instead of trying to alter
// the old one. See `ensureChannel()`.
//
// v3 (2026-07-22): Owner reported v2 made *less* visible on the lock screen
// (no vibration there either, and the notification itself stopped showing on
// the locked screen at all — a regression). Root-caused by reading the
// plugin's own Android source (LocalNotificationManager.java): every
// notification unconditionally got `.setVisibility(VISIBILITY_PRIVATE)`,
// completely ignoring whatever the channel's lock-screen visibility was set
// to — the channel-level `visibility` option in v2 was therefore a no-op.
// Patched via `patch-package` (see `patches/`, `npm run postinstall`) to
// `VISIBILITY_PUBLIC` instead — editing node_modules directly doesn't
// survive `npm install`, patch-package does. Also removed `ongoing: true`
// (added in v2): the most likely trigger for the lock-screen regression —
// some OEM Android skins deprioritize "ongoing" notifications (treating them
// as a low-priority background-service indicator, like a music player) for
// heads-up/lock-screen display. Bumped to a fresh channel id (`-v3`) since
// channel settings are immutable once created — any earlier, differently
// configured channel on a test device would otherwise stay stuck forever.
// Note: this plugin has no `fullScreenIntent`/`CATEGORY_ALARM` support at
// all (checked the Java source) — that's the actual mechanism alarm-clock
// and incoming-call apps (and likely Telegram's calls) use to wake/break
// through a fully locked screen. Getting that would need a small custom
// native Android plugin, a separate, bigger piece of work.
//
// This module is deliberately decoupled from `ActiveDrip` (DripScreen.tsx
// passes a plain plan object) so it stays easy to reason about / test in
// isolation. All calls are best-effort: any failure (unsupported browser in
// the web/PWA build, permission denied, plugin unavailable) is swallowed —
// this is a reliability *enhancement*, it must never crash or block the
// in-app alarm path, which remains the fail-closed baseline.
import { LocalNotifications } from "@capacitor/local-notifications";

/** Dedicated alarm channel — deliberately not the plugin's implicit "Default"
 * one (see note above). IMPORTANCE_HIGH (5) = heads-up popup + sound even
 * over other apps; visibility PUBLIC (1) = full text shown on the lock
 * screen (not redacted); vibration on. Combined with the patch-package fix
 * (VISIBILITY_PUBLIC on the notification itself, not just the channel). */
const CHANNEL_ID = "drip-alarms-v3";
let channelReady = false;

async function ensureChannel(): Promise<void> {
  if (channelReady) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Будильники дріпів",
      description: "10 хв / 5 хв / порожньо — сигнали про закінчення мішки.",
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
    });
    channelReady = true;
  } catch {
    /* web/unsupported — fine, falls back to whatever default exists */
  }
}

/** Per-drip notification id bookkeeping. Ephemeral by design — matches the
 * existing precedent that live drips are not persisted across app restarts
 * (see DripScreen.tsx edge cases). Android notification ids are 32-bit ints;
 * a simple session-local counter avoids ever needing something bigger. */
const idMap = new Map<string, { warn10: number; warn5: number; empty: number }>();
let nextId = 1;

function idsFor(dripId: string): { warn10: number; warn5: number; empty: number } {
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
  const notifications: Parameters<typeof LocalNotifications.schedule>[0]["notifications"] =
    [];
  if (plan.fireAt10 != null && plan.fireAt10 > now) {
    notifications.push({
      id: ids.warn10,
      title: "CPP-DOSE — 10 хв до кінця",
      body: `${plan.label}: мішка закінчується приблизно через 10 хв.`,
      channelId: CHANNEL_ID,
      autoCancel: true,
      schedule: { at: new Date(plan.fireAt10), allowWhileIdle: true },
    });
  }
  if (plan.fireAt5 != null && plan.fireAt5 > now) {
    notifications.push({
      id: ids.warn5,
      title: "CPP-DOSE — 5 хв до кінця",
      body: `${plan.label}: мішка закінчується приблизно через 5 хв.`,
      channelId: CHANNEL_ID,
      autoCancel: true,
      schedule: { at: new Date(plan.fireAt5), allowWhileIdle: true },
    });
  }
  if (plan.fireAtEmpty != null && plan.fireAtEmpty > now) {
    notifications.push({
      id: ids.empty,
      title: "CPP-DOSE — мішка порожня",
      body: `${plan.label}: час готувати наступну мішку / переоцінити стан.`,
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

/** Cancel and forget a drip's notifications entirely (removed/finished drip). */
export async function cancelDripAlarms(dripId: string): Promise<void> {
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
