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
      <button onClick={onOpenDisclaimer}>{t("nav.disclaimer")}</button>
    </nav>
  );
}
