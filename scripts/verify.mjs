// `npm run verify` — Owner checklist. Lists every non-VERIFIED / TODO clinical
// record grouped by source. Read-only: NEVER mutates review_status (Spec 005 FR-4).
import { loadProtocol } from "./lib.mjs";

const protocol = loadProtocol();
const isVerified = (s) => /^VERIFIED:[^:]+:\d{4}-\d{2}-\d{2}$/.test(s);

const rows = [];
const push = (kind, rec) =>
  rows.push({
    source: rec.source_document,
    kind,
    id: rec.id,
    status: rec.review_status,
    citation: rec.source_citation,
  });

for (const d of protocol.drugs) if (!isVerified(d.review_status)) push("drug", d);
for (const p of protocol.antibiotic_prophylaxis) if (!isVerified(p.review_status)) push("prophylaxis", p);
for (const f of protocol.formulas) {
  if (f.kind === "engineering") continue; // deterministic math, exempt (Spec 005 §3)
  if (!isVerified(f.review_status)) push("formula", f);
}

console.log(`CPP-DOSE verify report — ${protocol.meta.protocol_version}`);
console.log(`Generated for the Owner. ${rows.length} record(s) awaiting verification.\n`);

const bySource = new Map();
for (const r of rows) {
  if (!bySource.has(r.source)) bySource.set(r.source, []);
  bySource.get(r.source).push(r);
}

for (const [source, list] of bySource) {
  console.log(`## ${source}  (${list.length})`);
  for (const r of list) {
    console.log(`  [${r.status}] ${r.kind}:${r.id}`);
    console.log(`      ↳ ${r.citation}`);
  }
  console.log("");
}

if (rows.length === 0) console.log("All clinical records are VERIFIED. 🎉");
// Read-only report: always exits 0.
