# CLAUDE.md — operating rules for agents in this repo

You are working on **CPP-DOSE**, a safety-critical field dosing/drip tool. Read
this fully before acting. `memory/constitution.md` overrides everything.

## The five hard rules (violating any = stop and fail the task)

1. **Never originate a clinical value.** No inventing, extrapolating, rounding for
   convenience, or "recalling from training" a drug name, dose, concentration,
   rate, duration, or formula. A value enters ONLY by transcription from a
   registered source in `clinical/sources/` with a `source_citation`. If a value
   is missing, write the literal `TODO(clinical-review)` and add a row to
   `clinical/OPEN-CLINICAL-QUESTIONS.md`. (Constitution Art. I.)
2. **Never write a `VERIFIED:` status.** Only the Owner does that. You may write
   `UNVERIFIED` or `TODO(clinical-review)`. (Art. II.)
3. **Offline only, zero exfiltration.** No `fetch`/XHR/`sendBeacon`, no analytics,
   no accounts, no network at runtime. Ever. (Art. V.)
4. **Fail closed.** The app must never display a non-`VERIFIED` clinical record in
   field mode. When unsure, show nothing with a reason — never a fabricated number.
   (Art. III.)
5. **Spec before code.** Implement only what an approved `specs/*/spec.md` defines.
   Do not add scope; route ideas to `IDEAS.md`. If a spec is ambiguous, stop and
   write the question — do not decide it silently in code. (Art. VI, VIII.)

## Read order before any task

1. `memory/constitution.md`
2. the `specs/*/spec.md` for the feature you're building
3. `plan/architecture.md` + `plan/data-model.md`
4. the relevant `sprints/sprint-0X-*.md` (your task list + acceptance criteria)
5. relevant `decisions/ADR-*.md`

## Workflow for each unit of work

- Begin with a one-line **Constitution Check** (which articles apply).
- Implement the smallest change that satisfies a spec FR/AC.
- Write/keep tests green (see below). Every clinical number rendered must show
  `source_version` + `review_status`.
- End with a **Constitution Check** + note any new `TODO(clinical-review)`.
- Never mark a sprint task done if tests fail or an AC is unmet.

## Commands (wire these up in Sprint 0; use them thereafter)

- `npm run validate` — JSON-Schema-validate `clinical/uk-cpp.v1.json` against
  `clinical/protocol.schema.json`. Must pass.
- `npm run verify` — list all non-`VERIFIED` / `TODO` records by source (Owner
  checklist). Read-only; never mutate status.
- `npm run compile:field` — build `field-bundle.json` (only `VERIFIED` + archived
  records, plus `engineering` formulas). This is what the app loads in field mode.
- `npm run test` — unit + timing + offline (zero-network) + guard tests.
- `npm run gate:release` — fails if any exposed record is unverified/un-archived
  or any included content still contains `TODO(`.

## Definition of done (per task)

Global DoD in `sprints/sprint-plan.md` + the task's AC green + no new network calls
+ no invented clinical values + specs/ADRs updated if a decision changed.

## When to STOP and leave it for the human

- A dose/rate/formula value isn't clearly in a registered source → `TODO(clinical-review)`.
- A spec is ambiguous or two sources conflict without a resolving ADR.
- A change would require network access, telemetry, or storing patient data.
- You'd need to write a `VERIFIED:` status to make something appear.

Leaving a correct `TODO` is success. Guessing to "finish" is failure.
