// Persistent, always-visible disclaimer banner (Constitution Art. IV.1) with the
// light/dark theme toggle on the right.
import { t } from "../i18n";
import { ThemeToggle } from "./ThemeToggle";

export function DisclaimerBanner() {
  return (
    <div className="disclaimer-banner" role="note" aria-label={t("nav.disclaimer")}>
      <span className="banner-text">⚠ {t("banner.disclaimer")}</span>
      <ThemeToggle />
    </div>
  );
}
