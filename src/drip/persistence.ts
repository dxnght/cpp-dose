// Persistence for live drips across an app restart — Spec 001 FR-13/AC-6f
// (Owner decision 2026-07-24).
//
// Why this exists. Until now drips lived only in React state and died with the
// process, while their alarms were armed in Android's AlarmManager and
// survived it (see notifications.ts v6). That mismatch is what the Owner kept
// hitting: an alarm would fire for a drip the app could no longer show, and —
// worse, after the v6 orphan sweep — reopening the app could cancel the
// remaining alarms for a bag that was *physically still running*. Reality
// doesn't forget the bag; the app shouldn't either.
//
// The safety concern that originally argued against persisting (spec §6: "no
// false sense of a still-running countdown") is real and is handled by
// `unconfirmed`, not by throwing the state away: a restored drip comes back
// visibly un-trusted and must be confirmed by the medic before it counts as
// live. Restoring is what keeps the alarm and the state in sync; the
// confirmation is what stops a stale countdown being believed.
//
// What is deliberately NOT persisted:
// - `displayTag` — it may hold a callsign or name. Writing that to disk would
//   change the threat model agreed on 2026-07-24 (in-memory only, gone when
//   the phone is locked/app closed). A restored drip comes back untagged.
// - `sourceRecord` — a full clinical record snapshot; re-resolved from the
//   field bundle at restore time instead of duplicating verified content into
//   mutable storage, which would be a second, unverifiable copy (Art. I/II).
// - `animStart` — a `performance.now()` value, meaningless across processes.

import { bagRunHours, DROP_FACTORS, VOLUME } from "./calc";

/** Shape written to storage. Deliberately a narrow, explicit subset — not a
 * spread of ActiveDrip — so adding a field to ActiveDrip can never silently
 * start persisting it (the `displayTag` rule above depends on that). */
export interface PersistedDrip {
  id: string;
  label: string;
  gtt: number;
  mlPerH: number;
  dropFactor: number;
  bagMl: number | null;
  startedAt: number;
  silenced: boolean;
  /** Record id, so the source badge can be re-resolved from the field bundle
   * without copying the record itself into storage. */
  sourceRecordId: string | null;
}

export const DRIPS_STORAGE_KEY = "cpp-dose.liveDrips.v1";

/**
 * How long after a bag would have finished we still bother restoring it.
 *
 * Engineering/UX judgement, not a clinical value: a bag that ran dry over an
 * hour ago is not something a medic is still watching, and restoring it would
 * just be noise to dismiss on every launch. A bag that finished *recently* is
 * still worth restoring — it comes back in its "empty" state, which is
 * exactly the prompt to swap or reassess. Drips with no bag timer at all
 * (`bagMl === null`) have no end time and are always restored.
 */
export const STALE_AFTER_EMPTY_MS = 60 * 60_000;

/**
 * Field-by-field, deliberately not `JSON.stringify(drips)` directly.
 *
 * TypeScript already stops an `ActiveDrip` (with its `displayTag`) being
 * passed here, but types are erased at runtime: one `as` cast, one loosely
 * typed refactor, and a callsign would quietly start being written to disk.
 * Rebuilding the object explicitly makes the guarantee structural — anything
 * not listed below cannot reach storage, whatever the caller hands over.
 */
export function serializeDrips(drips: PersistedDrip[]): string {
  return JSON.stringify(
    drips.map((d) => ({
      id: d.id,
      label: d.label,
      gtt: d.gtt,
      mlPerH: d.mlPerH,
      dropFactor: d.dropFactor,
      bagMl: d.bagMl,
      startedAt: d.startedAt,
      silenced: d.silenced,
      sourceRecordId: d.sourceRecordId,
    })),
  );
}

/** Bag run time in ms, or null when the drip has no bag timer. */
function endsAt(d: PersistedDrip): number | null {
  if (d.bagMl == null || d.mlPerH <= 0) return null;
  return d.startedAt + bagRunHours(d.bagMl, d.mlPerH) * 3600_000;
}

/**
 * Parse stored drips, dropping anything malformed or long finished.
 *
 * Total-failure tolerant by design: storage can hold anything (a partial
 * write, a value from an older build, a user clearing it mid-session), and a
 * dosing tool must never fail to start because of it. Anything unparseable
 * yields an empty list, exactly as if nothing had been stored.
 */
export function deserializeDrips(
  raw: string | null,
  now: number,
): PersistedDrip[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.filter((d): d is PersistedDrip => {
    if (typeof d !== "object" || d === null) return false;
    const c = d as Record<string, unknown>;
    if (typeof c.id !== "string" || c.id === "") return false;
    if (typeof c.label !== "string") return false;
    if (typeof c.gtt !== "number" || !Number.isFinite(c.gtt)) return false;
    // > 0, not just finite: a live-created drip's rate can never be <= 0
    // (addDrip() only ever runs with live.gtt > 0), and a non-positive rate
    // makes endsAt() below return null, which bypassed the staleness check
    // a few lines down — a corrupt record could restore as a live drip
    // instead of being dropped as long-dead.
    if (
      typeof c.mlPerH !== "number" ||
      !Number.isFinite(c.mlPerH) ||
      c.mlPerH <= 0
    ) {
      return false;
    }
    // Restricted to the same set the drop-factor selector actually offers
    // (calc.ts DROP_FACTORS), not just "positive" — a restored drip
    // shouldn't be able to carry a value the live-creation UI could never
    // produce.
    if (
      typeof c.dropFactor !== "number" ||
      !(DROP_FACTORS as readonly number[]).includes(c.dropFactor)
    ) {
      return false;
    }
    // Same idea for bagMl: within the stepper's clamp range (calc.ts
    // VOLUME), not just finite — `null` (no bag timer) still passes through.
    if (
      c.bagMl !== null &&
      (typeof c.bagMl !== "number" ||
        !Number.isFinite(c.bagMl) ||
        c.bagMl < VOLUME.min ||
        c.bagMl > VOLUME.max)
    ) {
      return false;
    }
    if (
      typeof c.startedAt !== "number" ||
      !Number.isFinite(c.startedAt) ||
      c.startedAt > now
    ) {
      // A start time in the future means a corrupt record or a clock change;
      // either way the countdown derived from it would be nonsense.
      return false;
    }
    if (typeof c.silenced !== "boolean") return false;
    if (c.sourceRecordId !== null && typeof c.sourceRecordId !== "string") {
      return false;
    }

    const end = endsAt(c as unknown as PersistedDrip);
    if (end != null && now - end > STALE_AFTER_EMPTY_MS) return false;
    return true;
  });
}
