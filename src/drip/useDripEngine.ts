// Drip engine: the `drips` state machine and everything that keeps it alive
// across renders, tab switches, and app restarts — persistence, OS-level
// alarm scheduling, the in-app 1s tick/alarm check, the metronome, and the
// wake lock. Extracted from DripScreen.tsx (2026-08-18) to get the main file
// back under control; behaviour unchanged.
import { useEffect, useMemo, useRef, useState } from "react";
import { fieldBundle } from "../clinical/loader";
import type { Drug, Formula } from "../clinical/types";
import { Metronome } from "./metronome";
import { tapHaptic } from "./haptics";
import {
  ensureNotificationPermission,
  checkNotificationHealth,
  rescheduleDripAlarms,
  cancelDripAlarms,
  cancelOrphanedAlarms,
  forgetStaleDrips,
  dripScheduleKey,
  CHANNEL_IMPORTANCE_HIGH,
} from "./notifications";
import {
  dripEndsAt,
  retitratedStartedAt,
  preSatisfiedAlarmStages,
} from "./calc";
import {
  DRIPS_STORAGE_KEY,
  deserializeDrips,
  serializeDrips,
} from "./persistence";
import { nowMs } from "./format";
import { alarm } from "./alarm-audio";
import { unlockAudio } from "./audio";
import { LS } from "./local-storage";
import type { ActiveDrip, ConcPreset, Mode, DripBadgeStatus } from "./types";

// Spec 001 FR-6: two-stage pre-end alarm lead times (Owner decision
// 2026-07-21) — a heads-up at 10 min remaining, then a second, more urgent
// alarm at 5 min, before the final at-empty alarm.
const PRE_END_ALARM_MS_10 = 10 * 60_000;
const PRE_END_ALARM_MS_5 = 5 * 60_000;

// Spec 001 FR-7: concurrent-drip cap (Owner decision 2026-07-21, raised from 3).
export const MAX_DRIPS = 5;

// Module-level, not component state: a plain `Date.now()`-based id has only
// 1ms resolution, so two addDrip() calls landing in the same millisecond (a
// fast double-tap) minted the same id — every id-keyed action afterwards
// (removeDrip, retitrate, notifications.ts's idsFor()) then applied to both
// drips at once. Counting up guarantees uniqueness regardless of timing.
let nextDripSeq = 0;

