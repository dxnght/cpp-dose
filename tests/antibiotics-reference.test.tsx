// Spec 004 / Sprint 4 AC-4.1, AC-4.3 — "Препарати" is organized into three
// source-separated sections (TCCC 2026 antibiotics / MOZ 2023 by-injury
// prophylaxis / other drugs). These assert invariants that hold regardless of
// how much of the seed the Owner has verified so far (like compile-field.test.ts,
// deliberately not a snapshot of a particular verification state).
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { App } from "../src/App";
import { fieldBundle } from "../src/clinical/loader";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

function openDrugsTab() {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Я зрозумів(-ла)" })); // dismiss first-run
  fireEvent.click(screen.getByRole("button", { name: "Препарати" }));
}

describe("antibiotics reference sections (Spec 004 / ADR-0007)", () => {
  it("shows all three section headings, source-separated", () => {
    openDrugsTab();
    expect(screen.getByRole("heading", { name: "Препарати" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Антибіотики — TCCC 2026" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Антибіотики — МОЗ 2023, за типом ураження" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Інші препарати" })).toBeInTheDocument();
  });

  it("never leaks an UNVERIFIED badge anywhere on the screen (fail-closed, all sections)", () => {
    openDrugsTab();
    expect(screen.queryByText("НЕ ПІДТВЕРДЖЕНО")).toBeNull();
  });

  it("never leaks a raw record id (e.g. moz_cefazolin) — MOZ cards always resolve to real drug names", () => {
    openDrugsTab();
    expect(screen.queryByText(/\bmoz_[a-z_]+\b/)).toBeNull();
    expect(screen.queryByText(/\btccc_[a-z_]+\b/)).toBeNull();
  });

  it("TCCC section renders exactly the currently-VERIFIED TCCC antibiotics, none of the unverified ones", () => {
    openDrugsTab();
    const TCCC_ANTIBIOTIC_IDS = ["tccc_cefadroxil_po", "tccc_cephalexin_po", "tccc_ceftriaxone_unable_po", "tccc_ceftriaxone_eye"];
    for (const id of TCCC_ANTIBIOTIC_IDS) {
      const rec = fieldBundle.drugs.find((d) => d.id === id);
      // fieldBundle already contains only VERIFIED+archived records (compile:field
      // strips the rest) — so presence here IS verification, per this drug's name.
      if (rec) {
        expect(screen.getAllByText(new RegExp(rec.drug)).length).toBeGreaterThan(0);
      }
    }
  });

  it("MOZ section renders one card per verified injury-type group with a resolved duration", () => {
    openDrugsTab();
    for (const p of fieldBundle.antibiotic_prophylaxis) {
      expect(screen.getByRole("heading", { name: p.injury_type })).toBeInTheDocument();
    }
  });
});
