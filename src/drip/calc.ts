// Deterministic drip arithmetic (engineering — Spec 001 FR-1/3a; formulas
// `drip_rate` and `dose_rate_to_gtt`). No clinical value is originated here:
// concentration and dose come from a VERIFIED record or explicit medic input;
// this module only does the math.

export const DROP_FACTORS = [10, 15, 20] as const;

export interface Clamp {
  min: number;
  max: number;
}
export const WEIGHT: Clamp = { min: 30, max: 150 }; // kg
export const DOSE: Clamp = { min: 0.1, max: 2 }; // mg/kg/h
export const DROP_FACTOR: Clamp = { min: 1, max: 100 }; // gtt/ml
export const VOLUME: Clamp = { min: 1, max: 1000 }; // ml
export const TIME_MIN: Clamp = { min: 1, max: 24 * 60 }; // minutes

export function clamp(v: number, c: Clamp): number {
  return Math.min(c.max, Math.max(c.min, v));
}

/** Weight-based infusion → ml/h (dose_rate_to_gtt, step 1). */
export function doseToMlPerH(doseMgPerKgPerH: number, weightKg: number, concMgPerMl: number): number {
  if (concMgPerMl <= 0) return NaN;
  return (doseMgPerKgPerH * weightKg) / concMgPerMl;
}

/** ml/h → drops per minute (float; round only for display). */
export function mlPerHToGtt(mlPerH: number, dropFactor: number): number {
  return (mlPerH * dropFactor) / 60;
}

/** Classic gravity drip (`drip_rate`): volume/time × drop factor → whole drops. */
export function volumeTimeToGtt(volumeMl: number, timeMin: number, dropFactor: number): number {
  if (timeMin <= 0) return NaN;
  return Math.round((volumeMl / timeMin) * dropFactor);
}

/** Seconds between drops (for slow-drip pacing, "1 drop / X s"). */
export function secPerDrop(gttPerMin: number): number {
  if (gttPerMin <= 0) return Infinity;
  return 60 / gttPerMin;
}

/** Hours for a bag to empty at a given rate. */
export function bagRunHours(volumeMl: number, mlPerH: number): number {
  if (mlPerH <= 0) return Infinity;
  return volumeMl / mlPerH;
}

/** Extract a leading "N mg/ml" concentration from a record's free-text string. */
export function parseConcentrationMgPerMl(s?: string): number | null {
  if (!s) return null;
  const m = s.match(/([\d.]+)\s*mg\s*\/\s*ml/i);
  return m ? Number(m[1]) : null;
}
