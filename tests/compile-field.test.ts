// @vitest-environment node
// Fail-closed projection invariants (Spec 005 FR-3, AC-0.2/0.3, Constitution Art. III).
// These assert the projection RULE, not a snapshot of how many records are verified —
// so they stay valid as the Owner promotes records to VERIFIED.
import { describe, it, expect } from "vitest";
import { loadProtocol, compileFieldBundle, isVerified, PROTOCOL_PATH } from "../scripts/lib.mjs";

const clinicalRecords = (b) => [
  ...b.drugs,
  ...b.antibiotic_prophylaxis,
  ...b.formulas.filter((f) => f.kind !== "engineering"),
];

describe("field-bundle projection", () => {
  it("AC-0.2 / Art. III: the bundle NEVER exposes a non-VERIFIED clinical record", () => {
    const { bundle } = compileFieldBundle(loadProtocol(PROTOCOL_PATH));
    for (const r of clinicalRecords(bundle)) expect(isVerified(r.review_status)).toBe(true);
    // Deterministic engineering math is always present regardless of verification.
    expect(bundle.formulas.some((f) => f.kind === "engineering")).toBe(true);
  });

  it("AC-0.3: verifying one more record admits exactly that record", () => {
    const p = loadProtocol(PROTOCOL_PATH);
    const base = new Set(compileFieldBundle(p).bundle.drugs.map((d) => d.id));
    // moz_cefazolin is UNVERIFIED in the seed and its source (MOZ-ATB-2023) is archived.
    const target = p.drugs.find((d) => d.id === "moz_cefazolin");
    expect(target && !isVerified(target.review_status)).toBe(true);
    target.review_status = "VERIFIED:test-fixture:2026-07-13"; // in-memory fixture; on-disk seed untouched
    const after = compileFieldBundle(p).bundle.drugs.map((d) => d.id);
    const added = after.filter((id) => !base.has(id));
    expect(added).toEqual(["moz_cefazolin"]);
  });

  it("AC-0.3 guard: a VERIFIED record whose source is NOT archived is excluded", () => {
    const p = loadProtocol(PROTOCOL_PATH);
    const target = p.drugs.find((d) => d.id === "moz_cefazolin");
    target.review_status = "VERIFIED:test-fixture:2026-07-13";
    // Force its source un-archived → archival is required for inclusion.
    p.sources.find((s) => s.id === "MOZ-ATB-2023").checksum_sha256 = "TODO(archive-source)";
    const ids = compileFieldBundle(p).bundle.drugs.map((d) => d.id);
    expect(ids).not.toContain("moz_cefazolin");
  });
});
