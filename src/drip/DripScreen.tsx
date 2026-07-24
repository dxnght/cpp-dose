// Drip engine screen (Spec 001 + Spec 003 burn mode). Drop-factor selector +
// steppers + gtt/min hero, up to 5 concurrent drips each with its own timer +
// two-stage pre-end alarm — 10 min and 5 min remaining (Owner decision
// 2026-07-21, expanding the single 5→10 min change from 2026-07-18); one
// audible metronome at a time (FR-9). Focus mode with
// live retitration, a phase-synced drip-chamber animation shared with a silent
// screen-flash and the audio metronome, confirm-to-remove, tap-to-calibrate, and
// remembered last drop-factor/drug. All math is engineering; drug concentrations
// and the burn Rule of Ten come from VERIFIED records only (fail-closed).
import { useEffect, useMemo, useRef, useState } from "react";
import { fieldBundle } from "../clinical/loader";
import { isRenderable } from "../clinical/guard";
import { SourceBadge } from "../components/SourceBadge";
import type { Drug, Formula } from "../clinical/types";
import { Metronome } from "./metronome";
import { tapHaptic, warnHaptic, emptyHaptic } from "./haptics";
import {
  ensureNotificationPermission,
  checkNotificationHealth,
  rescheduleDripAlarms,
  cancelDripAlarms,
  forgetStaleDrips,
  dripScheduleKey,
} from "./notifications";
import {
  clamp,
  DOSE,
  WEIGHT,
  VOLUME,
  DROP_FACTORS,
  doseToMlPerH,
  mlPerHToGtt,
  secPerDrop,
  bagRunHours,
  burnRuleOfTenMlPerH,
  doseRangeMg,
  parseConcentrationMgPerMl,
  preSatisfiedAlarmStages,
} from "./calc";

interface ConcPreset {
  drug: Drug;
  conc: number; // mg/ml
  use: string; // "Знеболення" | "Седація"
  label: string;
}

interface ActiveDrip {
  id: string;
  label: string;
  gtt: number;
  mlPerH: number;
  dropFactor: number;
  bagMl: number | null;
  startedAt: number;
  animStart: number; // performance.now() ms — shared phase anchor
  warned10: boolean;
  warned5: boolean;
  warnedEmpty: boolean;
  silenced: boolean; // Owner opt-out (2026-07-21): mutes all 3 alarms for this drip only.
  // Snapshot of the clinical/engineering record this drip's numbers came
  // from, taken once at addDrip() time (2026-07-22, UX review finding —
  // SourceBadge used to only show at setup, so verification status
  // disappeared the moment a drip started running, including in Focus mode,
  // the view a medic watches for the drip's whole life). null for bagtime
  // mode, which is plain arithmetic on user-entered numbers with no
  // underlying record to cite.
  sourceRecord: Drug | Formula | null;
  // Optional free-text tag (e.g. a bed/litter number) so a medic can tell
  // apart concurrent drips on different patients — 2026-07-24 Owner
  // decision, deliberately kept separate from `label`. In-app display
  // only: never read by notifications.ts / rescheduleDripAlarms() /
  // dripScheduleKey(), which continue to use `label` alone. That split is
  // the whole point — the OS notification channel is patched to
  // VISIBILITY_PUBLIC (shows on the lock screen), so anything identifying
  // must never reach it. Purely in-memory like the rest of `drips`, never
  // touches localStorage or any file; gone the moment the drip is removed
  // or the app restarts.
  displayTag?: string;
}

type Mode = "dose" | "bagtime" | "burn";

// Spec 001 FR-6: two-stage pre-end alarm lead times (Owner decision
// 2026-07-21) — a heads-up at 10 min remaining, then a second, more urgent
// alarm at 5 min, before the final at-empty alarm.
const PRE_END_ALARM_MS_10 = 10 * 60_000;
const PRE_END_ALARM_MS_5 = 5 * 60_000;

// Spec 001 FR-7: concurrent-drip cap (Owner decision 2026-07-21, raised from 3).
const MAX_DRIPS = 5;

const LS = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, val: string): void {
    try {
      localStorage.setItem(key, val);
    } catch {
      /* storage unavailable */
    }
  },
};

