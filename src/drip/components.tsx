// Presentational pieces of the drip screen. Extracted from DripScreen.tsx
// (2026-07-24) to get the main file back under control; behaviour unchanged,
// covered by the existing suite.
import { useRef, useState } from "react";
import { dur, nowMs } from "./format";

export function Stepper(props: {
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
