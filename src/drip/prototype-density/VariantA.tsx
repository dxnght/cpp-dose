// PROTOTYPE — active-drips density exploration, throwaway (see NOTES.md in
// this folder). Not wired into production; only reachable via DripScreen's
// dev-only ?variant= switch. Delete this whole folder once a direction is
// picked and folded into DripCard.tsx.
//
// Variant A — "Active stays rich, others go slim." Density follows which
// drip is currently paced (isActive): the paced drip keeps today's full
// DripCard unchanged; every other drip collapses into one card (2026-08-20
// feedback: row + SilenceToggle used to be two separately-bordered
// siblings — now one bordered .proto-row-card, same shape as DripCard's own
// banner/tap/silence structure, just shorter). No manual control — density
// is a side effect of state that already exists.
import { SilenceToggle } from "../components";
import { DripCard } from "../DripCard";
import { DripScreenProps } from "../types";

export function VariantA(props: DripScreenProps) {
  const { drip: d, isActive, confirmId, remaining, quietHint, alarmStage, onConfirm, onEnterFocus, onTogglePacing, onRemoveClick, onSetSilenced } = props;

  if (isActive) return <DripCard {...props} />;

  const stage = alarmStage(d);
  return (
    <article
      className={`proto-row-card${stage ? ` ${stage}` : ""}${d.unconfirmed ? " unconfirmed" : ""}`}
    >
      {d.unconfirmed && (
        <button className="drip-confirm" onClick={() => onConfirm(d.id)}>
          ⟳ Відновлено після перезапуску — підтвердь, що ще крапає
        </button>
      )}
      <div className="proto-row-tap" onClick={() => onEnterFocus(d.id)}>
        <span className={`proto-row-dot${stage ? ` ${stage}` : ""}`} aria-hidden="true" />
        <span className="proto-row-name">
          {d.label}
          {d.displayTag && <span className="drip-tag"> · {d.displayTag}</span>}
        </span>
        <span className="proto-row-gtt">
          {d.gtt}
          <span> кр/хв</span>
        </span>
        <span className="proto-row-rem">{remaining(d)}</span>
        <button
          className="proto-row-icon"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePacing(d.id);
          }}
          aria-label="Метроном"
        >
          ▶
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
