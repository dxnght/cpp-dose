// OWNER-ONLY verification command (Constitution Art. II, Spec 005 FR-5, ADR-0004).
//
// Agents MUST NOT run this. Only the Owner runs it, and by running it the Owner
// is personally asserting they checked the record against its registered source.
//
//   npm run verify:record -- <recordId> "<YourName>"
//   e.g.  npm run verify:record -- pcc_ketamine_analgesia_infusion "Ihor"
//
// It flips exactly one record from UNVERIFIED/TODO to VERIFIED:<name>:<date>,
// appends an audit row to clinical/VERIFICATION-LOG.md, and warns if the record's
// source is not yet archived (in which case it still cannot ship — release gate).
import { writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { loadProtocol, PROTOCOL_PATH, ROOT, isArchivedSource, isVerified } from "./lib.mjs";

const [, , recordId, verifierRaw] = process.argv;
if (!recordId || !verifierRaw) {
  console.error('Usage: npm run verify:record -- <recordId> "<YourName>"');
  process.exit(2);
}
const verifier = verifierRaw.trim();
if (!verifier || verifier.includes(":")) {
  console.error("Verifier name must be non-empty and must not contain ':'.");
  process.exit(2);
}
const date = new Date().toISOString().slice(0, 10);
const status = `VERIFIED:${verifier}:${date}`;

const protocol = loadProtocol();
const sourceById = new Map(protocol.sources.map((s) => [s.id, s]));

let rec = null;
for (const arr of [protocol.drugs, protocol.antibiotic_prophylaxis, protocol.formulas]) {
  const found = arr.find((r) => r.id === recordId);
  if (found) { rec = found; break; }
}
if (!rec) { console.error(`Record '${recordId}' not found in uk-cpp.v1.json.`); process.exit(1); }
if (isVerified(rec.review_status)) { console.error(`Record '${recordId}' is already ${rec.review_status}.`); process.exit(1); }

const prev = rec.review_status;
rec.review_status = status;
writeFileSync(PROTOCOL_PATH, JSON.stringify(protocol, null, 2) + "\n");

const src = rec.source_document ? sourceById.get(rec.source_document) : null;
const archived = src ? isArchivedSource(src) : false;
const row =
  `| ${date} | ${recordId} | ${status} | ${rec.source_document ?? ""} (${rec.source_version ?? ""}) | ` +
  `${(rec.source_citation ?? "").replace(/\|/g, "/")} | ${verifier} |\n`;
appendFileSync(join(ROOT, "clinical", "VERIFICATION-LOG.md"), row);

console.log(`✓ ${recordId}: ${prev} -> ${status}`);
console.log(`  Logged to clinical/VERIFICATION-LOG.md.`);
if (!archived) {
  console.log(
    `  ⚠ Source '${rec.source_document}' is NOT archived yet (checksum is a TODO). This record is\n` +
    `    verified but STILL will not ship until the source is archived with a real SHA-256\n` +
    `    (release gate). Archive the source, then re-run: npm run compile:field && npm run gate:release`,
  );
} else {
  console.log(`  Next: npm run compile:field && npm run gate:release`);
}
