# Sprint 2 — Drip Drug List + Simplified Burn Fluid

**Goal:** a curated list of drip medications/fluids (verified-only) feeds the
infusion recipe → drip engine; burn fluid works via manual %TBSA + Rule of Ten.

**Primary specs:** 002 (Drip Drug List & Infusion Recipe, v1.1), 003 (Burn Fluid,
v1.1).

## Backlog

- **T2.1** Drip list built **only** from `VERIFIED`, drip-eligible records (those
  with an `infusion` block) in the field bundle. *(002 FR-1/2, Art. II)*
- **T2.2** Infusion recipe inputs: actual dose, diluent volume (ml), target time
  (or rate) → ml/hr → hand to Spec 001 for gtt/min. *(002 FR-3)*
- **T2.3** Optional weight input, shown **only** for `dose_per_kg` records; mg/kg ×
  weight arithmetic shown; fixed-dose records hide weight. *(002 FR-4)*
- **T2.4** `max_dose`/`min_max` clamps; over-max blocked with the max shown.
  *(002 FR-5, Art. III)*
- **T2.5** Ranges preserved verbatim; never point-collapsed. *(002 FR-6)*
- **T2.6** Source + verification badge on every result; citation on demand.
  *(002 FR-7, SC-7)*
- **T2.7** Confirm-to-reveal before the final prepared dose/rate. *(002 FR-8)*
- **T2.8** Start a prepared drip as one of the (up to 3) concurrent drips. *(→ Spec 001)*
- **T2.9 (burn)** Manual **%TBSA** numeric input (no body diagram). *(003 FR-1)*
- **T2.10 (burn)** Rule of Ten rate from `burn_rule_of_ten`; arithmetic + >80 kg
  extension shown. *(003 FR-2/3)*
- **T2.11 (burn)** Applicability/caution prompts (>20% TBSA; shock precedence) as
  source text; rate → drip hand-off. *(003 FR-4/5)*

## Acceptance criteria (exit)

- **AC-2.1 (SC-4)** With seed (all UNVERIFIED) the drip list and burn module show
  the fail-closed "no verified content" state and compute nothing.
- **AC-2.2** After the Owner verifies a drip record, it appears; selecting it opens
  the infusion recipe; a `dose_per_kg` record shows arithmetic and updates with
  optional weight.
- **AC-2.3** Example recipe math (engineering, testable now): a dose in 500 ml over
  20 h → ml/hr → Spec 001 → **8 gtt/min at 20 gtt/ml**.
- **AC-2.4** Over-max dose blocked with the max stated.
- **AC-2.5 (Spec 003 AC-2)** With `burn_rule_of_ten` verified: (40%,70 kg)=400;
  (40%,100 kg)=600; (30%,80 kg)=300 ml/hr; sends correctly to the drip engine.
- **AC-2.6 (SC-7)** No dose/rate renders without a source + verification tag.
- **AC-2.7 (SC-3)** Offline; zero network.

## Definition of Done

Global DoD + AC-2.x green. Any needed value absent from a source is logged as
`TODO(clinical-review)` — never invented. (Most drip doses need a registered PCC
source first — see `IDEAS.md` "PCC source registration".)

## Risks

- **Drip-dose source coverage (R3)** — continuous-infusion doses live in the JTS PCC
  guidelines, not yet registered. Until the Owner registers + verifies a PCC source,
  the drip list stays empty (fail-closed). Register the source before Sprint 2 to
  have content to build against.
