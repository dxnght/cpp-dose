# Spec 003 — Burn Fluid Rate (simplified — Rule of Ten, manual %TBSA)

- **Feature ID:** 003-burn-resuscitation
- **Status:** Draft → pending Owner approval
- **Priority:** P0 (Sprint 2)
- **Version:** 1.1 (simplified — body diagram deferred; manual %TBSA entry)
- **Depends on:** 005-clinical-content-pipeline (`burn_rule_of_ten` formula),
  001 (rate → gtt/min hand-off).
- **Supersedes:** Parkland (removed — ADR-0003).

## Constitution Check

- **Art. I:** the burn initial-rate rule is the `burn_rule_of_ten` **clinical**
  formula (TCCC 2026 §15.e). No values invented; Parkland excluded (no source). ✔
- **Art. II/III:** clinical formula → must be `VERIFIED` to display; at seed it is
  `UNVERIFIED`, so the module shows the fail-closed state. ✔

---

## 1. Why

For significant burns the medic must start fluids and set an initial rate fast.
TCCC 2026 uses the **USAISR Rule of Ten**. In this MVP the medic **enters %TBSA
manually** (estimated by Rule of Nines in their head / on paper) plus weight; the
app computes the initial ml/hr and treats it as one **burn-fluid drip** in the drip
engine. **The tappable body diagram is deferred to `IDEAS.md`.**

## 2. User stories

- **US-1** I enter an estimated **%TBSA** (numeric) and **weight**, and get the
  **initial fluid rate (ml/hr)** per the Rule of Ten, with the arithmetic shown.
- **US-2** I send that rate + my bag volume to the drip engine → **gtt/min**, as one
  of my concurrent drips.
- **US-3** I see the applicability/cautions (>20% TBSA; hemorrhagic shock takes
  precedence) as source-tagged guidance, not auto-decisions.

## 3. Functional requirements

- **FR-1** Manual **%TBSA** input (0–100, guidance to estimate to nearest 10% by
  Rule of Nines). **No body diagram in the MVP.**
- **FR-2** Rate: `rate_ml_per_hr = TBSA% × 10` for adults 40–80 kg; for weight
  >80 kg, `+100 ml/hr` per full 10 kg above 80. Computed strictly from the
  `burn_rule_of_ten` record's `expression`.
- **FR-3** Show the arithmetic (e.g. "40% × 10 = 400 ml/hr; +200 for 100 kg =
  **600 ml/hr**").
- **FR-4** Applicability guidance: >20% TBSA; shock resuscitation precedence — shown
  as source text, not decisions.
- **FR-5** Hand-off: "send to drip" → Spec 001 (medic supplies bag volume → gtt/min).
- **FR-6** Fluid choices from the record notes (LR, NS, or Hextend ≤1000 ml then
  LR/NS) shown as reference text, source-tagged. No new values.
- **FR-7** Weight bounds / sub-40 kg behavior per the resolved clamp
  (`TODO(clinical-review)`); out-of-range → suppressed, never extrapolated.

## 4. Acceptance criteria

- **AC-1 (SC-4)** With the formula `UNVERIFIED` (seed), the module shows the fail-
  closed state and computes nothing.
- **AC-2** After the Owner verifies `burn_rule_of_ten`:
  (40% TBSA, 70 kg) → **400 ml/hr**; (40% TBSA, 100 kg) → **600 ml/hr**;
  (30% TBSA, 80 kg) → **300 ml/hr**. (Automated, checked vs the source expression.)
- **AC-3** Computed rate → drip engine → correct gtt/min for a given volume/drop-
  factor.
- **AC-4 (SC-7)** Source citation (TCCC 2026 §15.e) + version visible on the result.
- **AC-5 (SC-3)** Airplane mode; zero network.

## 5. Out of scope (this feature)

Rule-of-Nines **body diagram** (→ IDEAS), Lund–Browder chart, ongoing titration to
urine output, pediatric burn resuscitation, Parkland.

## 6. Edge cases

- TBSA ≤20% → state that Rule-of-Ten resuscitation is generally not indicated on
  that basis alone; defer to source/judgement (no fabricated guidance).
- Weight <40 kg or very high → `TODO(clinical-review)`; suppress rather than
  extrapolate the +100/10 kg rule beyond the source.

## Clarifications needed

- Sub-40 kg / pediatric handling (shared with Spec 002).
- Whether burn fluid appears as its own screen or simply as a special entry in the
  drip list (Spec 002). Recommend: a special entry that opens the %TBSA+weight
  inputs. Owner to confirm.
