// `npm run compile:field` — build the field bundle the app loads in field mode.
// Only VERIFIED + archived clinical records + engineering formulas (Spec 005 FR-3,
// plan/data-model.md § Field-bundle projection). Fail-closed by construction.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { loadProtocol, compileFieldBundle, FIELD_BUNDLE_PATH } from "./lib.mjs";

const protocol = loadProtocol();
const { bundle, included, excluded } = compileFieldBundle(protocol);

mkdirSync(dirname(FIELD_BUNDLE_PATH), { recursive: true });
writeFileSync(FIELD_BUNDLE_PATH, JSON.stringify(bundle, null, 2) + "\n");

const clinicalCount = included.drugs.length + included.prophylaxis.length + included.formulas.filter((f) => f.kind !== "engineering").length;

console.log(`✓ compile:field → ${FIELD_BUNDLE_PATH}`);
console.log(
  `  included: ${included.drugs.length} drugs, ${included.prophylaxis.length} prophylaxis, ` +
    `${included.formulas.length} formulas (of which ${clinicalCount} clinical).`,
);
console.log(`  excluded: ${excluded.length} record(s) (not VERIFIED / not archived).`);
if (clinicalCount === 0) {
  console.log('  NOTE: zero verified clinical records → app shows the "no verified content" state (AC-0.2 / SC-4).');
}
