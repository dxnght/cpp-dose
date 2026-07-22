import { t } from "../i18n";

export type Screen = "drip" | "drugs" | "about";

// Bottom navigation. The disclaimer is reachable from every screen via the
// dedicated button here (Constitution Art. IV.2).
export function Navigation({
  active,
  onNavigate,
  onOpenDisclaimer,
}: {
  active: Screen;
  onNavigate: (s: Screen) => void;
  onOpenDisclaimer: () => void;
}) {
  const items: { id: Screen; label: string }[] = [
    { id: "drip", label: t("nav.drip") },
    { id: "drugs", label: t("nav.drugs") },
    { id: "about", label: t("nav.about") },
  ];
  return (
    <nav className="nav" aria-label="main">
      {items.map((it) => (
        <button
          key={it.id}
          aria-current={active === it.id ? "page" : undefined}
          onClick={() => onNavigate(it.id)}
        >
          {it.label}
        </button>
      ))}
      {/* Uses disclaimer.reopen ("Показати повне застереження"), not
          nav.disclaimer — that string already existed but was unused; it's
          clearer that this button opens a modal rather than switching
          screens (2026-07-22 UX review). .nav-aux gives it a visually
          distinct, quieter treatment from the 3 real tabs for the same
          reason. */}
      <button
        className="nav-aux"
        aria-label={t("nav.disclaimer")}
        onClick={onOpenDisclaimer}
      >
        ⓘ {t("disclaimer.reopen")}
      </button>
    </nav>
  );
}
