// `npm run gate:release` — the release gate (ADR-0004, Spec 005). Fails a field
// build if the compiled bundle would expose ANY record that is not fully
// verified + archived, or if any included content still contains a `TODO(` marker.
import { loadProtocol, compileFieldBundle, isVerified, isArchivedSource } from "./lib.mjs";

const protocol = loadProtocol();
const { bundle } = compileFieldBundle(protocol);
const sourceById = new Map(bundle.sources.map((s) => [s.id, s]));

const violations = [];

// 1. Every clinical record exposed in the bundle must be VERIFIED + archived.
const checkClinical = (rec, kind) => {
  if (!isVerified(rec.review_status)) violations.push(`${kind} ${rec.id} exposed but review_status=${rec.review_status}`);
  if (!isArchivedSource(sourceById.get(rec.source_document)))
    violations.push(`${kind} ${rec.id} exposed but source ${rec.source_document} is not archived`);
};
for (const d of bundle.drugs) checkClinical(d, "drug");
for (const p of bundle.antibiotic_prophylaxis) checkClinical(p, "prophylaxis");
for (const f of bundle.formulas) if (f.kind !== "engineering") checkClinical(f, "formula");

// 2. No `TODO(` marker may survive anywhere in the shipped bundle.
const serialized = JSON.stringify(bundle);
if (serialized.includes("TODO(")) {
  const hits = [...serialized.matchAll(/TODO\([^)]*\)/g)].map((m) => m[0]);
  violations.push(`bundle still contains TODO marker(s): ${[...new Set(hits)].join(", ")}`);
}

const clinicalExposed =
  bundle.drugs.length + bundle.antibiotic_prophylaxis.length + bundle.formulas.filter((f) => f.kind !== "engineering").length;

if (violations.length) {
  console.error(`✗ gate:release FAILED (${violations.length} violation(s)):\n`);
  for (const v of violations) console.error("  - " + v);
  process.exit(1);
}

console.log("✓ gate:release PASSED — no unverified/un-archived record and no TODO() is exposed.");
console.log(`  bundle exposes ${clinicalExposed} clinical record(s) + ${bundle.formulas.filter((f) => f.kind === "engineering").length} engineering formula(s).`);
