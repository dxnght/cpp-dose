// PROTOTYPE — active-drips density exploration, throwaway (see NOTES.md in
// this folder). Not wired into production; only reachable via DripScreen's
// dev-only ?variant= switch. Delete this whole folder once a direction is
// picked and folded into DripCard.tsx.
//
// Variant B — "Manual compact toggle." A "Детально/Компактно" segmented
// control in the "Активні дріпи" section header (DripScreen.tsx, dev-only)
// switches every card at once, including the paced one — the medic decides
// the density, the app doesn't guess it from state.
import { SilenceToggle } from "../components";
import { DripCard } from "../DripCard";
import { DripScreenProps } from "../types";

export function VariantB(props: DripScreenProps & { compact: boolean }) {
  const { drip: d, isActive, confirmId, remaining, quietHint, alarmStage, onConfirm, onEnterFocus, onTogglePacing, onRemoveClick, onSetSilenced, compact } = props;

  if (!compact) return <DripCard {...props} />;

  const stage = alarmStage(d);
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
