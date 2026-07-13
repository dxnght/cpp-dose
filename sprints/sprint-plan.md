# Sprint Plan — CPP-DOSE MVP (P0)

Four sprints. The original plan's M1–M3 assumed feature work in week 1, but the
safety pipeline and app scaffold must exist first. So a **Sprint 0 (Foundation)**
is inserted before the drip core. Each sprint ends with the sprint's own
acceptance criteria (traced to the feature specs) all green.

## Sequence

| Sprint | Theme | Primary specs | Exit = these ACs green |
|--------|-------|---------------|------------------------|
| **0** | Foundation & clinical pipeline | 005, 000, `plan/*` | schema valid, fail-closed proven, offline shell, disclaimer |
| **1** | Drip engine (rate + metronome + up to 3 concurrent + 5-min alarm) | 001 | SC-1, SC-2, SC-9, drip ACs, offline |
| **2** | Drip drug list + simplified burn fluid | 002, 003 | list/recipe + burn-rate ACs, source badges, fail-closed |
| **3** | Field hardening | 000, all | night UI, ≥48 px, PWA/APK, disclaimer everywhere |

## Global Definition of Done (every sprint)

- Starts and ends with a **Constitution Check** (Art. I–VIII).
- New/changed behavior is covered by automated tests.
- No runtime network calls introduced (offline test stays green).
- No clinical value added except via the pipeline (source-tagged, `UNVERIFIED`
  unless the Owner verified it). No `VERIFIED` written by an agent.
- Specs/ADRs updated if a decision changed; open questions logged, not guessed.
- `verify` report reviewed; new `TODO(clinical-review)` items land in
  `clinical/OPEN-CLINICAL-QUESTIONS.md`.

## Cadence / capacity assumptions

- One implementer (or a claude-code agent pair) per sprint; ~1 week each.
- The **Owner runs clinical verification in parallel** with Sprints 1–3 using the
  `verify` report; a record only ships once `VERIFIED`. Field APK for real use is
  not released until the Owner has verified the content it exposes (release gate).

## Traceability

Every backlog item references a spec FR/AC. Every AC references a Spec-000 success
criterion (SC-n) where applicable. Auditors read: SC → spec AC → sprint task → ADR.

## Release gate (before any field build)

1. All exposed records `VERIFIED` + sources archived with checksums.
2. All Spec-000 success criteria (SC-1…SC-9) green.
3. Owner sign-off recorded in `clinical/VERIFICATION-LOG.md`.
