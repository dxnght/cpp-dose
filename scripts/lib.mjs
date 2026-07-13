// Shared helpers for the clinical content pipeline (Spec 005, plan/data-model.md).
// Pure file IO + deterministic projection; no network, ever.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..");
export const PROTOCOL_PATH = join(ROOT, "clinical", "uk-cpp.v1.json");
export const SCHEMA_PATH = join(ROOT, "clinical", "protocol.schema.json");
export const FIELD_BUNDLE_PATH = join(ROOT, "src", "clinical", "field-bundle.json");

const SHA256_RE = /^[a-f0-9]{64}$/;
const VERIFIED_RE = /^VERIFIED:[^:]+:\d{4}-\d{2}-\d{2}$/;

export function loadProtocol(path = PROTOCOL_PATH) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function isVerified(status) {
  return VERIFIED_RE.test(status);
}

/** A source is "archived" iff it carries a real 64-hex SHA-256 checksum. */
export function isArchivedSource(source) {
  return !!source && SHA256_RE.test(source.checksum_sha256 ?? "");
}

/**
 * Field-bundle projection (plan/data-model.md § Field-bundle projection).
 * A record is included iff:
 *   - Formula.kind === "engineering" (deterministic math, always included), OR
 *   - review_status matches ^VERIFIED: AND its source has a real checksum.
 * Prophylaxis is additionally excluded if any drug it references is not included
 * (fail-closed: never point at a dropped record).
 * Returns { bundle, included:{drugs,prophylaxis,formulas}, excluded:[{kind,id,reason}] }.
 */
export function compileFieldBundle(protocol) {
  const sourceById = new Map(protocol.sources.map((s) => [s.id, s]));
  const excluded = [];

  const includedDrugs = [];
  for (const d of protocol.drugs) {
    const src = sourceById.get(d.source_document);
    if (!isVerified(d.review_status)) {
      excluded.push({ kind: "drug", id: d.id, reason: `review_status=${d.review_status}` });
    } else if (!isArchivedSource(src)) {
      excluded.push({ kind: "drug", id: d.id, reason: `source ${d.source_document} not archived` });
    } else {
      includedDrugs.push(d);
    }
  }
  const includedDrugIds = new Set(includedDrugs.map((d) => d.id));

  const includedProphylaxis = [];
  for (const p of protocol.antibiotic_prophylaxis) {
    const src = sourceById.get(p.source_document);
    const refs = [...(p.drug_of_choice ?? []), ...(p.alternative ?? [])];
    const missingRef = refs.find((id) => !includedDrugIds.has(id));
    if (!isVerified(p.review_status)) {
      excluded.push({ kind: "prophylaxis", id: p.id, reason: `review_status=${p.review_status}` });
    } else if (!isArchivedSource(src)) {
      excluded.push({ kind: "prophylaxis", id: p.id, reason: `source ${p.source_document} not archived` });
    } else if (missingRef) {
      excluded.push({ kind: "prophylaxis", id: p.id, reason: `references excluded drug ${missingRef}` });
    } else {
      includedProphylaxis.push(p);
    }
  }

  const includedFormulas = [];
  for (const f of protocol.formulas) {
    if (f.kind === "engineering") {
      includedFormulas.push(f);
    } else if (!isVerified(f.review_status)) {
      excluded.push({ kind: "formula", id: f.id, reason: `review_status=${f.review_status}` });
    } else if (!isArchivedSource(sourceById.get(f.source_document))) {
      excluded.push({ kind: "formula", id: f.id, reason: `source ${f.source_document} not archived` });
    } else {
      includedFormulas.push(f);
    }
  }

  // Keep only the sources actually referenced by included records.
  const usedSourceIds = new Set(
    [...includedDrugs, ...includedProphylaxis, ...includedFormulas].map((r) => r.source_document),
  );
  const bundle = {
    meta: {
      schema_version: protocol.meta.schema_version,
      protocol_version: protocol.meta.protocol_version,
      disclaimer_uk: protocol.meta.disclaimer_uk,
      compiled_note:
        "FIELD BUNDLE. Contains only VERIFIED + archived clinical records plus engineering formulas. Non-VERIFIED records are absent by construction (Constitution Art. III).",
    },
    sources: protocol.sources.filter((s) => usedSourceIds.has(s.id)),
    drugs: includedDrugs,
    antibiotic_prophylaxis: includedProphylaxis,
    formulas: includedFormulas,
  };

  return { bundle, included: { drugs: includedDrugs, prophylaxis: includedProphylaxis, formulas: includedFormulas }, excluded };
}