const nowMs = (): number =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

function fmtHours(h: number): string {
  if (!isFinite(h) || h <= 0) return "—";
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return hh > 0 ? `${hh} год ${mm} хв` : `${mm} хв`;
}

function fmtHM(h: number): string {
  if (!isFinite(h) || h <= 0) return "—";
  const totalMin = Math.round(h * 60);
  return `${Math.floor(totalMin / 60)}:${String(totalMin % 60).padStart(2, "0")}`;
}

function dur(gtt: number): string {
  return `${(60 / Math.max(1, gtt)).toFixed(2)}s`;
}

// Distinct, escalating alarm feel so a medic can tell the stage apart without
// looking: a single beep at 10-min-out, a double at 5-min-out, a long triple
// at empty.
function alarm(kind: "warn10" | "warn5" | "empty"): void {
  try {
    const Ctor = (window as unknown as { AudioContext?: typeof AudioContext })
      .AudioContext;
    if (Ctor) {
      const ctx = new Ctor();
      const beeps = kind === "empty" ? 3 : kind === "warn5" ? 2 : 1;
      // Louder + longer (Owner, 2026-07-21 — the old 0.3-gain/0.2s sine beeps
      // were too quiet/soft to trust in the field). Square wave cuts through
      // better than sine; near-max gain sustained for most of the beep.
      const beepLen = 0.45;
      const gap = 0.55;
      for (let i = 0; i < beeps; i++) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "square";
        o.frequency.value = kind === "empty" ? 520 : 660;
        const t = ctx.currentTime + i * gap;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.9, t + 0.015);
        g.gain.setValueAtTime(0.9, t + beepLen - 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + beepLen);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + beepLen);
      }
    }
  } catch {
    /* audio unavailable */
  }
  if (kind === "empty") emptyHaptic();
  else warnHaptic();
}

function Stepper(props: {
  label: string;
  value: number;
  display: string;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="stepper">
      <button
        aria-label={`${props.label} −`}
        onClick={() =>
          props.onChange(Math.max(props.min, props.value - props.step))
        }
      >
        −
      </button>
      <div className="stepper-value">
        <span className="stepper-label">{props.label}</span>
        <span className="stepper-num">{props.display}</span>
      </div>
      <button
        aria-label={`${props.label} +`}
        onClick={() =>
          props.onChange(Math.min(props.max, props.value + props.step))
        }
      >
        +
      </button>
    </div>
  );
}

// The chamber picks up the shared phase (animStart) at mount via a negative delay,
// so a freshly-opened focus chamber continues the card's phase (never restarts).
function Chamber({
  gtt,
  animStart,
  muted,
}: {
  gtt: number;
  animStart: number;
  muted?: boolean;
}) {
  const delayRef = useRef(-((nowMs() - animStart) / 1000));
  return (
    <div
      className={muted ? "chamber chamber-muted" : "chamber"}
      aria-hidden="true"
    >
      <span className="chamber-pool" />
      <span
        className="chamber-drop"
        style={{
          animationDuration: dur(gtt),
          animationDelay: `${delayRef.current}s`,
        }}
      />
    </div>
  );
}

// Press-and-hold mute control (2026-07-22 redesign, Owner decision). Enabling
// "Без будильника" requires holding for HOLD_MS — silencing the drip's only
// alarm should be *harder* than the accidental single tap the old checkbox
// allowed. Disabling stays a single, instant tap: turning the alarm back on
// is the safe direction and should have no friction, mirroring the asymmetry
// already used for "Прибрати" (confirm only the destructive direction).
// HOLD_MS must match the CSS transition duration on `.silence-btn.holding`
// (--silence-hold-ms in theme.css) so the visual fill and the actual
// activation land together.
const SILENCE_HOLD_MS = 600;

