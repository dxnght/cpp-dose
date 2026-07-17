# Sprint 4 — Antibiotics Reference (M3 growth, post-v1.0)

**Goal:** a clearly organized, read-only antibiotics reference living in the
"Препарати" tab — TCCC 2026 general recommendations and MOZ 2023 by-injury
prophylaxis, each separately source-badged. No dosing/drip integration.

**Primary spec:** 004-antibiotics-reference (v1.0). **ADR:** 0007.
**Branch:** `feature/antibiotics-reference` (not `master` — ROADMAP M3, does not
block the shipped v1.0 focused-minimum drip set).

## Backlog

- **T4.1** Correct `antibiotic_prophylaxis[].injury_type` (12 records) from the
  seeded English paraphrase to the exact Ukrainian section wording in the
  archived MOZ source — label fix, no clinical value touched. *(Art. I)*
- **T4.2** `TCCC_ANTIBIOTIC_IDS` allowlist + TCCC antibiotics section in
  `DrugsScreen.tsx` (Cefadroxil/Cephalexin/Ceftriaxone×2). *(FR-1.1)*
- **T4.3** MOZ by-injury section: group `antibiotic_prophylaxis[]`, resolve
  `drug_of_choice`/`alternative` id arrays to drug records (name/route/dose).
  *(FR-1.2)*
- **T4.4** Per-section empty state, independent of the global
  `hasNoVerifiedClinicalContent` check. *(FR-3)*
- **T4.5** "Інші препарати" — keep the existing flat list for everything not in
  the antibiotics sections, unchanged behavior. *(FR-1.3)*
- **T4.6** i18n keys for section headings + MOZ card labels (no hardcoded
  strings). *(FR-6)*
- **T4.7** Test coverage: sections render their own empty state at seed;
  fail-closed still holds (no UNVERIFIED badge ever renders) across the new
  sections.

## Acceptance criteria (exit)

- **AC-4.1** Seed state (0 antibiotic records verified): both new sections show
  their empty state; "Інші препарати" unaffected.
- **AC-4.2** `npm run validate` green after the `injury_type` label fix.
- **AC-4.3** Fail-closed holds: no UNVERIFIED badge/value renders anywhere in
  "Препарати" (existing `disclaimer.test.tsx` pattern extended).
- **AC-4.4 (SC-3)** Zero new network calls (`offline.test.tsx` unaffected).
- **AC-4.5** `npm run lint && npm run test && npm run build` all green on the
  branch.

## Definition of Done

Global DoD + AC-4.x green + spec/ADR in place + branch isolated from `master`
until Owner review. Verifying the underlying ~29 antibiotic records against
their sources stays Owner-only work, tracked separately in
`clinical/OPEN-CLINICAL-QUESTIONS.md` §C — **not** part of this sprint's DoD.

## Risks

- Allowlist drift (R-a) — `TCCC_ANTIBIOTIC_IDS` must be updated by hand if more
  TCCC antibiotic records are seeded; documented in ADR-0007 as a revisit
  trigger.
- CNS combination branching (R-b) — displayed as transcribed arrays, not an
  interactive decision tree; Open Question C.1 stays open until the Owner
  confirms the exact branching logic.
