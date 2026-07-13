# ADR-0002 — Source hierarchy: TCCC 2026 primary, MOZ 2023 for antibiotic prophylaxis

- **Status:** Accepted (2026-07-12)
- **Deciders:** Owner
- **Related:** Constitution Art. I; Spec 000, 002, 005; `clinical/uk-cpp.v1.json`

## Context

Two governing sources were supplied and they **disagree** on antibiotics:

- **TCCC 2026 §12** — Cefadroxil 1 g PO daily / Cephalexin 500 mg PO q6h; if unable
  to take PO, Ceftriaxone 2 g IV/IO/IM daily.
- **MOZ Standard 2023** — prophylaxis **by injury type** (Cefazolin 2 g IV q8h as
  drug of choice; Clindamycin, Ertapenem, Metronidazole, Moxifloxacin,
  Levofloxacin, Vancomycin, Ciprofloxacin as alternatives/adjuncts).

Both are legitimate for different purposes. The app must never present a value
without making its source unambiguous (Art. I).

## Decision

- **TCCC 2026 is the primary clinical base** for all modules (analgesia, TXA,
  fluids, burns, TBI, and antibiotics-when-unable-to-take-PO).
- **The MOZ 2023 Standard is the source-tagged reference for antibiotic
  prophylaxis by injury type** (extremity, thorax, abdomen, maxillofacial, CNS,
  eye, burns), modeled in `antibiotic_prophylaxis[]`.
- **Every clinical record carries its own `source_document`.** Where antibiotics
  are shown, the UI states which source the recommendation comes from.

## Consequences

- (+) No blending of two regimens into an unattributed recommendation.
- (+) Auditors see exactly which document backs each antibiotic.
- (−) Two antibiotic pathways to learn; mitigated by clear per-record source
  badges and an explicit "by injury type" vs "TCCC field" separation (Spec 002
  open question on UI placement).

## Alternatives considered

- **Single merged antibiotic list:** rejected — would obscure provenance and risk
  mixing incompatible regimens.
- **MOZ primary:** rejected — the Owner's field protocol base is TCCC 2026; MOZ is
  scoped to prophylaxis.
