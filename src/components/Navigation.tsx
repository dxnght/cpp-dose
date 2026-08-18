import { t } from "../i18n";
import type { DripBadgeStatus } from "../drip/types";

export type Screen = "drip" | "drugs" | "about";

// 1/2-4/5+ — the only forms MAX_DRIPS (5) can ever produce, not a general
// Ukrainian pluralizer (2026-08-02, active-drip nav badge).
function dripsWord(n: number): string {
  if (n === 1) return "дріп";
  if (n >= 2 && n <= 4) return "дріпи";
  return "дріпів";
}

// Bottom navigation. The disclaimer is reachable from every screen via the
// dedicated button here (Constitution Art. IV.2).
export function Navigation({
  active,
  onNavigate,
  onOpenDisclaimer,
  dripStatus,
}: {
  active: Screen;
  onNavigate: (s: Screen) => void;
  onOpenDisclaimer: () => void;
  // Active-drip count badge on the "Крапельниця" tab (2026-08-02 UX fix) —
  // DripScreen stays mounted-but-hidden across tab navigation, so this is
  // the only remaining signal that a drip is still running while the medic
  // is on Drugs/About. Optional so any other caller/test can render
  // Navigation without wiring it up.
  dripStatus?: DripBadgeStatus;
}) {
  const items: { id: Screen; label: string }[] = [
    { id: "drip", label: t("nav.drip") },
    { id: "drugs", label: t("nav.drugs") },
    { id: "about", label: t("nav.about") },
  ];
  return (
    <nav className="nav" aria-label="main">
      {items.map((it) => {
        const badge = it.id === "drip" ? dripStatus : undefined;
        return (
          <button
            key={it.id}
            aria-current={active === it.id ? "page" : undefined}
            aria-label={
              badge && badge.count > 0
                ? `${it.label} — активних ${dripsWord(badge.count)}: ${badge.count}`
                : undefined
            }
            onClick={() => onNavigate(it.id)}
          >
            {it.label}
            {badge && badge.count > 0 && (
              <span
                className={`nav-badge${badge.stage ? ` ${badge.stage}` : ""}`}
                aria-hidden="true"
              >
                {badge.count}
              </span>
            )}
          </button>
        );
      })}
      {/* Uses the disclaimer.reopen key (kept distinct from nav.disclaimer
          even though both read "Застереження") so wording can diverge again
          later without touching call sites. Shortened from "Показати повне
          застереження" (2026-08-17 UX review — wrapped to 2 lines next to
          the short tab labels). .nav-aux + the ⓘ prefix still mark this as a
          modal trigger rather than a 4th screen tab. */}
      <button
        className="nav-aux"
        aria-label={t("disclaimer.reopen")}
        onClick={onOpenDisclaimer}
      >
        ⓘ {t("disclaimer.reopen")}
      </button>
    </nav>
  );
}
