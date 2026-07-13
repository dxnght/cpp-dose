// `npm run validate` — JSON-Schema-validate the clinical protocol file and check
// referential integrity. Spec 005 AC-1/AC-6. Fails the build on any error.
import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { loadProtocol, PROTOCOL_PATH, SCHEMA_PATH } from "./lib.mjs";

const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
const protocol = loadProtocol();

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const errors = [];

if (!validate(protocol)) {
  for (const e of validate.errors ?? []) {
    errors.push(`schema: ${e.instancePath || "/"} ${e.message}`);
  }
}

// Referential integrity — the schema cannot express these (data-model.md § Relationships).
const sourceIds = new Set(protocol.sources.map((s) => s.id));
const drugIds = new Set(protocol.drugs.map((d) => d.id));

const checkSourceRef = (rec, kind) => {
  if (!sourceIds.has(rec.source_document)) {
    errors.push(`ref: ${kind} ${rec.id} → unknown source_document '${rec.source_document}'`);
  }
};
for (const d of protocol.drugs) checkSourceRef(d, "drug");
for (const f of protocol.formulas) checkSourceRef(f, "formula");
for (const p of protocol.antibiotic_prophylaxis) {
  checkSourceRef(p, "prophylaxis");
  for (const id of [...(p.drug_of_choice ?? []), ...(p.alternative ?? [])]) {
    if (!drugIds.has(id)) errors.push(`ref: prophylaxis ${p.id} → unknown drug id '${id}'`);
  }
}

if (errors.length) {
  console.error(`✗ validate FAILED (${errors.length} error(s)) for ${PROTOCOL_PATH}\n`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}

console.log(
  `✓ validate OK — ${protocol.drugs.length} drugs, ` +
    `${protocol.antibiotic_prophylaxis.length} prophylaxis regimens, ` +
    `${protocol.formulas.length} formulas, ${protocol.sources.length} sources.`,
);
