// PROTOTYPE — active-drips density exploration, throwaway (see NOTES.md in
// this folder). Not wired into production; only reachable via DripScreen's
// dev-only ?variant= switch. Delete this whole folder once a direction is
// picked and folded into DripCard.tsx.
//
// Variant C — "Density scales with count." No manual control and no
// dependence on isActive — the tier is purely a function of how many drips
// are running: 1 → today's full card, 2 → a trimmed card (loses the chamber
// animation/tap-hint/badge, keeps actions), 3+ → every card (including the
// paced one) becomes a slim row, with the paced one picked out by a thicker
// accent border instead of a size difference.
import { Chamber, SilenceToggle } from "../components";
import { DripCard } from "../DripCard";
import { DripScreenProps } from "../types";

export function VariantC(props: DripScreenProps & { total: number }) {
  const { drip: d, isActive, confirmId, remaining, quietHint, alarmStage, onConfirm, onEnterFocus, onTogglePacing, onRemoveClick, onSetSilenced, total } = props;

  if (total <= 1) return <DripCard {...props} />;

  const stage = alarmStage(d);

  if (total === 2) {
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
              {d.displayTag && <span className="drip-tag"> · {d.displayTag}</span>}
            </span>
            <span className="expand" aria-hidden="true">⤢</span>
          </div>
          <div className="proto-medium-row">
            <span className="proto-row-gtt proto-medium-gtt">
              {d.gtt}
              <span> кр/хв</span>
            </span>
            <span className="proto-medium-meta">
              {d.dropFactor} gtt/ml · {d.mlPerH.toFixed(0)} мл/год · {remaining(d)}
            </span>
          </div>
        </div>
        <div className="drip-actions">
          <button className={isActive ? "on" : ""} onClick={() => onTogglePacing(d.id)}>
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

  // total >= 3 — everyone's a row, the paced one just gets a louder accent.
  return (
    <>
      {d.unconfirmed && (
        <button className="drip-confirm" onClick={() => onConfirm(d.id)}>
          ⟳ Відновлено після перезапуску — підтвердь, що ще крапає
        </button>
      )}
      <article
        className={`proto-strip${isActive ? " active" : ""}${stage ? ` ${stage}` : ""}${d.unconfirmed ? " unconfirmed" : ""}`}
        onClick={() => onEnterFocus(d.id)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="proto-chamber-mini">
          <Chamber gtt={d.gtt} animStart={d.animStart} muted={!isActive} />
        </div>
        <div className="proto-strip-main">
          <div className="proto-strip-name">
            {d.label}
            {d.displayTag && <span className="drip-tag"> · {d.displayTag}</span>}
          </div>
          <div className="proto-strip-sub">
            {d.gtt} кр/хв · {remaining(d)}
          </div>
        </div>
        <div className="proto-strip-actions">
          <button
            className={`proto-row-icon${isActive ? " on" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePacing(d.id);
            }}
            aria-label="Метроном"
          >
            {isActive ? "◼" : "▶"}
          </button>
          <button
            className={`proto-row-icon${confirmId === d.id ? " danger" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemoveClick(d.id);
            }}
            aria-label="Прибрати"
          >
            {confirmId === d.id ? "!" : "×"}
          </button>
        </div>
      </article>
      {d.bagMl != null && (
        <SilenceToggle
          silenced={d.silenced}
          hint={quietHint(d)}
          onSetSilenced={(v) => onSetSilenced(d.id, v)}
        />
      )}
    </>
  );
}
