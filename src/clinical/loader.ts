// The single entry point for clinical data in field mode. It imports the
// compiled, verified-only bundle at build time (bundled by Vite) — there is no
// runtime fetch and no path to the authoring file (Constitution Art. III/V).
import bundleJson from "./field-bundle.json";
import type { FieldBundle } from "./types";

export const fieldBundle = bundleJson as FieldBundle;

/** True when the bundle carries no verified clinical content (seed / fail-closed). */
export function hasNoVerifiedClinicalContent(bundle: FieldBundle = fieldBundle): boolean {
  const clinicalFormulas = bundle.formulas.filter((f) => f.kind !== "engineering");
  return bundle.drugs.length === 0 && bundle.antibiotic_prophylaxis.length === 0 && clinicalFormulas.length === 0;
}
