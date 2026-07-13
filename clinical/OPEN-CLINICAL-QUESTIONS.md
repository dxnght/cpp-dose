# Open Clinical Questions — for the Owner

Every item here blocks a field release until resolved. Agents add rows; only the
Owner closes them (by verifying content and/or amending a spec). Do **not** guess
a value to close a row (Constitution Art. I).

## A. Verification backlog (all seed records)

All 33 drug records, 12 prophylaxis mappings, and the `burn_rule_of_ten` formula
in `uk-cpp.v1.json` are `UNVERIFIED`. Each must be checked against its
`source_citation` and promoted to `VERIFIED:<name>:<date>` by the Owner. Use the
`verify` report (Spec 005 FR-4) as the checklist. Until then the field bundle is
empty by design (fail-closed).

## B. Source-archival TODOs

- [x] **TCCC-2026 checksum** — archived `clinical/sources/tccc-guidelines-2026-en.pdf`
      (downloaded from the Owner-supplied URL, Sprint 0, 2026-07-12) and recorded its
      SHA-256 `340a17a03388a1e4479df3737c5b038462494fea4c28a35251410662b1a019b6` in the
      source registry. **Owner note:** the archived file is 17 pages (314 KB); confirm
      it is the complete/correct edition before promoting any TCCC record to VERIFIED.

## C. Substantive clinical questions to decide

1. **CNS antibiotic combination logic (brain & spinal).** The MOZ table nests
   several "and / or (for cephalosporin allergy)" branches. The seed captures the
   components but marks the exact branching in `notes`. Owner to confirm the
   precise decision tree before the UI renders it. *(records
   `moz_prophylaxis_cns_brain`, `moz_prophylaxis_cns_spinal`)*
2. **Weight domain & burn-rule bounds.** Rule of Ten is stated for adults 40–80 kg
   with a +100 ml/hr/10 kg extension above 80 kg. Confirm the app's weight slider
   bounds (plan said 30–150 kg) and how the tool behaves for <40 kg and very high
   weights. `TODO(clinical-review)` in Spec 003.
3. **TXA lower age / weight applicability.** TCCC gives a fixed 2 g adult dose;
   confirm the app's guardrails for edge weights.
4. **Pediatric dosing (parked).** The MOZ Standard contains pediatric mg/kg doses
   (cefazolin, metronidazole, clindamycin, ertapenem, ceftriaxone, vancomycin,
   ciprofloxacin). MVP is adult-only; pediatric path is deferred to `IDEAS.md`.
   Do not build a partial pediatric path.
5. **Which antibiotic source leads at the point of care.** Hierarchy is set
   (TCCC primary, MOZ for prophylaxis-by-injury — ADR-0002), but confirm the UI
   wording so a medic is never unsure which regimen the app is quoting.

## E. PCC analgesia/sedation source — added 2026-07-13 (drip content)

Registered source `PCC-ANALGESIA-SEDATION` (JTS CPG, UA translation on tccc.org.ua)
and transcribed 3 ketamine records (`pcc_ketamine_analgesia_iv`,
`pcc_ketamine_sedation_loading`, `pcc_ketamine_sedation_infusion`), all `UNVERIFIED`.
The source is **not yet archived** (checksum `TODO(archive-source)`), so these are
doubly blocked from the field bundle. To make this content usable:

1. **Archive the official source + checksum.** Download the JTS PDF (or the
   tccc.org.ua guide as a stable PDF), place at `clinical/sources/pcc-analgesia-sedation.pdf`,
   record its SHA-256, and set the exact **JTS CPG version/date** in `sources[]`
   (currently `TODO(clinical-review)`).
2. **Translation provenance (Owner decision).** These doses were transcribed from
   the **Ukrainian translation**. Decide whether to cite the UA translation, the
   English JTS original, or both. Recommend cross-checking critical doses against
   the English original before `VERIFIED`.
3. **Verify Appendix B ketamine drip tables numerically.** The mg/kg/h ↔ mcg/kg/min
   ↔ ml/hr grid and the drops/min tables (15 & 10 gtt/ml) were **not** transcribed
   as numbers (table-extraction risk). Transcribe + verify from the source before
   the app renders them.
