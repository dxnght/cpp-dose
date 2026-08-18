// Focus-mode overlay for a single drip. Extracted from DripScreen.tsx
// (2026-08-18) to get the main file back under control; behaviour unchanged.
import { Chamber, PaceToggles } from "./components";
import { SourceBadge } from "../components/SourceBadge";
import type { ActiveDrip } from "./types";

export function FocusOverlay({
  drip,
  activeId,
  audio,
  haptic,
  onAudioChange,
  onHapticChange,
  onClose,
  onDisplayTagChange,
  onRetitrate,
  onTogglePacing,
  remaining,
  alarmStage,
}: {
  drip: ActiveDrip;
  activeId: string | null;
  audio: boolean;
  haptic: boolean;
  onAudioChange: (v: boolean) => void;
  onHapticChange: (v: boolean) => void;
  onClose: () => void;
  onDisplayTagChange: (id: string, val: string) => void;
  onRetitrate: (id: string, delta: number) => void;
  onTogglePacing: (id: string) => void;
  remaining: (d: ActiveDrip) => string;
  alarmStage: (d: ActiveDrip) => "" | "warn10" | "warn5" | "empty";
}) {
  return (
    <div
      className="focus-overlay"
      role="dialog"
      aria-label="фокус-режим"
      onClick={onClose}
    >
      <div className="focus-label">{drip.label}</div>
      <input
        type="text"
        className="focus-tag"
        value={drip.displayTag ?? ""}
        onChange={(e) => onDisplayTagChange(drip.id, e.target.value)}
        onClick={(e) => e.stopPropagation()}
        placeholder="мітка (напр. ліжко 3) — необов'язково"
        aria-label="мітка дріпу, лише на цьому екрані"
        maxLength={40}
      />
      <div className="focus-retit" onClick={(e) => e.stopPropagation()}>
        <button
          aria-label="повільніше"
          onClick={() => onRetitrate(drip.id, -1)}
        >
          −
        </button>
        <div className="focus-gtt">
          {drip.gtt}
          <span> кр/хв</span>
        </div>
        <button aria-label="швидше" onClick={() => onRetitrate(drip.id, 1)}>
          +
        </button>
      </div>
      <div className="focus-chamber-scale">
        <Chamber
          gtt={drip.gtt}
          animStart={drip.animStart}
          muted={drip.id !== activeId}
        />
      </div>
      <div className={`focus-rem ${alarmStage(drip)}`}>
        Залишок: {remaining(drip)}
      </div>
      {drip.sourceRecord && (
        <div onClick={(e) => e.stopPropagation()}>
          <SourceBadge record={drip.sourceRecord} compact />
        </div>
      )}
      <button
        className={`focus-pace${drip.id === activeId ? " on" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePacing(drip.id);
        }}
      >
        {drip.id === activeId ? "◼ Метроном" : "▶ Метроном"}
      </button>
      {drip.id === activeId && (
        <PaceToggles
          audio={audio}
          haptic={haptic}
          onAudioChange={onAudioChange}
          onHapticChange={onHapticChange}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <div className="focus-hint">Торкніться фону, щоб вийти</div>
    </div>
  );
}