function SilenceToggle({
  silenced,
  hint,
  onSetSilenced,
}: {
  silenced: boolean;
  hint: string | null;
  onSetSilenced: (v: boolean) => void;
}) {
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<number | null>(null);
  const justMutedRef = useRef(false);

  function clearHold() {
    if (holdTimer.current != null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    setHolding(false);
  }

  function onPointerDown() {
    // Reset defensively on every new press: on some Android WebViews the
    // click that normally follows a completed hold can fail to fire (the
    // same long-press-vs-click-callout quirk `onContextMenu` below works
    // around), which would otherwise strand justMutedRef=true forever and
    // silently swallow the medic's next real un-mute tap.
    justMutedRef.current = false;
    if (silenced) return; // un-mute path is the plain onClick below
    setHolding(true);
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      setHolding(false);
      justMutedRef.current = true; // swallow the click that follows this hold
      onSetSilenced(true);
    }, SILENCE_HOLD_MS);
  }

  function onClick() {
    if (justMutedRef.current) {
      justMutedRef.current = false;
      return;
    }
    if (silenced) onSetSilenced(false);
    // else: a quick tap/click with no completed hold does nothing — muting
    // only ever happens via the timer above.
  }

  // Keyboard/switch-access equivalent of the pointer hold (2026-07-24 fix):
  // the mute-enable path used to be reachable only via onPointerDown, so a
  // keyboard-only user's Enter/Space activation — which native <button>
  // semantics deliver as a plain `click`, with no pointerdown/pointerup —
  // could never satisfy the hold and could never mute a drip. Holding
  // Enter/Space now drives the same timer as a pointer hold; `e.repeat`
  // guards against the OS's key-auto-repeat re-firing onPointerDown on every
  // repeat tick while held.
  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (e.repeat) return;
    onPointerDown();
  }

  function onKeyUp(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "Enter" && e.key !== " ") return;
    clearHold();
  }

  return (
    <button
      type="button"
      className={`silence-btn${silenced ? " on" : ""}${holding ? " holding" : ""}`}
      aria-pressed={silenced}
      aria-label={
        silenced
          ? "Вимкнути «без будильника» для цього дріпу"
          : `Утримайте ~${Math.round(SILENCE_HOLD_MS / 100) / 10}с, щоб увімкнути «без будильника» лише для цього дріпу`
      }
      onPointerDown={onPointerDown}
      onPointerUp={clearHold}
      onPointerLeave={clearHold}
      onPointerCancel={clearHold}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={clearHold}
      onClick={onClick}
      // A ~600ms hold on a text-bearing element is exactly the gesture
      // mobile WebViews use to trigger native text selection / the
      // copy-lookup callout. CSS (user-select/touch-callout, theme.css)
      // stops the visual selection; this stops the callout/context-menu
      // some Android WebViews still raise on top of that (2026-07-23).
      onContextMenu={(e) => e.preventDefault()}
    >
      <span aria-hidden="true">{silenced ? "🔇" : "🔔"}</span>
      {silenced ? (
        <>Без будильника (лише цей дріп) — тап, щоб увімкнути</>
      ) : (
        <>
          Утримай ~1с — без будильника (лише цей дріп)
          {hint && <span className="hint"> · {hint}</span>}
        </>
      )}
    </button>
  );
}

