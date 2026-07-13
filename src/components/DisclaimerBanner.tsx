// Persistent, always-visible disclaimer banner (Constitution Art. IV.1).
import { t } from "../i18n";

export function DisclaimerBanner() {
  return (
    <div className="disclaimer-banner" role="note" aria-label={t("nav.disclaimer")}>
      ⚠ {t("banner.disclaimer")}
    </div>
  );
}
