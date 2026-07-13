// @vitest-environment node
// Spec 005 AC-1 (protocol validates) and AC-6 (removing a source_citation fails).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { PROTOCOL_PATH, SCHEMA_PATH, loadProtocol } from "../scripts/lib.mjs";

const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

describe("clinical protocol schema", () => {
  it("AC-1: uk-cpp.v1.json validates against the schema", () => {
    const ok = validate(loadProtocol(PROTOCOL_PATH));
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });

  it("AC-6: removing a source_citation fails validation", () => {
    const p = loadProtocol(PROTOCOL_PATH);
    delete p.drugs[0].source_citation;
    expect(validate(p)).toBe(false);
  });

  it("FR-2: every review_status matches the state machine (UNVERIFIED | TODO(clinical-review) | VERIFIED:name:date)", () => {
    const p = loadProtocol(PROTOCOL_PATH);
    const re = /^(UNVERIFIED|TODO\(clinical-review\)|VERIFIED:[^:]+:\d{4}-\d{2}-\d{2})$/;
    for (const rec of [...p.drugs, ...p.antibiotic_prophylaxis, ...p.formulas]) {
      expect(rec.review_status).toMatch(re);
    }
  });
});
