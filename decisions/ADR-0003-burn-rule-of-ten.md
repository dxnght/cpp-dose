# ADR-0003 — Burn resuscitation uses the Rule of Ten (Parkland removed)

- **Status:** Accepted (2026-07-12)
- **Deciders:** Owner
- **Related:** Constitution Art. I; Spec 003; `clinical/uk-cpp.v1.json`
  (`burn_rule_of_ten`)

## Context

The original plan specified the **Parkland** formula (`k × weight × TBSA`, half in
the first 8 h, `k` slider 2–4). But **TCCC 2026 §15.e** does not use Parkland for
prehospital burn resuscitation; it uses the **USAISR Rule of Ten**:

> Initial IV/IO rate = **%TBSA × 10 ml/hr** for adults **40–80 kg**; **+100 ml/hr**
> per **10 kg above 80 kg**. Applies to burns **>20% TBSA**.

Per the Owner's red line, the app uses only values present in a registered source.
Parkland is not in either registered source.

## Decision

Implement burn initial-rate using the **Rule of Ten** (`burn_rule_of_ten`,
`kind: clinical`, sourced to TCCC 2026 §15.e). **Remove Parkland** and its `k`
slider from the MVP.

## Consequences

- (+) Burn output matches the governing field protocol (TCCC 2026).
- (+) Simpler UI (no `k` parameter, no 8-h split logic for MVP).
- (−) Users expecting Parkland must adjust; documented in the module.
- Parkland may be reintroduced **only** if a current MOZ (or other registered)
  protocol prescribing it is added to the Source Registry and verified by the
  Owner.

## Alternatives considered

- **Keep Parkland:** rejected — no registered source; violates Art. I.
- **Offer both:** rejected for MVP — two burn formulas raise misuse risk under
  stress; can be revisited if a source justifies it.
