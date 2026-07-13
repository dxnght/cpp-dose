# ADR-0006 — Register JTS PCC guidelines as sources for drip dosing

- **Status:** Proposed (2026-07-13) — pending Owner acceptance
- **Deciders:** Owner (Claude drafted)
- **Related:** Constitution Art. I/II/VII; ADR-0002; Spec 000 v1.1, Spec 002;
  `clinical/uk-cpp.v1.json`; `clinical/OPEN-CLINICAL-QUESTIONS.md` §E

## Context

The drip-first MVP needs **continuous-infusion (drip) dosing**. The condensed TCCC
2026 field card gives ketamine as boluses; the detailed drip regimens (loading +
continuous infusion, mixing, ml/hr, drops/min tables) live in the **JTS Prolonged
Casualty Care (PCC) Clinical Practice Guidelines** — e.g. *Analgesia and Sedation
Management during Prolonged Field Care* — published in Ukrainian on tccc.org.ua
(translations of the JTS originals). The Owner asked to pull the needed drugs from
that collection and register them as knowledge-base sources.

## Decision

1. **Register JTS PCC CPGs as sources** in the Source Registry (`sources[]`),
   starting with `PCC-ANALGESIA-SEDATION`. Transcribe drip-relevant drugs from them
   into `drugs[]` with `infusion` blocks — **as transcription only** (Art. I): exact
   values, exact citations, `review_status: UNVERIFIED`. No values are invented; no
   ranges are collapsed.
2. **Source hierarchy (extends ADR-0002):**
   - **TCCC 2026 field card** — immediate/field actions and bolus dosing.
   - **JTS PCC CPGs** — detailed *prolonged-care* dosing, incl. **continuous drips**
     (the drip app's primary dose source). Where the two overlap, PCC provides the
     infusion detail the field card summarizes.
   - **MOZ 2023** — antibiotic prophylaxis by injury type (unchanged).
   Every record keeps its own `source_document`; the UI states which source a value
   comes from.
3. **Translation provenance.** PCC content was transcribed from the **Ukrainian
   translation** (tccc.org.ua). The archived artifact and citation basis (UA vs
   English JTS original) is an **Owner decision**; critical doses should be
   cross-checked against the English original before `VERIFIED`. Recorded in
   OPEN-CLINICAL-QUESTIONS §E.
4. **Archival before shipping.** A PCC source must be archived (PDF + SHA-256) and
   its exact CPG version/date recorded before any citing record can pass the release
   gate. Until then the source checksum stays `TODO(archive-source)` and records
   stay blocked (fail-closed) — the current state.

## Consequences

- (+) The drip app gets real, source-traceable infusion dosing (ketamine drip,
  later burns/sepsis) without inventing anything.
- (+) Clear provenance per value; auditors see field-card vs PCC vs MOZ.
- (−) Translation risk: mitigated by the cross-check requirement + Owner verify gate.
- (−) Numeric drip **tables** (Appendix B) carry transcription risk; deferred to a
  careful, separately-verified step (OPEN-CLINICAL-QUESTIONS §E.3) — not rendered
  until verified.
- (−) More sources to keep current (version tracking is an Owner duty, Art. VII).

## Alternatives considered

- **Derive drip doses from the TCCC 2026 bolus values.** Rejected — that is
  extrapolation, forbidden by Art. I.
- **Only English JTS originals.** Cleaner provenance but not in the app's language
  and not what the Owner supplied; kept as the cross-check reference instead.
- **Skip drips / bolus-only MVP.** Rejected — drips are the product's core.

## Update 2026-07-13 — CPG IDs confirmed

The Owner cited CPG IDs 91 and 61; these were identified against the official JTS
index:

- **JTS CPG 61** — *Analgesia and Sedation Management During Prolonged Field Care*
  (11 May 2017). Source of the ketamine drip dosing. Registered as `JTS-CPG-61`;
  ketamine records now cite it (values transcribed via the UA translation — confirm
  vs the English original at verification).
- **JTS CPG 91** — *Prolonged Casualty Care Guidelines* (21 Dec 2021). Registered as
  `JTS-CPG-91` (PCC umbrella).
- **PCC-BURN** — *Burn Wound Management under PFC* (JTS; UA translation on
  tccc.org.ua). Registered; exact JTS CPG ID/version still to confirm.

**Provenance decision (recommended, pending Owner):** treat the **English JTS PDFs
as the authoritative sources** (archive those + checksum) and use the UA
translations as the working/cross-reference text. The `UNVERIFIED` records were
drafted from the UA translations + Owner notes; the Owner confirms against the EN
originals when stamping `VERIFIED`.
