// @vitest-environment node
// AC-4 / Constitution Art. III: rendering a non-VERIFIED record must throw.
import { describe, it, expect } from "vitest";
import { assertRenderable, isRenderable } from "../src/clinical/guard";
import type { Drug, Formula } from "../src/clinical/types";

const unverifiedDrug: Drug = {
  id: "x",
  drug: "X",
  indication: "y",
  route: "IV",
  fixed_dose: "1 g",
  review_status: "UNVERIFIED",
  source_document: "TCCC-2026",
  source_version: "01 May 2026",
  source_citation: "n/a",
};

describe("fail-closed guard", () => {
  it("throws when asked to render an UNVERIFIED clinical record", () => {
    expect(() => assertRenderable(unverifiedDrug)).toThrow(/Refused to render non-VERIFIED/);
    expect(isRenderable(unverifiedDrug)).toBe(false);
  });

  it("throws for TODO(clinical-review) too", () => {
    expect(() => assertRenderable({ ...unverifiedDrug, review_status: "TODO(clinical-review)" })).toThrow();
  });

  it("allows a VERIFIED record", () => {
    expect(isRenderable({ ...unverifiedDrug, review_status: "VERIFIED:owner:2026-07-12" })).toBe(true);
  });

  it("allows an engineering formula even when UNVERIFIED (deterministic math)", () => {
    const eng: Formula = {
      id: "drip_rate",
      name: "Gravity IV drip rate",
      kind: "engineering",
      expression: "v/t*df",
      review_status: "UNVERIFIED",
      source_document: "STD-IV-DRIP-MATH",
      source_version: "1.0",
      source_citation: "identity",
    };
    expect(isRenderable(eng)).toBe(true);
  });
});
