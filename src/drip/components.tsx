// Presentational pieces of the drip screen. Extracted from DripScreen.tsx
// (2026-07-24) to get the main file back under control; behaviour unchanged,
// covered by the existing suite.
import { useRef, useState } from "react";
import { dur, nowMs } from "./format";

// Hold-to-repeat tuning for the ± buttons: a quick tap still does exactly one
// onClick step (unchanged); holding past STEP_REPEAT_DELAY_MS starts
// auto-repeat, ramping from STEP_REPEAT_START_MS down to STEP_REPEAT_MIN_MS
// so a full range sweep (e.g. dose 0.1-2 mg/kg/h at a 0.05 step, ~38 taps)
// doesn't require dozens of taps.
const STEP_REPEAT_DELAY_MS = 350;
const STEP_REPEAT_START_MS = 180;
const STEP_REPEAT_MIN_MS = 45;
const STEP_REPEAT_RAMP_MS = 1200;

export function Stepper(props: {
  label: string;
  value: number;
  display: string;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  // Mirrors the latest props on every render so the repeat loop below (which
  // outlives any single render) always steps from the current value instead
  // of the one captured when the hold started.
  const propsRef = useRef(props);
  propsRef.current = props;

  const repeatTimer = useRef<number | null>(null);
  const justRepeatedRef = useRef(false);
  const holdStart = useRef(0);

  function clearRepeat() {
    if (repeatTimer.current != null) {
      window.clearTimeout(repeatTimer.current);
      repeatTimer.current = null;
    }
  }

  function step(dir: 1 | -1) {
    const p = propsRef.current;
    p.onChange(
      dir > 0
        ? Math.min(p.max, p.value + p.step)
        : Math.max(p.min, p.value - p.step),
    );
  }

  function scheduleRepeat(dir: 1 | -1) {
    const ramp = Math.min(
      1,
      (nowMs() - holdStart.current) / STEP_REPEAT_RAMP_MS,
    );
    const interval =
      STEP_REPEAT_START_MS - ramp * (STEP_REPEAT_START_MS - STEP_REPEAT_MIN_MS);
    repeatTimer.current = window.setTimeout(() => {
      step(dir);
      scheduleRepeat(dir);
    }, interval);
  }

  function onHoldStart(dir: 1 | -1) {
    justRepeatedRef.current = false;
    holdStart.current = nowMs();
    repeatTimer.current = window.setTimeout(() => {
      justRepeatedRef.current = true; // swallow the click that follows a completed hold
      step(dir);
      scheduleRepeat(dir);
    }, STEP_REPEAT_DELAY_MS);
  }

  function onClick(dir: 1 | -1) {
    if (justRepeatedRef.current) {
      justRepeatedRef.current = false;
      return;
    }
    step(dir);
  }

  return (
    <div className="stepper">
      <button
        aria-label={`${props.label} −`}
        onPointerDown={() => onHoldStart(-1)}
        onPointerUp={clearRepeat}
        onPointerLeave={clearRepeat}
        onPointerCancel={clearRepeat}
        onClick={() => onClick(-1)}
      >
        −
      </button>
      <div className="stepper-value">
        <span className="stepper-label">{props.label}</span>
        <span className="stepper-num">{props.display}</span>
      </div>
      <button
        aria-label={`${props.label} +`}
        onPointerDown={() => onHoldStart(1)}
        onPointerUp={clearRepeat}
        onPointerLeave={clearRepeat}
        onPointerCancel={clearRepeat}
        onClick={() => onClick(1)}
      >
        +
      </button>
    </div>
  );
}

// The chamber picks up the shared phase (animStart) at mount via a negative delay,
// so a freshly-opened focus chamber continues the card's phase (never restarts).
export function Chamber({
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

// Audio/haptic pacing toggles — shared by the focus overlay and the active-
// drips list, which otherwise carried two copies of the same pair of
// checkboxes to keep in sync by hand.
export function PaceToggles({
  audio,
  haptic,
  onAudioChange,
  onHapticChange,
  onClick,
}: {
  audio: boolean;
  haptic: boolean;
  onAudioChange: (v: boolean) => void;
  onHapticChange: (v: boolean) => void;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="toggles" onClick={onClick}>
      <label>
        <input
          type="checkbox"
          checked={audio}
          onChange={(e) => onAudioChange(e.target.checked)}
        />{" "}
        Звук
      </label>
      <label>
        <input
          type="checkbox"
          checked={haptic}
          onChange={(e) => onHapticChange(e.target.checked)}
        />{" "}
        Вібрація
      </label>
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

export function SilenceToggle({
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
