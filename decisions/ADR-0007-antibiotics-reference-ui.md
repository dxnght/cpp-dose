# ADR-0007 — Antibiotics reference: read-only, source-separated, in "Препарати"

- **Status:** Accepted (2026-07-17)
- **Deciders:** Owner
- **Related:** Constitution Art. I/III/VI; ADR-0002 (source hierarchy); Spec 004;
  `IDEAS.md` ("Antibiotic by injury type browser"); `clinical/OPEN-CLINICAL-QUESTIONS.md` §C.1

## Context

ADR-0002 set the antibiotic source hierarchy (TCCC 2026 primary/general, MOZ 2023
for by-injury prophylaxis) but explicitly left its "by injury type vs TCCC field"
**UI placement** as an open question. `IDEAS.md` parked a "guided by-injury-type
browser" as future work; the data (`antibiotic_prophylaxis[]`, ~29 drug/prophylaxis
records) has been seeded since Sprint 0 but never surfaced.

The Owner is now field-testing the Android build and asked to move this forward
without over-engineering it ("не сильно заморочуватися"): pull the MOZ table +
TCCC §12 into a clearly organized reference table, informational only, and prepare
it on a separate branch rather than on `master`.

## Decision

1. **No new screen/tab.** The content lives in the existing **"Препарати"**
   (`nav.drugs`) tab, not a new nav entry — it's already the natural home for a
   drug reference.
2. **Purely informational.** No dosing calculator, no drip hand-off, no
   interactive decision tree for the CNS branching logic (Open Question C.1
   stays open; the UI shows the transcribed drug-of-choice/alternative lists
   as-is, not a resolved algorithm).
3. **Clearly source-separated, not merged**, per ADR-0002 principle: a "TCCC
   2026" section (general combat-wound antibiotics, §12) and a separate "MOZ
   2023, за типом ураження" section (by-injury prophylaxis), each card carrying
   its own `SourceBadge`. Never one blended antibiotic list.
4. **TCCC antibiotic identification = explicit ID allowlist in the component**,
   not a new schema `category` field. `drugs[]` mixes antibiotics with
   analgesia/sedation/etc. with no categorization field today; adding one is a
   schema change with re-validation surface the Owner asked to avoid for this
   pass. A small, commented, easy-to-audit constant (`TCCC_ANTIBIOTIC_IDS`) in
   `DrugsScreen.tsx` is the minimal change. **Revisit** (schema `category`
   field) if/when the antibiotic set grows enough that the allowlist becomes
   unwieldy.
5. **Built on `feature/antibiotics-reference`, not `master`.** This is new scope
   beyond the shipped v1.0 focused-minimum (ROADMAP M3), so it stays isolated
   until reviewed and merged deliberately.
6. **Fail-closed unchanged.** Every card still resolves through the compiled,
   verified-only `field-bundle.json` + `assertRenderable`. At the time of this
   ADR none of the ~29 antibiotic records are `VERIFIED`, so both new sections
   render their local empty state on first build — expected, not a defect.

## Consequences

- (+) Reuses the existing tab/nav/fail-closed/i18n infrastructure — minimal new
  surface area, consistent with "не сильно заморочуватися."
- (+) Source provenance stays unambiguous, per ADR-0002.
- (+) Isolated on a branch — `master`/v1.0 field build is untouched until the
  Owner reviews and merges.
- (−) The `TCCC_ANTIBIOTIC_IDS` allowlist is a small piece of UI-layer knowledge
  that has to be kept in sync by hand if more TCCC antibiotic records are added
  (documented in the component + this ADR + Spec 004 §3 FR-1.1).
- (−) The screen ships "empty" (by design) until the Owner works through the
  M1/M3 verification backlog in `OPEN-CLINICAL-QUESTIONS.md` §C — a real medic
  won't see antibiotic content in the field build until that happens.

## Alternatives considered

- **New dedicated "Антибіотики" tab.** Rejected — adds nav surface for what is
  still a reference-only, unverified-pending feature; "Препарати" already fits.
- **Merge TCCC + MOZ into one flat sorted list.** Rejected — contradicts
  ADR-0002's provenance-first principle; a medic could misattribute a MOZ
  by-injury regimen as the general TCCC recommendation or vice versa.
- **Add a schema `category` field now.** Deferred, not rejected — correct
  long-term shape, but larger surface (schema + seed + validate + compile) than
  this pass calls for. Tracked as a revisit trigger in Decision §4.