export function useDripEngine({
  mode,
  preset,
  burnFormula,
  dropFactor,
  bagMl,
  live,
  onStatusChange,
}: {
  mode: Mode;
  preset: ConcPreset | undefined;
  burnFormula: Formula | undefined;
  dropFactor: number;
  bagMl: number;
  live: { mlPerH: number; gtt: number };
  onStatusChange?: (status: DripBadgeStatus) => void;
}) {
  // Restore drips left running by a previous session (FR-13/AC-6f, Owner
  // decision 2026-07-24). They come back `unconfirmed` — countdown and alarms
  // active, but visibly un-trusted until the medic acknowledges them (see
  // persistence.ts for why restoring beats discarding). Lazy initialiser, so
  // this runs before the reschedule effect and the restored drips get their
  // alarms re-armed in the same pass that sweeps the old session's.
  const [drips, setDrips] = useState<ActiveDrip[]>(() => {
    const restoredAt = Date.now();
    const stored = deserializeDrips(LS.get(DRIPS_STORAGE_KEY), restoredAt);
    return stored.map((p) => {
      const record =
        p.sourceRecordId == null
          ? null
          : ((fieldBundle.drugs.find((d) => d.id === p.sourceRecordId) ??
              fieldBundle.formulas.find((f) => f.id === p.sourceRecordId) ??
              null) as Drug | Formula | null);
      // Recompute rather than persist: which stages already passed follows
      // from startedAt and the clock, and persisting them would let a stale
      // flag suppress a warning the medic should still get.
      //
      // preSatisfiedAlarmStages is for drip *creation*, where elapsed time is
      // always 0 — it compares the bag's TOTAL run time against the
      // thresholds. Using it here ignored however much of the bag had
      // already run before the restart, so a drip whose 10-min alarm had
      // already fired and been acknowledged came back with warned10 seeded
      // false again (total run time was still well over 10 min), and the
      // very next tick re-fired it. Using actual remaining time as of this
      // restart — the same formula the tick effect below uses — fixes that
      // for warned10/warned5: they're informational heads-ups, so replaying
      // one the medic already got would be a nuisance, not a safety gain.
      //
      // warnedEmpty is deliberately NOT seeded from remMs the same way (code
      // review 2026-08-02): unlike the heads-ups, "bag empty" is the one
      // alarm this app must never silently withhold. If the bag ran dry
      // while the process was dead, the medic never heard it — seeding
      // warnedEmpty=true here would suppress it forever with nothing left to
      // correct that. Always false, so a bag already empty at restore still
      // sounds "empty" on the very next tick.
      const remMs =
        p.bagMl != null && p.mlPerH > 0
          ? dripEndsAt(p.startedAt, p.bagMl, p.mlPerH) - restoredAt
          : Infinity;
      return {
        id: p.id,
        label: p.label,
        gtt: p.gtt,
        mlPerH: p.mlPerH,
        dropFactor: p.dropFactor,
        bagMl: p.bagMl,
        startedAt: p.startedAt,
        animStart: nowMs(),
        warned10: remMs <= PRE_END_ALARM_MS_10,
        warned5: remMs <= PRE_END_ALARM_MS_5,
        warnedEmpty: false,
        silenced: p.silenced,
        sourceRecord: record,
        // displayTag deliberately not restored — never written to disk.
        unconfirmed: true,
      };
    });
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [notifDenied, setNotifDenied] = useState(false);
  const [audio, setAudio] = useState(true);
  const [haptic, setHaptic] = useState(true);

  const metronome = useRef<Metronome | null>(null);
  const confirmTimer = useRef<number | null>(null);
  const startedRef = useRef<string | null>(null);
  // Per-drip "last scheduled" key (2026-07-22, v5 notification fix — see the
  // reschedule effect below) — lets that effect skip drips whose alarm
  // timing hasn't actually changed, instead of re-cancelling/rescheduling
  // every drip on every unrelated `drips` change.
  const scheduledKeyRef = useRef<Map<string, string>>(new Map());

  // Shared by the mount effect's post-permission-grant recheck, the wake
  // handler, and the schedule-key effect below — all three need the exact
  // same "read health, translate to the banner flag" step.
  function refreshNotifHealth() {
    checkNotificationHealth()
      .then((h) =>
        setNotifDenied(
          !h.permissionGranted ||
            (h.channelImportance != null &&
              h.channelImportance < CHANNEL_IMPORTANCE_HIGH),
        ),
      )
      .catch(() => setNotifDenied(true));
  }

  const focusDrip = drips.find((d) => d.id === focusId) ?? null;

  // Persist live drips so a killed session can be restored (FR-13/AC-6f).
  // Explicit field-by-field mapping, never a spread: `displayTag` must not
  // reach storage (it can hold a callsign — see persistence.ts), and building
  // the record by hand is what guarantees a future field added to ActiveDrip
  // isn't silently written to disk too.
  //
  // Snapshotted through useMemo, keyed on the persisted fields' *values* via
  // the resulting JSON string, rather than writing straight from an effect
  // keyed on `drips` itself: `drips`' identity also changes for fields never
  // written here (displayTag on every keystroke, warned10/5/Empty on every
  // alarm-stage flip), which used to re-serialize and rewrite every drip to
  // storage each time regardless. A string dependency only actually re-runs
  // the effect when its *content* changes.
  const persistedDripsSnapshot = useMemo(
    () =>
      serializeDrips(
        drips.map((d) => ({
          id: d.id,
          label: d.label,
          gtt: d.gtt,
          mlPerH: d.mlPerH,
          dropFactor: d.dropFactor,
          bagMl: d.bagMl,
          startedAt: d.startedAt,
          silenced: d.silenced,
          sourceRecordId: d.sourceRecord?.id ?? null,
        })),
      ),
    [drips],
  );
  useEffect(() => {
    LS.set(DRIPS_STORAGE_KEY, persistedDripsSnapshot);
  }, [persistedDripsSnapshot]);
  useEffect(() => {
    const m = new Metronome();
    m.setHapticHandler(() => tapHaptic());
    metronome.current = m;
    return () => m.stop();
  }, []);

  // (Re)start the metronome only when the active drip or its rate changes, anchored
  // to that drip's animStart so audio and animation share one phase.
  useEffect(() => {
    const m = metronome.current;
    if (!m) return;
    m.setChannels({ audio, haptic, animation: true });
    const d = drips.find((x) => x.id === activeId);
    const key = d && d.gtt > 0 ? `${d.id}:${d.gtt}` : null;
    if (key !== startedRef.current) {
      startedRef.current = key;
      if (d && d.gtt > 0) m.start(d.gtt, d.animStart / 1000);
      else m.stop();
    }
  }, [activeId, drips, audio, haptic]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Force an immediate correction the moment the screen unlocks / the app is
  // foregrounded again, instead of waiting up to 1s for the next interval
  // tick (2026-07-22) — the WebView's timers are suspended while the screen
  // is locked, so `now` can be stale by however long it was locked; this
  // doesn't change when the in-app alarm catches up, just removes a small,
  // avoidable extra delay on top of that.
  // Also re-checks notification health here (code-review fix): the
  // schedule-key effect below only re-checks when a drip's own timing/label
  // changes, so a drip left running untouched for hours never got a second
  // look even if the OS silently downgraded permission or channel importance
  // mid-session. Changing either requires leaving the app for Settings, so
  // foreground is exactly when such a change could just have happened.
  useEffect(() => {
    const onWake = () => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      refreshNotifHealth();
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    return () => {
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, []);

  // Ask once per session (Spec 001 FR-12, 2026-07-21) — the in-app alarm alone
  // is not reliable once the screen locks; OS-level notifications are the
  // backstop, and they need this permission. If denied, warn the medic rather
  // than silently pretending the alarm will still fire in the background.
  // Unlock audio on the first touch anywhere (Owner field report 2026-07-25:
  // the alarm was completely silent on iPhone). iOS only lets an AudioContext
  // start producing sound if it was unlocked from inside a real user gesture;
  // an alarm firing from a timer can never do that itself. Listening once, on
  // the first interaction of the session, means the alarm is already armed
  // long before it's needed — rather than depending on the medic having
  // happened to start the metronome first.
  useEffect(() => {
    const onFirstGesture = () => unlockAudio();
    // `once` handles removal; capture so it runs even if a child stops
    // propagation. Both events because a stylus/mouse won't fire touchstart.
    window.addEventListener("pointerdown", onFirstGesture, {
      once: true,
      capture: true,
    });
    window.addEventListener("touchstart", onFirstGesture, {
      once: true,
      capture: true,
    });
    return () => {
      window.removeEventListener("pointerdown", onFirstGesture, true);
      window.removeEventListener("touchstart", onFirstGesture, true);
    };
  }, []);

  useEffect(() => {
    // Drive notifDenied from the actual permission result (code-review fix)
    // — this used to discard it, relying solely on the schedule-key effect's
    // checkNotificationHealth() call below. That call can win a race against
    // the OS permission dialog this promise is awaiting (it reads current
    // status immediately, before the medic has answered), latching
    // notifDenied to true with nothing to correct it afterwards since the
    // schedule-key effect only re-runs on a timing/label change. Setting it
    // here too means the medic tapping "Allow" always resolves it correctly,
    // however that race lands.
    //
    // Uses refreshNotifHealth() (code review 2026-08-02), not a bare
    // `setNotifDenied(!ok)`: ensureNotificationPermission()'s boolean only
    // reflects the OS permission, not channel importance, so a channel the
    // OS/user silently downgraded (permission still "granted") read as fine
    // here — and because this promise can resolve after the schedule-key
    // effect's own refreshNotifHealth() call below, it could overwrite an
    // already-correct "degraded" banner back to "fine". Calling the same
    // full health check here too closes that gap.
    ensureNotificationPermission()
      .then(() => refreshNotifHealth())
      .catch(() => {});
    // Sweep alarms armed by a previous, now-dead session (v6, 2026-07-24
    // Owner report: notifications fired for drips that had been deleted,
    // with the app not even running). Any drip alarm already pending at this
    // point predates this process, so it belongs to no drip in memory yet —
    // including a drip about to be restored (FR-13/AC-6f): the reschedule
    // effect below awaits this same sweep before scheduling anything, so a
    // restored drip's alarms are always re-armed fresh afterwards, never
    // left cancelled. See cancelOrphanedAlarms() in notifications.ts for the
    // full account.
    cancelOrphanedAlarms().catch(() => {});
  }, []);

  // (Re)schedule each drip's OS-level backstop notifications only when its
  // *actual* alarm timing or notification content changes (added, removed,
  // retitrated, silenced toggled, or auto-renumbered) — keyed via
  // dripScheduleKey() on bagMl/mlPerH/startedAt/silenced/label, deliberately
  // NOT on warned10/warned5/warnedEmpty. label is included so that
  // withOrdinal()'s auto-renumbering (see addDrip() below) refreshes an
  // already-scheduled notification's text instead of leaving it stale — a
  // renumbered drip still needs its OS notification body rewritten even
  // though its timing hasn't changed. Also re-checks
  // notification health *live* every time (2026-07-22 fix) — the old code
  // only snapshotted permission status once at mount, so the banner could
  // show stale "fine" even after the OS silently downgraded something
  // (channel importance, permission) mid-session.
  //
  // v5 (2026-07-22, three Owner field reports): this effect used to gate
  // fireAt10/5/Empty directly on d.warned10/5/Empty (`d.warned10 ? null :
  // ...`), and rescheduleDripAlarms() unconditionally cancels a drip's 3
  // notification ids on every call before rescheduling. That meant the
  // instant the *in-app* tick effect below (its own independent 1s poll)
  // noticed the same threshold and flipped e.g. warned10 to true, this
  // effect re-ran and cancelled — i.e. dismissed — notification id `warn10`,
  // even if the OS had already delivered and shown it. On a locked screen
  // the WebView's timers are suspended and only catch up once the screen is
  // unlocked/the app reopened (see the file-header note above and
  // notifications.ts) — so this self-cancel fired right as the medic looked
  // at the phone. That explains, in one root cause: (1) the notification
  // appearing to vanish/never-show ~1 min before the in-app alarm sounds
  // (the in-app alarm is the delayed catch-up, and its firing is what
  // triggered the self-cancel); (2) "no notification" specifically with the
  // drip's sound toggle off (an actively-playing AudioContext exempts the
  // WebView from Chromium's background-tab timer throttling, so with sound
  // on the in-app tick barely lags and the self-cancel window was too
  // narrow to ever notice — with sound off the tick freezes harder while
  // locked, widening the window); (3) it also explains why the empty-bag
  // notification could show up alone, looking like a stray glitch — the
  // 10/5-min ones had already been silently self-cancelled before the medic
  // checked.
  //
  // Fix: the OS notification and the in-app alarm are two fully independent
  // delivery channels for the same event — that was the entire point of
  // adding OS notifications (see the file-header history). warned10/5/Empty
  // must only ever gate the in-app audio/haptic (the separate `now`-effect
  // below); they must never cause this effect to touch the OS notification
  // for that stage. scheduledKeyRef additionally guards against redundant
  // cancel+reschedule calls firing on every unrelated `drips` change (e.g.
  // a different drip's stage flipping), not just the self-cancel case.
  useEffect(() => {
    const liveIds = new Set(drips.map((d) => d.id));
    // Tracks whether anything schedule-relevant actually happened this run,
    // so checkNotificationHealth() below — two real native-bridge calls — only
    // fires when there's a reason to, not on every unrelated `drips` change
    // (e.g. a warned10/5/Empty flip, which never reaches this branch at all).
    let scheduleChanged = false;
    drips.forEach((d) => {
      if (d.bagMl == null || d.mlPerH <= 0) {
        if (scheduledKeyRef.current.delete(d.id)) {
          void cancelDripAlarms(d.id);
          scheduleChanged = true;
        }
        return;
      }
      const key = dripScheduleKey(
        d.bagMl,
        d.mlPerH,
        d.startedAt,
        d.silenced,
        d.label,
      );
      if (scheduledKeyRef.current.get(d.id) === key) return;
      scheduledKeyRef.current.set(d.id, key);
      scheduleChanged = true;
      const endAt = dripEndsAt(d.startedAt, d.bagMl, d.mlPerH);
      // Explicit field list, not `...d` — deliberate (2026-07-24). `d` also
      // carries `displayTag` (see ActiveDrip), which must never reach the
      // OS notification: that channel is VISIBILITY_PUBLIC (shows on the
      // lock screen), and displayTag can hold something identifying (a
      // callsign, a name). Keep this call an explicit literal so a future
      // spread doesn't silently smuggle it in.
      void rescheduleDripAlarms({
        id: d.id,
        label: d.label,
        silenced: d.silenced,
        fireAt10: endAt - PRE_END_ALARM_MS_10,
        fireAt5: endAt - PRE_END_ALARM_MS_5,
        fireAtEmpty: endAt,
      });
    });
    for (const id of [...scheduledKeyRef.current.keys()]) {
      if (!liveIds.has(id)) {
        scheduledKeyRef.current.delete(id);
        scheduleChanged = true;
      }
    }
    void forgetStaleDrips(liveIds);
    if (scheduleChanged) refreshNotifHealth();
  }, [drips]);

  useEffect(() => {
    if (!onStatusChange) return;
    let stage: DripBadgeStatus["stage"] = "";
    for (const d of drips) {
      const s = alarmStage(d);
      if (s === "empty") {
        stage = "empty";
        break;
      }
      if (s === "warn5") stage = "warn5";
      else if (s === "warn10" && stage === "") stage = "warn10";
    }
    onStatusChange({ count: drips.length, stage });
  }, [drips, onStatusChange]);

  useEffect(() => {
    if (drips.length === 0) return;
    const nav = navigator as unknown as {
      wakeLock?: {
        request: (t: "screen") => Promise<{ release: () => Promise<void> }>;
      };
    };
    let lock: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    const acquire = () => {
      nav.wakeLock
        ?.request("screen")
        .then((l) => {
          if (cancelled) void l.release();
          else lock = l;
        })
        .catch(() => {});
    };
    acquire();
    const onVis = () => {
      if (document.visibilityState === "visible" && !lock) acquire();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release().catch(() => {});
    };
  }, [drips.length]);

  useEffect(() => {
    setDrips((prev) => {
      let changed = false;
      const next = prev.map((d) => {
        if (d.bagMl == null || d.mlPerH <= 0) return d;
        const remMs = dripEndsAt(d.startedAt, d.bagMl, d.mlPerH) - now;
        if (!d.warned10 && remMs <= PRE_END_ALARM_MS_10 && remMs > 0) {
          if (!d.silenced) void alarm("warn10");
          changed = true;
          return { ...d, warned10: true };
        }
        if (!d.warned5 && remMs <= PRE_END_ALARM_MS_5 && remMs > 0) {
          if (!d.silenced) void alarm("warn5");
          changed = true;
          return { ...d, warned5: true };
        }
        if (!d.warnedEmpty && remMs <= 0) {
          if (!d.silenced) void alarm("empty");
          changed = true;
          return { ...d, warnedEmpty: true };
        }
        return d;
      });
      return changed ? next : prev;
    });
  }, [now]);

  // Auto-number a drip's label when it collides with an already-active
  // drip's (2026-07-22 UX review — with up to 5 concurrent drips, two of the
  // same category/mode were visually indistinguishable on the card besides
  // a live rate number). Renumbers the first drip to "…  1" the moment a
  // second one collides, rather than leaving it unnumbered and only the new
  // one "2" (which wouldn't read as an obvious pair).
  function withOrdinal(
    base: string,
    existing: ActiveDrip[],
  ): { label: string; renumberId?: string } {
    const exact = existing.find((d) => d.label === base);
    const numbered = existing
      .map((d) => /^(.*) (\d+)$/.exec(d.label))
      .filter((m): m is RegExpExecArray => m !== null && m[1] === base)
      .map((m) => Number(m[2]));
    if (!exact && numbered.length === 0) return { label: base };
    if (exact) return { label: `${base} 2`, renumberId: exact.id };
    return { label: `${base} ${Math.max(...numbered) + 1}` };
  }

  function addDrip() {
    if (drips.length >= MAX_DRIPS || live.gtt <= 0) return;
    const id = `d${Date.now()}-${nextDripSeq++}`;
    const base =
      mode === "dose"
        ? preset
          ? `${preset.drug.drug} · ${preset.use}`
          : "Дріп"
        : mode === "burn"
          ? "Опікова рідина"
          : "Дріп"; // was "Крапельниця" — same word as the screen's own h1;
    // standardized on "Дріп" to match dose mode's fallback (2026-07-22).
    const sourceRecord: Drug | Formula | null =
      mode === "dose"
        ? (preset?.drug ?? null)
        : mode === "burn"
          ? (burnFormula ?? null)
          : null;
    setDrips((p) => {
      // Re-check against the *latest* state, not the render-closure `drips`
      // above — two addDrip() calls landing before a re-render commits (a
      // fast double-tap) would otherwise both read the same stale snapshot
      // and independently pick the same {label, renumberId}, producing two
      // new drips with an identical, non-disambiguated label. Computing
      // withOrdinal() from `p` inside this updater means the second call
      // always sees the first call's already-applied result.
      if (p.length >= MAX_DRIPS) return p;
      const { label, renumberId } = withOrdinal(base, p);
      const renumbered = renumberId
        ? p.map((d) => (d.id === renumberId ? { ...d, label: `${base} 1` } : d))
        : p;
      return [
        ...renumbered,
        {
          id,
          label,
          gtt: live.gtt,
          mlPerH: live.mlPerH,
          dropFactor,
          bagMl,
          startedAt: Date.now(),
          animStart: nowMs(),
          // A bag whose total run time is already ≤10/≤5 min starts out
          // past that threshold, not crossing down through it — nothing
          // to warn about, so seed warned10/5 pre-satisfied instead of
          // firing that stage's alarm the instant the drip is created
          // (Owner report 2026-07-24: an 8-min bag immediately fired the
          // "10 min left" alarm at creation). See calc.ts.
          ...preSatisfiedAlarmStages(
            bagMl,
            live.mlPerH,
            PRE_END_ALARM_MS_10,
            PRE_END_ALARM_MS_5,
          ),
          warnedEmpty: false,
          silenced: false,
          sourceRecord,
        },
      ];
    });
    if (!activeId) setActiveId(id);
  }

  function removeDrip(id: string) {
    setDrips((p) => p.filter((d) => d.id !== id));
    if (activeId === id) setActiveId(null);
    if (focusId === id) setFocusId(null);
  }

  function onRemoveClick(id: string) {
    if (confirmId === id) {
      removeDrip(id);
      setConfirmId(null);
      return;
    }
    setConfirmId(id);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(() => setConfirmId(null), 3000);
  }

  function retitrate(id: string, delta: number) {
    const now = Date.now();
    setDrips((p) =>
      p.map((d) => {
        if (d.id !== id) return d;
        const gtt = Math.max(1, Math.min(600, d.gtt + delta));
        const mlPerH = (gtt * 60) / d.dropFactor;
        // See calc.ts — keeps the true remaining-volume end time instead of
        // silently re-running the whole original bag at the new rate.
        const startedAt = retitratedStartedAt(
          d.startedAt,
          d.mlPerH,
          mlPerH,
          now,
        );
        // Retitration can push remaining time back above an already-crossed
        // threshold (e.g. slowing the drip down) — reset that stage's warned
        // flag so a later, genuine re-crossing sounds the alarm again (code
        // review 2026-08-02). Never set a flag *to* true here: the `now`
        // tick effect below is the only place that plays alarm(), and it
        // fires naturally on its next 1s tick if the flag isn't already true.
        const remMs =
          d.bagMl != null && mlPerH > 0
            ? dripEndsAt(startedAt, d.bagMl, mlPerH) - now
            : Infinity;
        return {
          ...d,
          gtt,
          mlPerH,
          startedAt,
          warned10: remMs > PRE_END_ALARM_MS_10 ? false : d.warned10,
          warned5: remMs > PRE_END_ALARM_MS_5 ? false : d.warned5,
          warnedEmpty: remMs > 0 ? false : d.warnedEmpty,
        };
      }),
    );
  }

  // Focus is a view only — opening it never starts/stops pacing (the metronome
  // stays wherever the user left it). Pacing is controlled by togglePacing.
  function enterFocus(id: string) {
    setFocusId(id);
  }

  function closeFocus() {
    setFocusId(null);
  }

  // The single pacing control: start this drip's metronome (stopping any other,
  // since activeId is one value) or stop it if it's already the active one.
  function togglePacing(id: string) {
    setActiveId((cur) => (cur === id ? null : id));
  }

  // Owner opt-out (2026-07-21): explicit per-drip alarm mute. Scoped to one
  // drip only — never a global setting, never on by default.
  function setSilenced(id: string, val: boolean) {
    setDrips((prev) =>
      prev.map((x) => (x.id === id ? { ...x, silenced: val } : x)),
    );
  }

  // Acknowledge a drip restored from a previous session (FR-13/AC-6f). Only
  // clears the un-trusted flag — the drip's numbers and timing are untouched,
  // since confirming means "yes, this bag is still running as shown", not
  // "recalculate it".
  function confirmDrip(id: string) {
    setDrips((prev) =>
      prev.map((x) => (x.id === id ? { ...x, unconfirmed: false } : x)),
    );
  }

  // In-app-only tag (2026-07-24 Owner decision — see ActiveDrip.displayTag).
  // Deliberately does not touch `label`, does not call rescheduleDripAlarms
  // or anything in notifications.ts — nothing here should ever reach the
  // OS notification channel.
  function setDisplayTag(id: string, val: string) {
    setDrips((prev) =>
      prev.map((x) => (x.id === id ? { ...x, displayTag: val } : x)),
    );
  }

  function remaining(d: ActiveDrip): string {
    if (d.bagMl == null || d.mlPerH <= 0) return "—";
    const remMs = dripEndsAt(d.startedAt, d.bagMl, d.mlPerH) - now;
    if (remMs <= 0) return "порожньо";
    const min = Math.floor(remMs / 60_000);
    return min >= 60
      ? `${Math.floor(min / 60)} год ${min % 60} хв`
      : `${min} хв`;
  }

  // Informational only (Owner, 2026-07-21) — tells the medic how much of the
  // drip's remaining run time is still ahead of the 10-min alarm window, i.e.
  // how long "Без будильника" will actually stay quiet. Never drives logic.
  function quietHint(d: ActiveDrip): string | null {
    if (d.bagMl == null || d.mlPerH <= 0) return null;
    const remMs = dripEndsAt(d.startedAt, d.bagMl, d.mlPerH) - now;
    const quietMs = remMs - PRE_END_ALARM_MS_10;
    if (quietMs <= 0) return null;
    const min = Math.floor(quietMs / 60_000);
    return min >= 60
      ? `тихо ще ${Math.floor(min / 60)} год ${min % 60} хв`
      : `тихо ще ${min} хв`;
  }

  // Escalating visual stage to pair with the escalating audio (2026-07-22 UX
  // review) — applied regardless of `silenced`, since a muted drip has no
  // other signal left once its alarm stage passes.
  function alarmStage(d: ActiveDrip): "" | "warn10" | "warn5" | "empty" {
    if (d.warnedEmpty) return "empty";
    if (d.warned5) return "warn5";
    if (d.warned10) return "warn10";
    return "";
  }

  return {
    drips,
    activeId,
    focusId,
    focusDrip,
    confirmId,
    notifDenied,
    audio,
    setAudio,
    haptic,
    setHaptic,
    addDrip,
    onRemoveClick,
    retitrate,
    enterFocus,
    closeFocus,
    togglePacing,
    setSilenced,
    confirmDrip,
    setDisplayTag,
    remaining,
    quietHint,
    alarmStage,
  };
}
