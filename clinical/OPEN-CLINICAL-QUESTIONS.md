# Open Clinical Questions — for the Owner

Tracking file. Agents add rows; only the **Owner** closes them (by verifying content
against an archived source and/or amending a spec). Do **not** guess a value to close
a row (Constitution Art. I). Changing this file never changes a `review_status`.

## Scope key — what blocks v1.0 vs what's parked

Per `ROADMAP.md` (Owner decision 2026-07-15), **v1.0 = focused minimum**: the ketamine
analgesia + sedation drips, their priming/loading boluses, burn fluid, and the Rule of
Ten formula. Everything else in `uk-cpp.v1.json` (antibiotics-by-injury, CNS tree,
IM ketamine, esketamine, Appendix B numeric tables, pediatric) is **post-v1.0 (M3)** and
is held out of the field bundle by the release gate — it does **not** block v1.0.

- **`[v1.0]`** — must be closed before the first field build.
- **`[post-v1.0]`** — parked for M3; kept `UNVERIFIED` on purpose; not a blocker.

---

## A. v1.0 focused drip set — STATUS: content complete ✅

All six focused records are `VERIFIED` and their sources are archived; `npm run
gate:release` passes and exposes them (6 clinical + 2 engineering formulas).

| Record                            | Status                   | Source           |
| --------------------------------- | ------------------------ | ---------------- |
| `pcc_ketamine_analgesia_infusion` | VERIFIED:Ihor:2026-07-17 | JTS CPG-61 App C |
| `pcc_ketamine_analgesia_priming`  | VERIFIED:Ihor:2026-07-14 | JTS CPG-61       |
| `pcc_ketamine_sedation_loading`   | VERIFIED:Ihor:2026-07-14 | JTS CPG-61       |
| `pcc_ketamine_sedation_infusion`  | VERIFIED:Ihor:2026-07-13 | JTS CPG-61       |
| `pcc_burn_fluid`                  | VERIFIED:Ihor:2026-07-13 | PCC-BURN         |
| `burn_rule_of_ten`                | VERIFIED:Ihor:2026-07-14 | TCCC-2026        |

### `[v1.0]` Remaining confirmations before the field build (low-risk, Owner sign-off)

1. **TCCC-2026 edition.** Archived `clinical/sources/tccc-guidelines-2026-en.pdf`
   (SHA-256 `340a17a0…`) is 17 pages / 314 KB. Confirm it is the complete/correct
   edition — `burn_rule_of_ten` cites it.
2. **PCC-BURN exact provenance.** `pcc_burn_fluid` cites the **UA translation** of the
   JTS Burn Wound Management under PFC guide (archived, SHA-256 `873e2351…`). Confirm
   the exact **JTS CPG ID/date** of the EN original and whether to cite EN, UA, or both.
3. **JTS-CPG-61 translation provenance.** The ketamine drips were transcribed from the
   guide (EN original archived, SHA-256 `e0fd67fb…`; UA translation also archived).
   Owner may wish to spot-check the critical doses against the EN original — already the
   citation of record, so this is a confidence check, not a blocker.

---

## B. Resolved decisions (log)

- **Rule of Ten — weight rounding above 80 kg (2026-07-14).** Round weight to the
  nearest 10 kg for the "+100 ml/h per 10 kg above 80 kg" step: **80–84 → no +100**,
  **85–94 → +100**, **95–104 → +200**. Implemented in `burnRuleOfTenMlPerH`
  (`Math.round((weight-80)/10)*100`); covered by `drip-calc.test.ts`.
- **Analgesia drip citation (2026-07-17).** The sub-dissociative analgesia dose
  (0.1–0.2 mg/kg IV) is sourced from **JTS CPG-61, Appendix C** (Common IV Meds Cheat
  Sheet); the Owner's 100 mg / 100 ml NS = 1 mg/ml prep is that dose. Citation corrected
  and the record re-verified. (Supersedes the earlier "not specified in this guide" note.)

---

## C. Post-v1.0 (parked for M3) — kept `UNVERIFIED` on purpose

None of these block v1.0. Do not build a partial path; each needs its own source +
Owner verification when its milestone comes.

