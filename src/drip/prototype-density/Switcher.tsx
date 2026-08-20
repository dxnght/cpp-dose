// PROTOTYPE — active-drips density exploration, throwaway. Floating variant
// switcher, dev-only. Delete this whole folder once a direction is picked.
import { useEffect } from "react";

const VARIANTS = [
  { key: "A", name: "Active stays rich, others slim" },
  { key: "B", name: "Manual compact toggle" },
  { key: "C", name: "Scales with count" },
] as const;

export type VariantKey = (typeof VARIANTS)[number]["key"];

export function getVariantFromUrl(): VariantKey {
  const v = new URLSearchParams(window.location.search).get("variant");
  return (VARIANTS.find((x) => x.key === v)?.key ?? "A") as VariantKey;
}

export function ProtoDensitySwitcher({
  current,
  onChange,
}: {
  current: VariantKey;
  onChange: (v: VariantKey) => void;
}) {
  function set(v: VariantKey) {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", v);
    window.history.replaceState(null, "", url);
    onChange(v);
  }
  function cycle(dir: 1 | -1) {
    const i = VARIANTS.findIndex((x) => x.key === current);
    set(VARIANTS[(i + dir + VARIANTS.length) % VARIANTS.length].key);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))
        return;
      if (e.key === "ArrowLeft") cycle(-1);
      if (e.key === "ArrowRight") cycle(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const name = VARIANTS.find((x) => x.key === current)?.name ?? "";
  return (
    <div className="proto-switcher">
      <button onClick={() => cycle(-1)} aria-label="Попередній варіант">
        ←
      </button>
      <span>
        {current} — {name}
      </span>
      <button onClick={() => cycle(1)} aria-label="Наступний варіант">
        →
      </button>
    </div>
  );
}
