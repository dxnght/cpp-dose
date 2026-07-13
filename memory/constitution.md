# CPP-DOSE Constitution

> The supreme governing document of the CPP-DOSE project.
> Every spec, plan, task, line of code, and agent action MUST comply with this
> Constitution. Where any other document conflicts with this one, this one wins.

- **Project:** CPP-DOSE — weight→dose and IV drip-rate support tool for Prolonged
  Casualty Care (CPP / ПДП).
- **Owner (sole clinical authority):** Ihor (`probleminu@gmail.com`).
- **Version:** 1.0.0
- **Ratified:** 2026-07-12
- **Status:** ACTIVE

---

## Preamble

CPP-DOSE assists combat medics who must, under stress, at night, without
connectivity, compute weight-based drug doses and convert prepared volumes into
drops-per-minute on a gravity IV set. A wrong number can kill. This Constitution
exists to make it structurally difficult for the project — human or AI agent — to
ever ship a wrong or unverified clinical number.

This is a **reference / decision-support tool only.** It never replaces
protocols, medical direction, or clinical judgement.

---

## Article I — Clinical Source of Truth (RED LINE)

1. Every drug name, indication, route, dose, concentration, dilution, rate,
   duration, and every burn/fluid formula shown by the application MUST originate
   from a **current, official source** listed in the Source Registry
   (`clinical/sources/`). The two founding sources are:
   - **TCCC Guidelines 2026 (01 May 2026)** — primary clinical protocol for all
     modules (analgesia, TXA, fluids, burns, antibiotics-when-unable-to-take-PO,
     etc.).
   - **MOZ Ukraine Standard (2023)** — *"Профілактика інфекційних ускладнень
     бойових поранень антибактеріальними лікарськими засобами на догоспітальному
     етапі"* — governing reference for **antibiotic prophylaxis by injury type**.
2. **No agent (AI or human) may invent, extrapolate, interpolate, "recall from
   training," round-for-convenience, or otherwise originate a clinical value.**
   Transcription from a registered source, with an exact citation, is the *only*
   permitted way a clinical value enters the system.
3. If a required value is **not present** in a registered source, the field MUST
   be left as the literal placeholder `TODO(clinical-review)` and surfaced to the
   Owner in `clinical/OPEN-CLINICAL-QUESTIONS.md`. It MUST NOT be guessed.
4. Every clinical record MUST carry a **source-and-version tag**:
   `source_document`, `source_version`, and a `source_citation` locating the
   value in that document (section / table / page).

## Article II — Owner Verification Gate (RED LINE)

1. Every clinical record has a `review_status` of exactly one of:
   `UNVERIFIED` | `VERIFIED:<name>:<YYYY-MM-DD>` | `TODO(clinical-review)`.
2. Agents and importers MAY create records only as `UNVERIFIED` (or
   `TODO(clinical-review)`). **Agents may never write a `VERIFIED:` status.**
3. Only the **Owner** promotes a record to `VERIFIED:<name>:<date>`, after
   confirming the value against the source (optionally with a combat-medicine
   instructor as adviser — but the Owner signs).
4. **Release gate:** no build may be tagged for field use while any clinically
   active record it exposes is `UNVERIFIED` or `TODO(clinical-review)`. The build
   MUST fail closed (see Article III).

## Article III — Fail Closed, Never Guess

1. In normal (field) mode the app MUST **refuse to display** any record that is
   not `VERIFIED`. Unverified content is visible only behind an explicit,
   non-shippable `dev` flag, clearly watermarked.
2. When an input is out of a defined safe range, or a required datum is missing,
   the app shows a clear refusal/blank — **never a fabricated or extrapolated
   number.**
3. Every drug carries hard min/max dose clamps and the patient weight carries
   hard min/max bounds, both sourced. A computed value outside clamps is
   suppressed with an explanation, not shown.

## Article IV — Safety Interlocks in the UI

1. A persistent, always-visible disclaimer banner states the tool is
   decision-support only and does not replace protocols or clinical judgement.
2. A full disclaimer is shown on first launch and is reachable from every screen.
3. Computed doses require an explicit confirm action (e.g. double-tap /
   press-and-hold) before the final number is revealed, to prevent misreads from
   accidental input.
4. Every screen that shows a clinical number also shows its `source_version` and
   verification state.

## Article V — Offline-First & Zero Data Exfiltration

1. The app performs **no network calls during operation, ever.** It is fully
   functional in airplane mode.
2. No accounts, no telemetry, no analytics, no patient records, no data
   transmission of any kind in the MVP (see `specs/000-product-overview`).
3. All clinical content ships bundled and versioned inside the app; updates
   happen only via a new app build gated by Article II.

## Article VI — Spec-Driven Development (process law)

1. Work order is **Constitution → Spec → Plan → Tasks → Implementation.** Code is
   never written ahead of an approved spec for the feature it implements.
2. The **spec** states WHAT and WHY (user value, acceptance criteria) and is free
   of implementation detail. The **plan** states HOW (stack, architecture). Tasks
   are the ordered, testable steps.
3. Every non-trivial or irreversible decision is captured as an **ADR** in
   `decisions/` so an auditor can later see *why* a choice was made.
4. Ambiguities are resolved in writing (in the spec's Clarifications section or a
   new ADR) before implementation — not silently decided in code.

## Article VII — Auditability

1. Clinical values are traceable end-to-end: rendered number → protocol record →
   `source_document` + `source_version` + `source_citation` → registered source
   file. An auditor can walk this chain without reading code.
2. Verification events (who verified what, when, against which source version) are
   recorded in the protocol data itself via the `review_status` field and in
   `clinical/VERIFICATION-LOG.md`.
3. Source documents are archived read-only under `clinical/sources/` with a
   checksum, so "which exact text did we build against" is always answerable.

## Article VIII — Scope Discipline

1. The MVP scope is fixed in `specs/000-product-overview`. Anything outside it
   goes to `IDEAS.md`, not into the build.
2. Adding scope requires an amendment to the overview spec and, if it changes a
   principle here, an amendment to this Constitution.

---

## Amendment Process

- This Constitution may be amended only by the Owner.
- An amendment bumps the version (semantic: MAJOR for a principle
  removal/redefinition, MINOR for a new principle/section, PATCH for wording),
  updates the date, and is recorded in the Change Log below.
- Any amendment touching Articles I–III (the clinical red lines) additionally
  requires a one-line written rationale in the Change Log.

## Compliance Review

- Every spec and plan begins with a "Constitution Check" confirming it does not
  violate Articles I–VIII.
- Every PR/agent hand-off ends with the same check. A violation blocks merge.

## Change Log

| Version | Date       | Change                                  | Author |
|---------|------------|-----------------------------------------|--------|
| 1.0.0   | 2026-07-12 | Initial ratification.                   | Owner  |