1. **`[post-v1.0 scope, content now complete]` Antibiotics-by-injury (MOZ + TCCC).**
   **Update 2026-07-17:** the Owner verified all 25 MOZ-ATB-2023 records (13 drugs
   - 12 by-injury prophylaxis groups) and 3 of 4 TCCC-2026 general antibiotics
     (`tccc_cefadroxil_po`, `tccc_ceftriaxone_unable_po`, `tccc_ceftriaxone_eye`;
     `tccc_cephalexin_po` still `UNVERIFIED`). `gate:release` now exposes 38
     clinical records total. **UI built** on `feature/antibiotics-reference`
     (Spec 004 / ADR-0007 / Sprint 4) — a read-only, source-separated reference in
     "Препарати"; with this much verified it now renders real content, not an
     empty state. Also corrected the 12 `antibiotic_prophylaxis[].injury_type`
     labels from an English paraphrase to the exact Ukrainian wording in the
     archived MOZ source (label fix only, no dose/drug value changed).
     **Open for the Owner:** the module is content-complete enough that it could
     fold into v1.0 rather than wait for M3 — that's a scope call for the Owner
     when reviewing the branch, not decided here. Still to close:
     `tccc_cephalexin_po` verification, and Open Question C.2 (CNS combination
     branching) before that logic is presented as anything beyond a transcribed list.

   **Update 2026-07-17 (later same day):** the 13 MOZ drug records' `drug` name
   field was translated from an English gloss (e.g. "Cefazolin") to the exact
   Ukrainian INN as it appears in the archived source (e.g. "Цефазолін") — the
   medicine/dose/route are unchanged, only the display language. Editing a
   `VERIFIED` record's content post-hoc invalidates the Owner's attestation of
   that exact content (same discipline as the earlier `burn_rule_of_ten`/
   analgesia-citation reverts this session), so **all 13 were reverted to
   `UNVERIFIED`** — and because the 12 `antibiotic_prophylaxis` groups each
   reference these drug ids, they were excluded from the compiled bundle too
   (fail-closed dependency: a prophylaxis card is only shippable if the drug
   record it points to is). Re-verify with the same loop as before (§D) — same
   13 ids, same source, only the name changed:
   `moz_cefazolin moz_clindamycin_iv moz_clindamycin_po moz_ertapenem
moz_metronidazole moz_moxifloxacin moz_levofloxacin_po_once
moz_levofloxacin_eye moz_vancomycin moz_ciprofloxacin moz_ceftriaxone
moz_fluoroquinolone_eyedrops moz_silver_sulfadiazine_topical`.
   **Re-verified same day** — all 13 back to `VERIFIED:Ihor:2026-07-17`.

   **Update 2026-07-17 (again):** `antibiotic_prophylaxis[].duration` was also
   translated from an English gloss to the exact wording in the archived
   source's table (e.g. "24 h" -> "24 год.", "At least 5 days or until CSF
   leak is surgically resolved" -> "Не менше 5 діб або доки витік
   спинномозкової рідини не буде хірургічно усунено"). Same discipline: all 12
   prophylaxis records reverted to `UNVERIFIED` (drug/dose/route/duration
   values unchanged, only display language). Re-verify with:
   `moz_prophylaxis_extremity_soft_tissue moz_prophylaxis_extremity_open_fracture
moz_prophylaxis_thorax_no_esophageal moz_prophylaxis_thorax_esophageal
moz_prophylaxis_abdomen_hollow_organ moz_prophylaxis_maxillofacial
moz_prophylaxis_cns_brain moz_prophylaxis_cns_spinal
moz_prophylaxis_eye_penetrating moz_prophylaxis_eye_topical
moz_prophylaxis_delayed_evac moz_prophylaxis_burns_topical`.

   Verified VERIFIED:Ihor:2026-07-18 at 17:35 by Owner (Ihor).

2. **`[post-v1.0]` CNS antibiotic combination tree (brain & spinal).** The MOZ table
   nests "and / or (for cephalosporin allergy)" branches; confirm the exact decision
   tree before any UI renders it. _(records `moz_prophylaxis_cns_brain`,
   `moz_prophylaxis_cns_spinal`)_
3. **`[post-v1.0]` IM ketamine doses.** `pcc_ketamine_analgesia_iv` holds the push/IM
   notes (CPG-61 footnote 1: 80 mg / 0.4–0.8 mg/kg IM when no IV/IO; Appendix D:
   40–60 mg / 0.5–0.75 mg/kg IM/IN breakthrough). Owner: "IM not used in prolonged
   care" — left flagged, not entered as a usable dose.
4. **`[post-v1.0]` Esketamine / Ketanest (≈2× potency).** Recorded only as a safety
   warning in the ketamine records; **no esketamine dose entered** (deriving it =
   extrapolation). Needs its own registered source before it becomes a record.
5. **`[post-v1.0]` Appendix B numeric drip tables.** The mg/kg/h ↔ mcg/kg/min ↔ ml/hr
   grid and the drops/min tables (15 & 10 gtt/ml) were **not** transcribed as numbers
   (table-extraction risk). Transcribe + verify from the source before rendering.
6. **`[post-v1.0]` Pediatric dosing.** MOZ contains pediatric mg/kg doses; MVP is
   adult-only. Deferred to `IDEAS.md`.
7. **`[post-v1.0]` TXA edge weights.** TCCC gives a fixed 2 g adult dose; confirm app
   guardrails for edge weights when TXA is added.
8. **`[post-v1.0]` Which antibiotic source leads at point of care.** Hierarchy set
   (TCCC primary, MOZ for prophylaxis-by-injury — ADR-0002); confirm UI wording so a
   medic is never unsure which regimen is quoted.

### `[v1.0]` Weight domain & burn-rule bounds (spec question, not a value)

Rule of Ten is stated for adults 40–80 kg with the +100 ml/h/10 kg extension above 80.
Confirm the app's weight-slider bounds (currently 30–150 kg) and the intended behavior
for **< 40 kg** and very high weights. `TODO(clinical-review)` in Spec 003. This is a
UI-guardrail decision (no clinical value originated), so it can close alongside v1.0.

---

## D. How to verify / close a row (Owner — Art. II keeps this in your hand)

Per record checked against its archived source:

```
npm run verify:record -- <recordId> "Ihor"
npm run compile:field && npm run gate:release
```

The command stamps `VERIFIED:Ihor:<date>`, logs it to `VERIFICATION-LOG.md`, and warns
if the source isn't archived (in which case it still won't ship). To close a written row
here: verify the value, then tick/remove the row and note it in section B.