4. **Reconcile a ketamine IM discrepancy.** Footnote 1 = **80 mg IM (0.4-0.8 mg/kg)**
   when no IV/IO; Appendix D = **40-60 mg (0.5-0.75 mg/kg) IM/IN** for breakthrough.
   Confirm which applies where. *(record `pcc_ketamine_analgesia_iv` notes)*
5. **Analgesia vs sedation infusion.** This guide's continuous ketamine drip is for
   **sedation** (1 mg/kg/h non-intubated). Your example "500 mg / 500 ml / 20 h for
   analgesia" is a *sub-dissociative analgesic* drip — **not specified in this
   guide**. It needs its own registered source before it can be a verified recipe.
6. **Esketamine.** Appendix D states S(+) ketamine ≈ twice as potent → "use half the
   mg dose of racemic ketamine." Exact esketamine drip doses are **not** given;
   deriving them = extrapolation (forbidden). Register an esketamine-specific source
   or record the conversion only, `UNVERIFIED`, for Owner sign-off.
7. **Burn fluids.** Consider registering the PCC **burn wound management** guide for
   burn-fluid drip detail (or keep TCCC 2026 Rule of Ten). Source hierarchy in
   ADR-0006.

## E-notes update — 2026-07-13 (Owner notes applied)

Owner notes were transcribed into the ketamine records (`pcc_ketamine_analgesia_iv`,
`pcc_ketamine_sedation_loading`, `pcc_ketamine_sedation_infusion`, and NEW
`pcc_ketamine_analgesia_infusion` = 100 mg/100 ml NS = 1 mg/ml, 0.2-0.3 mg/kg/h).
All remain `UNVERIFIED`. Still to resolve before a valid `VERIFIED`:

- **Archive the JTS source PDFs** (now identified). Download each official PDF to
  `clinical/sources/`, record its SHA-256 + version. Until then citing records
  cannot ship even if verified:
  - **JTS CPG 61** — Analgesia and Sedation during PFC (11 May 2017):
    `https://jts.health.mil/assets/docs/cpgs/Analgesia_and_Sedation_Management_during_PFC_11_May_2017_ID61.pdf`
    (source of the ketamine drip content).
  - **JTS CPG 91** — Prolonged Casualty Care Guidelines (21 Dec 2021):
    `https://jts.health.mil/assets/docs/cpgs/Prolonged_Casualty_Care_Guidelines_21_Dec_2021_ID91.pdf`
  - **PCC-BURN** — JTS Burn Wound Management under PFC (confirm exact CPG ID/version);
    UA translation at `https://tccc.org.ua/guide/burn-wound-management-under-prolonged-field-care-pcc`.
  (I cannot download the binary PDFs from here — web tooling returns text only — so
  archival + checksum is an Owner/local step.)
- **IM ketamine doses UNCERTAIN** (Owner: "≈4-8 mg/kg, здається; IM not used in
  prolonged care") — left flagged, not entered as a usable dose. Do not verify.
- **Esketamine / Ketanest = DOUBLE concentration.** Recorded only as a safety
  warning in the ketamine records; **no esketamine dose entered** (deriving it =
  extrapolation). Needs its own registered source before it becomes a record.
- **Analgesia vs sedation drips are now two distinct records** (1 mg/ml analgesia,
  3 mg/ml sedation). Verify each against its CPG separately.

### Owner verification — how to do it yourself (Art. II keeps this in your hand)

Run, per record you have checked against the archived source:

```
npm run verify:record -- <recordId> "Ihor"
npm run compile:field && npm run gate:release
```

The command stamps `VERIFIED:Ihor:<date>`, logs it to `VERIFICATION-LOG.md`, and
warns if the source isn't archived yet (in which case it still won't ship).

## D. How to close a row

Owner verifies the value against the archived source, edits `review_status` to
`VERIFIED:<name>:<YYYY-MM-DD>` in `uk-cpp.v1.json`, appends to
`VERIFICATION-LOG.md`, and ticks/removes the row here.
