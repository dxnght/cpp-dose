// Full disclaimer shown on first launch and reachable from every screen
// (Constitution Art. IV.2). Uses the bundle's authoritative Ukrainian text.
import { t } from "../i18n";
import { fieldBundle } from "../clinical/loader";

export function FirstRunDisclaimer({ onAcknowledge }: { onAcknowledge: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t("disclaimer.title")}>
      <div className="modal">
        <h1>{t("disclaimer.title")}</h1>
        <p>{fieldBundle.meta.disclaimer_uk}</p>
        <button className="primary" onClick={onAcknowledge} autoFocus>
          {t("disclaimer.acknowledge")}
        </button>
      </div>
    </div>
  );
}
