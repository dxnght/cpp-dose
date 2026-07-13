// Fail-closed guard (Constitution Art. III, Spec 005 AC-4). Rendering a
// non-VERIFIED clinical record in field mode must be unreachable — it throws.
import type { ClinicalRecord, Formula } from "./types";

const VERIFIED_RE = /^VERIFIED:[^:]+:\d{4}-\d{2}-\d{2}$/;

export function isVerified(status: string): boolean {
  return VERIFIED_RE.test(status);
}

function isEngineeringFormula(rec: ClinicalRecord): rec is Formula {
  return "kind" in rec && (rec as Formula).kind === "engineering";
}

/**
 * A record may be rendered in field mode iff it is VERIFIED, or it is a
 * deterministic engineering formula (exempt from clinical verification).
 */
export function isRenderable(rec: ClinicalRecord): boolean {
  return isEngineeringFormula(rec) || isVerified(rec.review_status);
}

/** Throws if a caller attempts to render a non-renderable record. */
export function assertRenderable(rec: ClinicalRecord): ClinicalRecord {
  if (!isRenderable(rec)) {
    throw new Error(
      `Refused to render non-VERIFIED clinical record '${(rec as { id: string }).id}' ` +
        `(review_status=${rec.review_status}). Fail closed — Constitution Art. III.`,
    );
  }
  return rec;
}
