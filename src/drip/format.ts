// Small formatting/time helpers shared by the drip UI. Extracted from
// DripScreen.tsx (2026-07-24) — it had grown to ~1480 lines, over half the
// app in one file, which made every change slower to review than it needed
// to be. Pure functions, no React, no side effects.

export const nowMs = (): number =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

export function fmtHours(h: number): string {
  if (!isFinite(h) || h <= 0) return "—";
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return hh > 0 ? `${hh} год ${mm} хв` : `${mm} хв`;
}

export function fmtHM(h: number): string {
  if (!isFinite(h) || h <= 0) return "—";
  const totalMin = Math.round(h * 60);
  return `${Math.floor(totalMin / 60)}:${String(totalMin % 60).padStart(2, "0")}`;
}

export function dur(gtt: number): string {
  return `${(60 / Math.max(1, gtt)).toFixed(2)}s`;
}

// Distinct, escalating alarm feel so a medic can tell the stage apart without
