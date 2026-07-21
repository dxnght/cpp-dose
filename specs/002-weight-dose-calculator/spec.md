# Spec 002 — Drip Drug List & Infusion Recipe

> (Retitled from "Weight → Dose Calculator". Folder id kept as
> `002-weight-dose-calculator` to preserve references.)

- **Feature ID:** 002-weight-dose-calculator
- **Status:** Draft → pending Owner approval
- **Priority:** P0 (Sprint 2)
- **Version:** 1.1 (reshaped to a drip-first infusion recipe; weight now optional)
- **Depends on:** 005-clinical-content-pipeline (all doses), 001 (rate hand-off).

## Constitution Check

- **Art. I/II (RED LINE):** every dose shown comes from a `VERIFIED` record in the
  pipeline. At seed everything is `UNVERIFIED`, so the field list is empty until the
  Owner verifies. ✔
- **Art. III:** doses/volumes clamped; out-of-clamp → suppressed. ✔
- **Art. IV:** each dose shows `source_version` + verification state; confirm-to-
  reveal before the final number. ✔

## 1. Why

The medic wants to pick a **drip-able medication or fluid** from a short curated
list, see its **recommended dose** (from a registered source), then prepare a bag
(actual dose in a diluent volume, over a target time) and get the **gtt/min** —
handed straight to the drip engine (Spec 001). This replaces the heavier
weight×mg/kg calculator with a focused infusion recipe.

## 2. User stories

- **US-1** I open the drip list and see a short set of infusions/fluids (name,
  indication, route), each with its recommended dose and source/verification badge.
- **US-2** I pick one; I enter/confirm the **actual dose**, the **diluent volume**
  (e.g. 500 ml NS), and the **target time** (e.g. 20 h). The app shows the resulting
  ml/hr and hands the recipe to the drip engine for **gtt/min**.
- **US-3** For mg/kg doses I can optionally enter **weight**; the mg/kg × weight
  arithmetic is shown transparently. For fixed doses, no weight is needed.
- **US-4** I see the recommended-dose range and cautions exactly as written in the
  source (e.g. "analgesia, not sedation"); the app never collapses a range.
- **US-5** I start the prepared drip as one of my (up to 5) concurrent drips.

## 3. Functional requirements

- **FR-1** The drip list is populated **only** from `VERIFIED` drip-eligible records
  in the field bundle. Each item shows drug, indication, route, recommended dose.
- **FR-2** "Drip-eligible" records carry an optional `infusion` block (diluent,
  typical volume, typical duration or target rate, concentration) in the protocol
  schema; only records marked as infusions appear here. Non-drip (bolus/push) drugs
  are excluded from this list.
- **FR-3** Infusion recipe inputs: actual dose, diluent volume (ml), target time
  (or target rate). Compute ml/hr and pass volume + time to Spec 001 for gtt/min.
- **FR-4** Weight is **optional**, shown only when the selected record is `dose_per_kg`;
  then dose = per_kg × weight with the arithmetic displayed. Fixed-dose records hide
  weight.
- **FR-5** Enforce `max_dose` / `min_max` clamps; over-max → blocked with the max
  shown (never silently capped).
- **FR-6** Ranges preserved verbatim (e.g. "0.2–0.3 mg/kg/h"); never point-collapsed.
- **FR-7** Every result shows `source_document` + `source_version` + `review_status`,
  with `source_citation` on demand (Art. IV/VII).
- **FR-8** Confirm-to-reveal the final prepared dose/rate (double-tap / hold).

## 4. Acceptance criteria

- **AC-1 (SC-4)** With seed data (all `UNVERIFIED`) the drip list is **empty** and
  the screen explains no verified content is available (fail-closed).
- **AC-2** After the Owner verifies a drip record, it appears with its recommended
  dose, source, and version; selecting it opens the infusion-recipe inputs.
- **AC-3** Example recipe (once its record is verified): dose in 500 ml over 20 h →
  ml/hr computed → handed to Spec 001 → **8 gtt/min at 20 gtt/ml**. (Engineering
  math is testable now; the clinical dose value stays `TODO`/`UNVERIFIED` until
  sourced + Owner-verified.)
- **AC-4** A `dose_per_kg` record with weight entered shows the mg/kg × weight
  arithmetic and updates live; fixed-dose records need no weight.
- **AC-5** Over-max dose blocked with the max stated.
- **AC-6 (SC-7)** No dose/rate renders without a source + verification tag.
- **AC-7 (SC-3)** Airplane mode; zero network.

## 5. Out of scope

Full weight×mg/kg dose calculator for all drugs (→ IDEAS); pediatric dosing;
antibiotic prophylaxis by injury type (→ IDEAS); drug–drug interaction checking;
patient identity.

## 6. Edge cases

- Record has both `fixed_dose` and `dose_per_kg` (e.g. ketamine): show both, medic
  chooses; do not auto-pick.
- Selected record has no `infusion` block yet (dose known but dilution not sourced)
  → show the recommended dose but require the medic to enter diluent/volume/time
  manually; mark the missing source detail as `TODO(clinical-review)`.
- Weight outside clamp → outputs suppressed with reason.

## Clarifications needed

- The curated **initial drip list** (which drugs/fluids) → Owner provides from
  notes; agents do not invent it (Art. I). Candidates already in the registry:
  ketamine analgesia infusion, burn fluid (NS/LR), hypertonic saline (short
  infusion) — all pending PCC-sourced dilution/rate + Owner verification.
- Whether the recommended drip doses come from the PCC analgesia/sedation & burn
  guidelines (likely) → register that source (future ADR-0006).
