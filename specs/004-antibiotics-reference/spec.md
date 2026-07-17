# Spec 004 — Antibiotics Reference (read-only, "Препарати" tab)

- **Feature ID:** 004-antibiotics-reference
- **Status:** Draft → Owner-directed (2026-07-17), building on `feature/antibiotics-reference`
- **Priority:** P2 (M3 — post-v1.0 growth; does not block v1.0)
- **Version:** 1.0
- **Depends on:** 005-clinical-content-pipeline (data + fail-closed gate), ADR-0002
  (source hierarchy), ADR-0007 (this feature's UI placement).

## Constitution Check

- **Art. I:** no clinical value is originated here — this feature only *renders*
  drug/prophylaxis records already transcribed and cited in `uk-cpp.v1.json`
  (`drugs[]`, `antibiotic_prophylaxis[]`). One data-quality fix is included: the
  12 `antibiotic_prophylaxis[].injury_type` labels were seeded as English
  paraphrases; corrected to the exact Ukrainian section wording from the archived
  source (`clinical/sources/antibiotocs-UA.pdf`, MOZ-ATB-2023) — a label
  transcription correction, not a new clinical value.
- **Art. II/III:** every record rendered still passes through
  `assertRenderable`/the compiled field bundle, which excludes anything not
  `VERIFIED`. At the time this spec is written **none of the ~29 antibiotic
  records are Owner-verified**, so this screen will show its empty state on first
  build — expected, fail-closed working as intended, not a bug.
- **Art. V:** no network; purely reads the bundled `field-bundle.json`.
- **Art. VI:** built on a feature branch, not merged to `master` until reviewed.

---

## 1. Why

The MOZ 2023 by-injury prophylaxis table and the TCCC 2026 §12 general
antibiotics were already transcribed and seeded (Sprint 0) but never surfaced in
the UI (`IDEAS.md` — "Antibiotic by injury type browser"). The Owner wants a
**purely informational, read-only reference table** — no dosing calculator
integration, no drip tie-in — living in the existing **"Препарати"** tab
(`nav.drugs`), clearly split by source so a medic is never unsure which document
a recommendation comes from (per ADR-0002).

## 2. User stories

- **US-1** As a medic, I open "Препарати" and see combat-wound antibiotics from
  **TCCC 2026** (the general field recommendation) in one clearly labeled section.
- **US-2** In a separate, clearly labeled section, I see the **MOZ 2023**
  antibiotic **prophylaxis by injury type** (extremity, thorax, abdomen,
  maxillofacial, CNS, eye, burns) — drug of choice + alternative + duration.
- **US-3** Every entry shows its source document/version/citation and
  verification badge (`SourceBadge`) — I always know whether it's a confirmed
  value.
- **US-4** If nothing in a section is yet Owner-verified, I see a clear
  "not yet verified" state for that section — never a blank screen with no
  explanation, and never a fabricated dose.

## 3. Functional requirements

- **FR-1** Reorganize the existing `DrugsScreen` (`nav.drugs` = "Препарати")
  into labeled sections instead of one flat list:
  1. **Антибіотики — TCCC 2026** — the general combat-wound antibiotic set
     (TCCC §12: PO-able / unable-PO / eye). Identified by a small, explicit,
     documented ID allowlist in the component (`TCCC_ANTIBIOTIC_IDS`) — not a
     schema/category field, to keep this change minimal (Owner: "не сильно
     заморочуватися"). Revisit as a schema `category` field if the antibiotic
     set grows past this hand-picked list.
  2. **Антибіотики — МОЗ 2023, за типом ураження** — `antibiotic_prophylaxis[]`
     grouped one card per injury type: drug of choice, alternative(s), duration,
     resolved from `drug_of_choice`/`alternative` id arrays to the actual drug
     record (name/route/dose).
  3. **Інші препарати** — everything else already in `drugs[]` (ketamine,
     TXA, etc.) as a flat list, same as today — unchanged behavior.
- **FR-2** Every rendered record still passes `assertRenderable` (fail-closed,
  Art. III) — this feature reads only from the compiled bundle, which already
  excludes non-`VERIFIED` records; the in-component check is defense in depth.
- **FR-3** Each section has its own empty state ("ще не підтверджено Власником
  для цього розділу") independent of the global "no content at all" state
  (`hasNoVerifiedClinicalContent`), so a medic isn't confused when e.g. the drip
  content is verified but antibiotics aren't yet.
- **FR-4** `SourceBadge` (source document + version + citation + verified/
  unverified) shown on every card, per Constitution Art. IV.4 / existing SC-7.
- **FR-5** No interactivity beyond browsing — no dose calculator, no
  weight input, no drip hand-off. Explicitly out of scope (see §5).
- **FR-6** i18n: new `uk.json` keys for section headings and the MOZ card
  labels (drug of choice / alternative / duration); no hardcoded UI strings.

## 4. Acceptance criteria

- **AC-1** With the current seed (0 antibiotic records `VERIFIED`), opening
  "Препарати" shows: the TCCC-antibiotics section empty state, the MOZ section
  empty state, and the existing "Інші препарати" list unaffected (still shows
  whatever's `VERIFIED` there, e.g. ketamine records once verified).
- **AC-2** Once the Owner verifies e.g. `tccc_cefadroxil_po`, it appears in the
  TCCC section with its `SourceBadge`; unverified siblings stay hidden (compiled
  bundle already enforces this — automated via `guard.test.ts` pattern).
- **AC-3** Once the Owner verifies a `moz_prophylaxis_*` record and its
  referenced drug record(s), the MOZ card resolves drug names/doses correctly
  from the id arrays (not raw text duplication).
- **AC-4** No UNVERIFIED badge or raw value ever renders (existing
  `disclaimer.test.tsx` "never leaks an unverified record" style assertion,
  extended to the new sections).
- **AC-5 (SC-3)** Zero network calls from this screen (existing `offline.test.tsx`
  coverage extends automatically — no new I/O added).

## 5. Out of scope (this feature)

Dosing calculator or drip integration for antibiotics; pediatric antibiotic
doses (`IDEAS.md`, parked); the CNS combination decision-tree UI (Open Clinical
Question C.2 — this feature only *displays* the drug-of-choice/alternative
arrays as transcribed, it does not render the branching logic as an interactive
tree); a schema `category` field (deferred — see FR-1.1 note); Owner
verification of any of the ~29 records (M1/M3 work, tracked in
`OPEN-CLINICAL-QUESTIONS.md` §C).

## 6. Edge cases

- A `moz_prophylaxis_*` record verified while its referenced `drug_of_choice`
  record is **not** — resolve what's renderable, show a "деталі препарату ще не
  підтверджено" note for the unresolved one rather than throwing (fail closed at
  the *field*, not the whole card).
- Empty `alternative` array — section simply omitted from the card, not shown as
  empty.

## Clarifications needed

- None blocking — this spec reflects the Owner's direct verbal scope (2026-07-17).
  Revisit the `TCCC_ANTIBIOTIC_IDS` allowlist-vs-schema-field choice if/when more
  TCCC antibiotic records are added.
