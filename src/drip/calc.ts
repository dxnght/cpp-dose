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
// min=50 (not 1) so the ±50 ml stepper always lands on round multiples of 50
// (50, 100, 150…1000). A min of 1 let the stepper's floor clamp to 1, then
// climbing back up produced off-grid values (51, 101, 151…) — Owner-reported
// 2026-07-21. 50 ml also matches the smallest real IV mini-bag size.
export const VOLUME: Clamp = { min: 50, max: 1000 }; // ml
export const TIME_MIN: Clamp = { min: 1, max: 24 * 60 }; // minutes
// Manual-entry bound for the "Інший препарат" dose-mode option (no VERIFIED
// record, so no concentration to read — the medic types their own bag's).
// Engineering UI bound like the clamps above, not a clinical range.
export const CONC: Clamp = { min: 0.1, max: 100 }; // mg/ml

export function clamp(v: number, c: Clamp): number {
  return Math.min(c.max, Math.max(c.min, v));
}

/** Weight-based infusion → ml/h (dose_rate_to_gtt, step 1). */
export function doseToMlPerH(
  doseMgPerKgPerH: number,
  weightKg: number,
  concMgPerMl: number,
): number {
  if (concMgPerMl <= 0) return NaN;
  return (doseMgPerKgPerH * weightKg) / concMgPerMl;
}

/** ml/h → drops per minute (float; round only for display). */
export function mlPerHToGtt(mlPerH: number, dropFactor: number): number {
  return (mlPerH * dropFactor) / 60;
}

/** Classic gravity drip (`drip_rate`): volume/time × drop factor → whole drops. */
export function volumeTimeToGtt(
  volumeMl: number,
  timeMin: number,
  dropFactor: number,
): number {
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

/**
 * Re-anchor a running drip's `startedAt` after its rate changes (retitration
 * in Focus mode), so the existing `startedAt + bagRunHours(bagMl, mlPerH) *
 * 3600_000` end-time formula — used everywhere: in-app alarms, the OS
 * notification reschedule, `remaining()`, `quietHint()` — keeps landing on
 * the true remaining-volume end time.
 *
 * Retitration only ever changes the rate; `bagMl` (the original bag size)
 * and the formula above stay untouched. Without re-anchoring `startedAt`,
 * that formula silently re-ran the WHOLE original bag at the NEW rate from
 * the ORIGINAL start — e.g. dropping a 500 ml/200 ml-h bag to 100 ml/h an
 * hour in computed an end time a full hour after the bag actually runs dry
 * (bug found in code review 2026-08-01).
 *
 * Solving `startedAt' + bagMl/newRate = now + (bagMl - infused)/newRate` for
 * `startedAt'`, where `infused = (now - startedAt) * oldRate`, cancels
 * `bagMl` out entirely: the new anchor only needs how much time has elapsed
 * at the OLD rate, scaled by how much the rate just changed. That also makes
 * this correct across repeated retitrations — each call re-anchors from
 * whatever the previous call (or the original creation) left behind.
 */
export function retitratedStartedAt(
  startedAt: number,
  oldMlPerH: number,
  newMlPerH: number,
  now: number,
): number {
  // Clamp to 0 (code review 2026-08-02): a backward device-clock jump
  // between the drip's last anchor and this call would otherwise make
  // `now - startedAt` negative, pushing the new anchor into the future.
  // deserializeDrips() rejects any persisted startedAt > now, so that drip
  // would vanish entirely on the next restart instead of just showing a
  // temporarily wrong remaining time.
  const elapsed = Math.max(0, now - startedAt);
  return now - elapsed * (oldMlPerH / newMlPerH);
}

/** Absolute epoch-ms a bag started at `startedAt` and running at `mlPerH`
 * will run dry. The single source for this formula — used at drip creation,
 * restore, retitration, the OS-notification reschedule, and both in-app
 * remaining-time displays — so it can't drift out of sync between them
 * (code review 2026-08-02). Callers own their own "no bag timer"/"rate not
 * positive" guard, since what that case means differs by call site
 * (Infinity vs. null vs. "—"). */
export function dripEndsAt(
  startedAt: number,
  bagMl: number,
  mlPerH: number,
): number {
  return startedAt + bagRunHours(bagMl, mlPerH) * 3600_000;
}

/**
 * Whether a bag's total run time is already at/under a pre-end warning
 * threshold from the moment it starts — i.e. there is no point during this
 * drip where "more than N ms remain" was ever true, so crossing down
 * through N isn't a real event and shouldn't fire that stage's alarm.
 *
 * Owner report (2026-07-24): adding an 8-minute drip immediately screamed
 * "10 min left" the instant it was created, because remaining time started
 * out already below the 10-min threshold — nothing was actually crossed,
 * the bag was just always going to be short, which the medic already
 * knows. Used to seed `warned10`/`warned5` at drip creation instead of
 * always `false`, so only thresholds a drip could genuinely cross ever
 * fire.
 *
 * `bagMl === null` means no bag timer at all (dose-mode drip with no
 * countdown) — neither stage applies, so both come back `false` (moot;
 * the caller never checks them for a drip with no bag timer).
 */
export function preSatisfiedAlarmStages(
  bagMl: number | null,
  mlPerH: number,
  warn10Ms: number,
  warn5Ms: number,
): { warned10: boolean; warned5: boolean } {
  if (bagMl == null || mlPerH <= 0) {
    return { warned10: false, warned5: false };
  }
  const totalMs = bagRunHours(bagMl, mlPerH) * 3600_000;
  return {
    warned10: totalMs <= warn10Ms,
    warned5: totalMs <= warn5Ms,
  };
}

/** Extract a leading "N mg/ml" concentration from a record's free-text string. */
export function parseConcentrationMgPerMl(s?: string): number | null {
  if (!s) return null;
  const m = s.match(/([\d.]+)\s*mg\s*\/\s*ml/i);
  return m ? Number(m[1]) : null;
}

/** Burn initial fluid rate — TCCC/USAISR Rule of Ten. Clinical: the caller must
    gate display on the VERIFIED `burn_rule_of_ten` record being present. */
export function burnRuleOfTenMlPerH(tbsaPct: number, weightKg: number): number {
  // Owner rule (2026-07): round weight to the nearest 10 kg for the +100 step —
  // 80-84 kg add nothing; 85+ rounds up (85-94 -> +100, 95-104 -> +200).
  let r = tbsaPct * 10;
  if (weightKg > 80) r += 100 * Math.round((weightKg - 80) / 10);
  return r;
}

/** Weight-scale a "0.2-0.3 mg/kg"/"0.2-0.3 мг/кг" or "1 mg/kg"/"1 мг/кг" bolus
    string to a mg (range). Matches both unit scripts (2026-08-17: dose_per_kg
    is now stored translated, mg/kg -> мг/кг, with the Latin original kept in
    dose_per_kg_en) so this keeps working on either. */
export function doseRangeMg(
  dosePerKg: string,
  weightKg: number,
): string | null {
  const range = dosePerKg.match(
    /([\d.]+)\s*(?:-|–|to)\s*([\d.]+)\s*(?:mg|мг)\s*\/\s*(?:kg|кг)/i,
  );
  if (range)
    return `${Math.round(Number(range[1]) * weightKg)}–${Math.round(Number(range[2]) * weightKg)} мг`;
  const single = dosePerKg.match(/([\d.]+)\s*(?:mg|мг)\s*\/\s*(?:kg|кг)/i);
  if (single) return `${Math.round(Number(single[1]) * weightKg)} мг`;
  return null;
}
