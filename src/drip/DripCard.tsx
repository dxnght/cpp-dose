// Single active-drip card in the "Активні дріпи" list. Extracted from
// DripScreen.tsx (2026-08-18) to get the main file back under control;
// behaviour unchanged. Density split added 2026-08-20 (Owner decision,
// density prototype Variant A): only the drip currently being paced needs
// the full card below; every other drip renders as a collapsed row instead.
import { Chamber, SilenceToggle } from "./components";
import { SourceBadge } from "../components/SourceBadge";
import { DripScreenProps } from "./types";

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
}: DripScreenProps) {
  const stage = alarmStage(d);

  if (!isActive) {
    return (
      <article
        className={`drip-row-card${stage ? ` ${stage}` : ""}${d.unconfirmed ? " unconfirmed" : ""}`}
      >
        {d.unconfirmed && (
          <button className="drip-confirm" onClick={() => onConfirm(d.id)}>
            ⟳ Відновлено після перезапуску — підтвердь, що ще крапає
          </button>
        )}
        <div
          className="drip-row-tap"
          onClick={() => onEnterFocus(d.id)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <span
            className={`drip-row-dot${stage ? ` ${stage}` : ""}`}
            aria-hidden="true"
          />
          <span className="drip-row-name">
            {d.label}
            {d.displayTag && (
              <span className="drip-tag"> · {d.displayTag}</span>
            )}
          </span>
          <span className="drip-row-gtt">
            {d.gtt}
            <span> кр/хв</span>
          </span>
          <span className="drip-row-rem">{remaining(d)}</span>
          <button
            className="drip-row-icon"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePacing(d.id);
            }}
            aria-label="Метроном"
          >
            ▶
          </button>
          <button
            className={`drip-row-icon${confirmId === d.id ? " danger" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemoveClick(d.id);
            }}
            aria-label="Прибрати"
          >
            {confirmId === d.id ? "!" : "×"}
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

  return (
    <article
      className={`drip-card active${stage ? ` ${stage}` : ""}${d.unconfirmed ? " unconfirmed" : ""}`}
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
        <Chamber gtt={d.gtt} animStart={d.animStart} />
        <div className="drip-mini-meta">
          {d.dropFactor} gtt/ml · {d.mlPerH.toFixed(0)} мл/год · {remaining(d)}
        </div>
        <div className="tap-hint">Тап — на весь екран</div>
        {d.sourceRecord && <SourceBadge record={d.sourceRecord} compact />}
      </div>
      <div className="drip-actions">
        <button className="on" onClick={() => onTogglePacing(d.id)}>
          ◼ Метроном
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
