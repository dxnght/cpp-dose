# Spec 005 — Clinical Content Pipeline

- **Feature ID:** 005-clinical-content-pipeline
- **Status:** Draft → pending Owner approval
- **Priority:** P0 — this is the safety substrate; every other feature depends on it.
- **Constitution:** enforces Articles I, II, III, IV, VII directly.

## Constitution Check

This spec *is* the operationalization of Articles I–III. It introduces the
mechanisms (schema, source registry, verification states, release gate) that make
those articles enforceable rather than aspirational. ✔

---

## 1. Why

A clinical number in this app must be **traceable, source-tagged, verified by the
Owner, and impossible to fabricate.** This feature is the pipeline that carries a
value from an official source into the UI while preserving those properties. No
dose is displayed except through this pipeline.

## 2. Actors

- **Author (agent or human):** transcribes values from a registered source into
  the protocol file as `UNVERIFIED`, or writes `TODO(clinical-review)`.
- **Owner:** verifies against source and promotes records to `VERIFIED`.
- **App (runtime):** reads only the compiled, verified subset in field mode.
- **Auditor:** walks the trace chain from a rendered number back to source text.

## 3. Data model (summary; full schema in `clinical/protocol.schema.json`)

The protocol file (`clinical/uk-cpp.v1.json`) contains:

- `meta` — schema version, protocol version, build disclaimer text.
- `sources[]` — the Source Registry: each governing document with
  `id`, `title`, `publisher`, `version`/date, `checksum`, `archived_path`.
- `drugs[]` — canonical dose records. Each: `id`, `drug`, `indication`, `route`,
  one of `fixed_dose` | `dose_per_kg`, `max_dose`, `dilution`, `rate`,
  `source_document`, `source_version`, `source_citation`, `review_status`,
  `min_max` clamps, `notes`.
- `antibiotic_prophylaxis[]` — MOZ indication→regimen mappings by `injury_type`,
  referencing `drugs[]` by id, with `duration` and `source_*` tags.
- `formulas[]` — computational rules (e.g. burn Rule of Ten). Clinical formulas
  carry `review_status`; pure engineering formulas are flagged
  `kind: "engineering"` and are exempt from Owner verification but still cited.

## 4. Functional requirements

- **FR-1** Every `drugs[]`, `antibiotic_prophylaxis[]`, and clinical `formulas[]`
  record MUST carry `source_document`, `source_version`, `source_citation`, and
  `review_status`. Schema validation fails the build otherwise.
- **FR-2** `review_status` ∈ {`UNVERIFIED`, `TODO(clinical-review)`,
  `VERIFIED:<name>:<YYYY-MM-DD>`}. Regex-enforced by schema.
- **FR-3** A build **compiled for field use** MUST exclude (not merely hide) every
  record whose `review_status` is not `VERIFIED:*`. The compile step emits a
  `field-bundle.json` containing only verified records; the app in field mode
  loads only this bundle.
- **FR-4** A `verify` CLI/report lists all `UNVERIFIED` and `TODO(clinical-review)`
  records grouped by source, for the Owner. It never mutates status.
- **FR-5** Promotion to `VERIFIED` is a manual Owner edit (or an Owner-run signed
  command) and appends an entry to `clinical/VERIFICATION-LOG.md`. No agent path
  may write a `VERIFIED` status (enforced in code review + a lint rule).
- **FR-6** Each drug carries `min_max` dose clamps and each calculator carries
  weight bounds; a computed value outside clamps is suppressed with a reason
  (Constitution Art. III).
- **FR-7** Source documents are archived read-only under `clinical/sources/` with
  a recorded checksum; the registry references them so "which text" is auditable.
- **FR-8** Changing any clinical value requires a protocol-version bump
  (`meta.protocol_version`) and re-verification of the touched records.

## 5. Acceptance criteria

- **AC-1** `clinical/uk-cpp.v1.json` validates against
  `clinical/protocol.schema.json`. (Automated.)
- **AC-2** With the seed data (all `UNVERIFIED`), the field-bundle compile
  produces an **empty** clinical set and the app shows the "no verified content"
  state — proving fail-closed. (Automated.)
- **AC-3** After marking one record `VERIFIED:...`, only that record appears in the
  field bundle. (Automated.)
- **AC-4** Attempting to render a non-verified record in field mode throws in
  tests / is unreachable by construction. (Automated + review.)
- **AC-5** The `verify` report enumerates every unverified/TODO record with its
  source and citation. (Automated.)
- **AC-6** Removing a `source_citation` from any record fails schema validation.
  (Automated.)

## 6. Out of scope

Remote content updates, content signing/PKI, multi-language content (Ukrainian
content strings are handled in the UI layer; this pipeline is language-agnostic on
values). Pediatric dosing is present in the source but parked (`IDEAS.md`).

## 7. Notes for authors/agents

- Transcribe *exactly*. Preserve units and ranges as written (e.g. "15–20 mg/kg",
  "q8–12h"). Do not normalize or "simplify".
- If a source gives a range, store the range; do not pick a point value.
- If a datum is absent, write `TODO(clinical-review)` and add a line to
  `clinical/OPEN-CLINICAL-QUESTIONS.md`. Never infer.
