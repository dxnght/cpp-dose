# Technical Plan — Data Model

Authoritative schema: `clinical/protocol.schema.json`. Seed instance:
`clinical/uk-cpp.v1.json`. This document explains the entities and how they flow
to the app.

## Entities

```
Source (sources[])
  id, title, publisher, version, checksum_sha256, archived_path, url?

Drug (drugs[])
  id, drug, indication, route,
  fixed_dose? | dose_per_kg?  (at least one required),
  max_dose?, dilution?, rate?, min_max{min,max}?, notes?,
  source_document→Source.id, source_version, source_citation,
  review_status

ProphylaxisRegimen (antibiotic_prophylaxis[])
  id, injury_type,
  drug_of_choice[]→Drug.id, alternative[]→Drug.id,
  duration, notes?,
  source_document→Source.id, source_version, source_citation,
  review_status

Formula (formulas[])
  id, name, kind(clinical|engineering), expression, inputs[], applicability?,
  notes?, source_document→Source.id, source_version, source_citation,
  review_status
```

## Relationships

- `Drug.source_document`, `ProphylaxisRegimen.source_document`,
  `Formula.source_document` reference `Source.id` (validated in CI, not by the
  schema itself).
- `ProphylaxisRegimen.drug_of_choice[]` / `alternative[]` reference `Drug.id`
  (multiple ids in `drug_of_choice` = a combined "…and…" regimen).
- Nothing references patient data — there is none (Art. V).

## `review_status` state machine

```
                (author: agent/human)
        ┌────────────────────────────────┐
        ▼                                 │
   UNVERIFIED  ──────Owner verifies──────►  VERIFIED:<name>:<YYYY-MM-DD>
        ▲                                 │
        │            source version       │
        └──────────changes ◄──────────────┘
  TODO(clinical-review)  = value absent from source; never displayed
```

- Agents/importers may write `UNVERIFIED` or `TODO(clinical-review)` only.
- Only the Owner writes `VERIFIED:*` (enforced by review + lint; the compile step
  and release gate assume this invariant).
- A source-version change reverts dependent records to `UNVERIFIED`.

## Field-bundle projection (what the app actually loads)

`field-bundle.json = compile(uk-cpp.v1.json)` where a record is included iff:

- `Formula.kind == "engineering"` (deterministic math, always included), **or**
- `review_status` matches `^VERIFIED:` **and** its `Source.checksum_sha256` is a
  real checksum (not `TODO(archive-source)`).

Excluded records are absent from the bundle — not flagged, not hidden — so the app
cannot render them. At seed, the projection yields only the `drip_rate`
engineering formula; every clinical record is excluded (fail-closed, AC-2/SC-4).

## Units & ranges policy

- Values are stored **as written in the source** (strings), including ranges
  ("15–20 mg/kg") and intervals ("q8–12h"). The app parses for computation but
  **always displays the original**; it never silently converts or point-collapses
  a range (Spec 002 FR-5).
- Weight-scaled computation is shown as arithmetic, not just a result.

## Versioning

- `meta.protocol_version` bumps on any clinical change; new source documents get a
  new `sources[]` entry and a new archived file (old ones are never edited).
- The app displays `source_version` per record and the overall
  `meta.protocol_version` in an "About / sources" screen for auditors.

## Example trace (auditor walk)

Rendered "TXA 2 g IV/IO" → `drugs[tccc_txa]` → `source_document: TCCC-2026`,
`source_version: 01 May 2026`, `source_citation: TFC §6.d` → `sources[TCCC-2026]`
→ archived PDF + checksum. The number never existed outside this chain.