export function DripScreen() {
  const presets: ConcPreset[] = useMemo(() => {
    const list = fieldBundle.drugs
      // Fail-closed (Art. III), quietly excluding rather than throwing
      // (2026-07-22 UX review): this feeds a bulk useMemo, not a per-card
      // render, so a throw here (the old assertRenderable(d) call) would
      // abort the *whole* list construction, not just one entry — an
      // ErrorBoundary can't help since the throw happens inside this
      // component's own render, not a child's. compile:field already
      // guarantees only VERIFIED/engineering drugs reach the bundle; this is
      // defense in depth with zero blast radius instead of a contained one.
      .filter((d) => isRenderable(d))
      .map((d) => {
        const c = parseConcentrationMgPerMl(d.infusion?.concentration);
        if (!c) return null;
        const ind = d.indication.toLowerCase();
        const use = ind.includes("analges")
          ? "Знеболення"
          : ind.includes("sedation")
            ? "Седація"
            : "Інфузія";
        // Drug name included (2026-07-22 UX review) — the selector and the
        // running-drip card used to show only category+concentration
        // ("Знеболення · 1 мг/мл"), never which drug, so a medic had to infer
        // it from the concentration number alone.
        return {
          drug: d,
          conc: c,
          use,
          label: `${d.drug} · ${use} · ${c} мг/мл`,
        };
      })
      .filter((x): x is ConcPreset => x !== null);
    list.sort((a, b) => a.conc - b.conc); // analgesia (1 mg/ml) default / left
    return list;
  }, []);

  const burnFormula = useMemo(
    () => fieldBundle.formulas.find((f) => f.id === "burn_rule_of_ten"),
    [],
  );

  const [dropFactor, setDropFactor] = useState(() => {
    const v = Number(LS.get("cpp-dose.dropFactor"));
    return (DROP_FACTORS as readonly number[]).includes(v) ? v : 20;
  });
  const [mode, setMode] = useState<Mode>(presets.length ? "dose" : "bagtime");
  const [presetIdx, setPresetIdx] = useState(() => {
    const id = LS.get("cpp-dose.drugId");
    const i = presets.findIndex((p) => p.drug.id === id);
    return i >= 0 ? i : 0;
  });
  const [weight, setWeight] = useState(80);
  const [dose, setDose] = useState(0.2);
  const [tbsa, setTbsa] = useState(30);
  const [bagGtt, setBagGtt] = useState(5);
  const [bagMl, setBagMl] = useState(100);

  const [drips, setDrips] = useState<ActiveDrip[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [notifDenied, setNotifDenied] = useState(false);
  const [audio, setAudio] = useState(true);
  const [haptic, setHaptic] = useState(true);
  const [flashOn, setFlashOn] = useState(false);
  const [calib, setCalib] = useState(false);
  const [taps, setTaps] = useState<number[]>([]);

  const metronome = useRef<Metronome | null>(null);
  const flashElRef = useRef<HTMLDivElement>(null);
  const wantFlashRef = useRef(false);
  const confirmTimer = useRef<number | null>(null);
  const startedRef = useRef<string | null>(null);
  // Per-drip "last scheduled" key (2026-07-22, v5 notification fix — see the
  // reschedule effect below) — lets that effect skip drips whose alarm
  // timing hasn't actually changed, instead of re-cancelling/rescheduling
  // every drip on every unrelated `drips` change.
  const scheduledKeyRef = useRef<Map<string, string>>(new Map());

  const preset = presets[presetIdx];
  const conc = preset?.conc ?? 1;
  const burnGated = mode === "burn" && !burnFormula;
  const focusDrip = drips.find((d) => d.id === focusId) ?? null;
  const calRate =
    taps.length >= 3
      ? Math.round(
          (60000 * (taps.length - 1)) / (taps[taps.length - 1] - taps[0]),
        )
      : null;

  const bolus = useMemo(
    () =>
      preset
        ? fieldBundle.drugs.find((d) => d.bolus_for === preset.drug.id)
        : undefined,
    [preset],
  );

  const live = useMemo(() => {
    if (mode === "dose") {
      const mlPerH = doseToMlPerH(dose, weight, conc);
      return { mlPerH, gtt: Math.round(mlPerHToGtt(mlPerH, dropFactor)) };
    }
    if (mode === "burn") {
      if (!burnFormula) return { mlPerH: 0, gtt: 0 };
      const mlPerH = burnRuleOfTenMlPerH(tbsa, weight);
      return { mlPerH, gtt: Math.round(mlPerHToGtt(mlPerH, dropFactor)) };
    }
    return { mlPerH: (bagGtt * 60) / dropFactor, gtt: bagGtt };
  }, [mode, dose, weight, conc, dropFactor, tbsa, burnFormula, bagGtt]);

  useEffect(
    () => LS.set("cpp-dose.dropFactor", String(dropFactor)),
    [dropFactor],
  );
  useEffect(() => {
    if (preset) LS.set("cpp-dose.drugId", preset.drug.id);
  }, [preset]);
  useEffect(() => {
    wantFlashRef.current = flashOn;
  }, [flashOn]);

  useEffect(() => {
    const m = new Metronome();
    m.setHapticHandler(() => tapHaptic());
    m.setTickHandler(() => {
      if (!wantFlashRef.current) return;
      const el = flashElRef.current;
      if (!el) return;
      el.style.opacity = "0.5";
      window.setTimeout(() => {
        if (el) el.style.opacity = "0";
      }, 90);
    });
    metronome.current = m;
    return () => m.stop();
  }, []);

  // (Re)start the metronome only when the active drip or its rate changes, anchored
  // to that drip's animStart so audio, flash and animation share one phase.
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
  useEffect(() => {
    const onWake = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
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
  useEffect(() => {
    ensureNotificationPermission().catch(() => {});
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
      const endAt = d.startedAt + bagRunHours(d.bagMl, d.mlPerH) * 3600_000;
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
    if (scheduleChanged) {
      checkNotificationHealth()
        .then((h) =>
          setNotifDenied(
            !h.permissionGranted ||
              (h.channelImportance != null && h.channelImportance < 4),
          ),
        )
        .catch(() => setNotifDenied(true));
    }
  }, [drips]);

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
        const remMs =
          d.startedAt + bagRunHours(d.bagMl, d.mlPerH) * 3600_000 - now;
        if (!d.warned10 && remMs <= PRE_END_ALARM_MS_10 && remMs > 0) {
          if (!d.silenced) alarm("warn10");
          changed = true;
          return { ...d, warned10: true };
        }
        if (!d.warned5 && remMs <= PRE_END_ALARM_MS_5 && remMs > 0) {
          if (!d.silenced) alarm("warn5");
          changed = true;
          return { ...d, warned5: true };
        }
        if (!d.warnedEmpty && remMs <= 0) {
          if (!d.silenced) alarm("empty");
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
    const id = `d${Date.now()}`;
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
    setDrips((p) =>
      p.map((d) => {
        if (d.id !== id) return d;
        const gtt = Math.max(1, Math.min(600, d.gtt + delta));
        return { ...d, gtt, mlPerH: (gtt * 60) / d.dropFactor };
      }),
    );
  }

  // Focus is a view only — opening it never starts/stops pacing (the metronome
  // stays wherever the user left it). Pacing is controlled by togglePacing.
  function enterFocus(id: string) {
    setFocusId(id);
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

  // In-app-only tag (2026-07-24 Owner decision — see ActiveDrip.displayTag).
  // Deliberately does not touch `label`, does not call rescheduleDripAlarms
  // or anything in notifications.ts — nothing here should ever reach the
  // OS notification channel.
  function setDisplayTag(id: string, val: string) {
    setDrips((prev) =>
      prev.map((x) => (x.id === id ? { ...x, displayTag: val } : x)),
    );
  }

  function applyCalib() {
    if (calRate) setBagGtt(Math.max(1, Math.min(600, calRate)));
    setCalib(false);
  }

  function remaining(d: ActiveDrip): string {
    if (d.bagMl == null || d.mlPerH <= 0) return "—";
    const remMs = d.startedAt + bagRunHours(d.bagMl, d.mlPerH) * 3600_000 - now;
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
    const remMs = d.startedAt + bagRunHours(d.bagMl, d.mlPerH) * 3600_000 - now;
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

  const spd = live.gtt > 0 ? Math.round(secPerDrop(live.gtt)) : 0;

  return (
    <section>
      <div ref={flashElRef} className="flash-layer" aria-hidden="true" />

      {focusDrip && (
        <div
          className="focus-overlay"
          role="dialog"
          aria-label="фокус-режим"
          onClick={() => setFocusId(null)}
        >
          <div className="focus-label">{focusDrip.label}</div>
          <input
            type="text"
            className="focus-tag"
            value={focusDrip.displayTag ?? ""}
            onChange={(e) => setDisplayTag(focusDrip.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="мітка (напр. ліжко 3) — необов'язково"
            aria-label="мітка дріпу, лише на цьому екрані"
            maxLength={40}
          />
          <div className="focus-retit" onClick={(e) => e.stopPropagation()}>
            <button
              aria-label="повільніше"
              onClick={() => retitrate(focusDrip.id, -1)}
            >
              −
            </button>
            <div className="focus-gtt">
              {focusDrip.gtt}
              <span> кр/хв</span>
            </div>
            <button
              aria-label="швидше"
              onClick={() => retitrate(focusDrip.id, 1)}
            >
              +
            </button>
          </div>
          <div className="focus-chamber-scale">
            <Chamber
              gtt={focusDrip.gtt}
              animStart={focusDrip.animStart}
              muted={focusDrip.id !== activeId}
            />
          </div>
          <div className={`focus-rem ${alarmStage(focusDrip)}`}>
            Залишок: {remaining(focusDrip)}
          </div>
          {focusDrip.sourceRecord && (
            <div onClick={(e) => e.stopPropagation()}>
              <SourceBadge record={focusDrip.sourceRecord} compact />
            </div>
          )}
          <button
            className={`focus-pace${focusDrip.id === activeId ? " on" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              togglePacing(focusDrip.id);
            }}
          >
            {focusDrip.id === activeId ? "◼ Метроном" : "▶ Метроном"}
          </button>
          {focusDrip.id === activeId && (
            <div className="toggles" onClick={(e) => e.stopPropagation()}>
              <label>
                <input
                  type="checkbox"
                  checked={audio}
                  onChange={(e) => setAudio(e.target.checked)}
                />{" "}
                Звук
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={haptic}
                  onChange={(e) => setHaptic(e.target.checked)}
                />{" "}
                Вібрація
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={flashOn}
                  onChange={(e) => setFlashOn(e.target.checked)}
                />{" "}
                Спалах
              </label>
            </div>
          )}
          <div className="focus-hint">Торкніться фону, щоб вийти</div>
        </div>
      )}

      {calib && (
        <div className="focus-overlay" role="dialog" aria-label="калібратор">
          <div className="focus-label">Стукай у такт краплям</div>
          <div className="focus-gtt">
            {calRate ?? "—"}
            <span> кр/хв</span>
          </div>
          <button
            className="calib-tap"
            onClick={() => setTaps((t) => [...t, nowMs()].slice(-20))}
          >
            ТАП
          </button>
          <div className="focus-rem">
            {taps.length} тапів
            {calRate
              ? ` · ${bagMl} мл ~ ${fmtHM(bagMl / ((calRate * 60) / dropFactor))}`
              : ""}
          </div>
          <div className="calib-actions" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setTaps([])}>Скинути</button>
            <button
              className="primary"
              disabled={!calRate}
              onClick={applyCalib}
            >
              Застосувати
            </button>
            <button onClick={() => setCalib(false)}>Закрити</button>
          </div>
        </div>
      )}

      <h1>Крапельниця</h1>

      {/* Active drips render above the calculator once any exist
          (2026-07-22 UX review — checking/muting a running drip used to
          require scrolling past the whole setup panel every time). */}
      {drips.length > 0 && (
        <>
          <h2>
            Активні дріпи ({drips.length}/{MAX_DRIPS})
          </h2>
          {notifDenied && drips.some((d) => d.bagMl != null) && (
            <div className="banner banner--warn" role="alert">
              ⚠ Сповіщення вимкнено або обмежені — будильник може не спрацювати
              при заблокованому екрані. Перевір дозволи сповіщень для CPP-DOSE в
              налаштуваннях телефону.
            </div>
          )}
          {!notifDenied && drips.some((d) => d.bagMl != null) && (
            <div className="banner banner--hint">
              Порада: додай CPP-DOSE у виключення з оптимізації батареї
              (Налаштування → Застосунки → CPP-DOSE → Батарея) — інакше телефон
              може відкладати будильник при заблокованому екрані, навіть якщо
              сповіщення дозволені.
            </div>
          )}
          {drips.map((d) => {
            const isActive = d.id === activeId;
            const stage = alarmStage(d);
            return (
              <article
                key={d.id}
                className={`drip-card${isActive ? " active" : ""}${stage ? ` ${stage}` : ""}`}
              >
                <div className="drip-tap" onClick={() => enterFocus(d.id)}>
                  <div className="drip-mini-top">
                    <span className="drip-mini-name">
                      {d.label}
                      {d.displayTag && (
                        <span className="drip-tag"> · {d.displayTag}</span>
                      )}
                    </span>
                    <span className="expand" aria-hidden="true">
                      ⤢
                    </span>
                  </div>
                  <div className="drip-mini-gtt">
                    {d.gtt}
                    <span> кр/хв</span>
                  </div>
                  <Chamber
                    gtt={d.gtt}
                    animStart={d.animStart}
                    muted={d.id !== activeId}
                  />
                  <div className="drip-mini-meta">
                    {d.dropFactor} gtt/ml · {d.mlPerH.toFixed(0)} мл/год ·{" "}
                    {remaining(d)}
                  </div>
                  <div className="tap-hint">Тап — на весь екран</div>
                  {d.sourceRecord && (
                    <SourceBadge record={d.sourceRecord} compact />
                  )}
                </div>
                <div className="drip-actions">
                  <button
                    className={isActive ? "on" : ""}
                    onClick={() => togglePacing(d.id)}
                  >
                    {isActive ? "◼ Метроном" : "▶ Метроном"}
                  </button>
                  <button
                    className={confirmId === d.id ? "danger" : ""}
                    onClick={() => onRemoveClick(d.id)}
                  >
                    {confirmId === d.id ? "Точно прибрати?" : "Прибрати"}
                  </button>
                </div>
                {d.bagMl != null && (
                  <SilenceToggle
                    silenced={d.silenced}
                    hint={quietHint(d)}
                    onSetSilenced={(v) => setSilenced(d.id, v)}
                  />
                )}
              </article>
            );
          })}
          {activeId != null && (
            <div className="toggles">
              <label>
                <input
                  type="checkbox"
                  checked={audio}
                  onChange={(e) => setAudio(e.target.checked)}
                />{" "}
                Звук
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={haptic}
                  onChange={(e) => setHaptic(e.target.checked)}
                />{" "}
                Вібрація
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={flashOn}
                  onChange={(e) => setFlashOn(e.target.checked)}
                />{" "}
                Спалах
              </label>
            </div>
          )}
          <p className="runtime left">
            {activeId != null
              ? "Тап по дріпу — фокус-режим. «Спалах» — беззвучний темп світлом."
              : "Тап по дріпу — фокус-режим. Запусти метроном (▶), щоб задати темп."}
          </p>
        </>
      )}

      {drips.length > 0 && <h2>Новий дріп</h2>}
      <div className="seg" role="tablist" aria-label="режим">
        {presets.length > 0 && (
          <button
            className={mode === "dose" ? "on" : ""}
            onClick={() => setMode("dose")}
          >
            За дозою
          </button>
        )}
        <button
          className={mode === "bagtime" ? "on" : ""}
          onClick={() => setMode("bagtime")}
        >
          Час мішка
        </button>
        <button
          className={mode === "burn" ? "on" : ""}
          onClick={() => setMode("burn")}
        >
          Опіки
        </button>
      </div>

      <p className="fieldlabel">Крапель у мл (набір)</p>
      <div className="df-grid">
        {DROP_FACTORS.map((f) => (
          <button
            key={f}
            className={f === dropFactor ? "on" : ""}
            onClick={() => setDropFactor(f)}
          >
            {f} gtt/ml
          </button>
        ))}
      </div>

      {mode === "dose" && preset && (
        <>
          <p className="fieldlabel">Препарат / концентрація</p>
          <select
            className="conc-select"
            aria-label="препарат і концентрація"
            value={presetIdx}
            onChange={(e) => setPresetIdx(Number(e.target.value))}
          >
            {presets.map((p, i) => (
              <option key={p.drug.id} value={i}>
                {p.label}
              </option>
            ))}
          </select>
          {preset.use === "Седація" && (
            <div className="banner banner--warn">
              ⚠ Седація — складний процес. Без телемедичної консультації краще
              не застосовувати.
            </div>
          )}
          <Stepper
            label="Вага"
            value={weight}
            display={`${weight} кг`}
            step={5}
            min={WEIGHT.min}
            max={WEIGHT.max}
            onChange={setWeight}
          />
          <Stepper
            label="Доза, мг/кг/год"
            value={dose}
            display={dose.toFixed(2)}
            step={0.05}
            min={DOSE.min}
            max={DOSE.max}
            onChange={(v) => setDose(clamp(Math.round(v * 100) / 100, DOSE))}
          />
          {bolus?.dose_per_kg && (
            <div className="banner banner--info bolus">
              Болюс перед дріпом:{" "}
              <b>
                {doseRangeMg(bolus.dose_per_kg, weight) ?? bolus.dose_per_kg}
              </b>{" "}
              - або -
              <span className="bolus-sub">
                {" "}
                <b>{bolus.dose_per_kg}</b> {bolus.route}
              </span>
            </div>
          )}
          <Stepper
            label="Об'єм мішка, мл"
            value={bagMl}
            display={`${bagMl} мл`}
            step={50}
            min={VOLUME.min}
            max={VOLUME.max}
            onChange={setBagMl}
          />
          <div className="runtime">
            Мішка вистачить на ~
            {fmtHours(live.mlPerH > 0 ? bagMl / live.mlPerH : Infinity)}
          </div>
        </>
      )}

      {mode === "burn" && (
        <>
          <Stepper
            label="% опіків (TBSA)"
            value={tbsa}
            display={`${tbsa} %`}
            step={5}
            min={0}
            max={100}
            onChange={setTbsa}
          />
          <Stepper
            label="Вага"
            value={weight}
            display={`${weight} кг`}
            step={5}
            min={WEIGHT.min}
            max={WEIGHT.max}
            onChange={setWeight}
          />
          <Stepper
            label="Об'єм мішка, мл"
            value={bagMl}
            display={`${bagMl} мл`}
            step={50}
            min={VOLUME.min}
            max={VOLUME.max}
            onChange={setBagMl}
          />
          {!burnGated && (
            <div className="runtime">
              Мішка вистачить на ~
              {fmtHours(live.mlPerH > 0 ? bagMl / live.mlPerH : Infinity)}
            </div>
          )}
        </>
      )}

      {mode === "bagtime" && (
        <>
          <p className="runtime left">
            Скільки ще протримається мішок при поточній швидкості.
          </p>
          <Stepper
            label="Об'єм мішка, мл"
            value={bagMl}
            display={`${bagMl} мл`}
            step={50}
            min={VOLUME.min}
            max={VOLUME.max}
            onChange={setBagMl}
          />
          <Stepper
            label="Крапель/хв (зараз)"
            value={bagGtt}
            display={`${bagGtt} кр/хв`}
            step={1}
            min={1}
            max={600}
            onChange={setBagGtt}
          />
          <button
            className="add-btn"
            onClick={() => {
              setTaps([]);
              setCalib(true);
            }}
          >
            ⊙ Калібрувати постукуванням
          </button>
        </>
      )}

      <div className="hero">
        {burnGated ? (
          <>
            <div className="hero-label">Опіки — правило десяток</div>
            <div className="hero-sub">
              Формула ще не підтверджена. Підтвердьте запис burn_rule_of_ten,
              щоб рахувати.
            </div>
          </>
        ) : mode === "bagtime" ? (
          <>
            <div className="hero-label">Мішка вистачить на</div>
            <div className="hero-num">
              {fmtHM(live.mlPerH > 0 ? bagMl / live.mlPerH : Infinity)}
            </div>
            <div className="hero-sub">
              год:хв · {live.mlPerH.toFixed(0)} мл/год
            </div>
          </>
        ) : (
          <>
            <div className="hero-label">
              {mode === "burn" ? "Швидкість → крапель/хв" : "Крапель / хв"}
            </div>
            <div className="hero-num">{live.gtt}</div>
            <div className="hero-sub">
              {live.gtt > 0
                ? `1 крапля / ${spd} с · ${live.mlPerH.toFixed(0)} мл/год`
                : "перевір параметри"}
            </div>
          </>
        )}
      </div>

      {mode === "dose" && preset && <SourceBadge record={preset.drug} />}
      {mode === "burn" && burnFormula && <SourceBadge record={burnFormula} />}

      <button
        className="primary add-btn"
        disabled={drips.length >= MAX_DRIPS || live.gtt <= 0}
        onClick={addDrip}
      >
        {drips.length >= MAX_DRIPS
          ? `Максимум ${MAX_DRIPS} дріпів`
          : "＋ Додати дріп"}
      </button>
    </section>
  );
}
