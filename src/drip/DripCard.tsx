// Single active-drip card in the "Активні дріпи" list. Extracted from
// DripScreen.tsx (2026-08-18) to get the main file back under control;
// behaviour unchanged.
import { Chamber, SilenceToggle } from "./components";
import { SourceBadge } from "../components/SourceBadge";
import type { ActiveDrip } from "./types";

export function DripCard({
  drip: d,
  isActive,
  confirmId,
  remaining,
  quietHint,
  alarmStage,
  onConfirm,
  onEnterFocus,
  onTogglePacing,
  onRemoveClick,
  onSetSilenced,
}: {
  drip: ActiveDrip;
  isActive: boolean;
  confirmId: string | null;
  remaining: (d: ActiveDrip) => string;
  quietHint: (d: ActiveDrip) => string | null;
  alarmStage: (d: ActiveDrip) => "" | "warn10" | "warn5" | "empty";
  onConfirm: (id: string) => void;
  onEnterFocus: (id: string) => void;
  onTogglePacing: (id: string) => void;
  onRemoveClick: (id: string) => void;
  onSetSilenced: (id: string, val: boolean) => void;
}) {
  const stage = alarmStage(d);
  return (
    <article
      className={`drip-card${isActive ? " active" : ""}${stage ? ` ${stage}` : ""}${d.unconfirmed ? " unconfirmed" : ""}`}
    >
      {d.unconfirmed && (
        <button className="drip-confirm" onClick={() => onConfirm(d.id)}>
          ⟳ Відновлено після перезапуску — підтвердь, що ще крапає
        </button>
      )}
      <div className="drip-tap" onClick={() => onEnterFocus(d.id)}>
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
        <Chamber gtt={d.gtt} animStart={d.animStart} muted={!isActive} />
        <div className="drip-mini-meta">
          {d.dropFactor} gtt/ml · {d.mlPerH.toFixed(0)} мл/год ·{" "}
          {remaining(d)}
        </div>
        <div className="tap-hint">Тап — на весь екран</div>
        {d.sourceRecord && <SourceBadge record={d.sourceRecord} compact />}
      </div>
      <div className="drip-actions">
        <button
          className={isActive ? "on" : ""}
          onClick={() => onTogglePacing(d.id)}
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
          onSetSilenced={(v) => onSetSilenced(d.id, v)}
        />
      )}
    </article>
  );
}
