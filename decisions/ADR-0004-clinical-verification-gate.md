# ADR-0004 — Owner-only verification gate, fail-closed by construction

- **Status:** Accepted (2026-07-12)
- **Deciders:** Owner
- **Related:** Constitution Art. I–III, VII; Spec 005; `plan/data-model.md`

## Context

A wrong clinical number can kill. The original plan flipped `review_status` to
VERIFIED on a combat-medicine instructor's confirmation and relied on the app to
"refuse to show" unverified records. Two hardening points: (1) the Owner is the
sole accountable authority per the red lines; (2) "refuse to show at runtime" is
weaker than "never present in the shipped data."

## Decision

1. **Only the Owner** promotes a record to `VERIFIED:<name>:<date>`. An instructor
   may advise, but the Owner signs. **Agents may never write a `VERIFIED` status.**
2. **Fail-closed by construction:** the field build compiles a `field-bundle.json`
   that contains only `VERIFIED` records (plus deterministic engineering formulas).
   The app in field mode loads only that bundle and never the authoring file, so an
   unverified value is *absent*, not merely hidden.
3. A **release gate** fails any field build that would expose an unverified or
   un-archived record, or that still contains a `TODO(` marker in included content.
4. Verification events are logged in `clinical/VERIFICATION-LOG.md` and encoded in
   the data (`review_status`) for end-to-end auditability.

## Consequences

- (+) An unverified dose cannot reach the field UI even via a coding mistake.
- (+) Clear accountability and an audit trail (who/what/when/against which version).
- (−) At seed, the field app shows "no verified content" until the Owner works
  through the backlog — this is intended and demonstrates the gate.
- (−) Verification is manual Owner effort; supported by the `verify` report.

## Alternatives considered

- **Runtime-only hiding of UNVERIFIED:** rejected — a single rendering bug could
  leak a bad value.
- **Instructor sign-off writes VERIFIED:** rejected — dilutes accountability; kept
  as advisory only.
