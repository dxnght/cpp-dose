# Spec 000 — Product Overview

- **Feature ID:** 000-product-overview
- **Status:** Draft → pending Owner approval
- **Owner:** Ihor
- **Version:** 1.1 (amended 2026-07-12 — narrowed to a drip-first MVP; see Change Log)
- **Constitution:** must comply with `memory/constitution.md` (all articles)

## Constitution Check

- Art. I/II (sources + verification): this spec defines *what* the app does, not
  clinical values. ✔ No values introduced here.
- Art. V (offline/zero-exfil): enshrined in scope and non-goals below. ✔
- Art. VIII (scope discipline): this document IS the scope boundary. This amendment
  narrows scope (allowed); nothing new is added beyond a drip-first core. ✔

---

## 1. Problem

During CPP (Prolonged Casualty Care / пролонгована допомога пораненому), medics run
**gravity IV infusions** — analgesic drips (e.g. ketamine), burn-shock fluids, and
other dripped medications/fluids — and must convert a prepared bag (dose in a
volume, over a target time) into **drops per minute**, then physically pace the
drip, under stress, at night, without connectivity. Existing Ukrainian apps are
protocol *readers*; international drip apps (e.g. Goterum) prove the UX pattern
(animated drop + metronome) but are paid, English-only, and not aligned with
TCCC/CPP protocols.

**MVP intent:** be a *good, focused analog* of those drip apps — a reliable drip
engine plus a small, curated, source-verified list of drip-able medications and
fluids. The drug stack grows slowly and deliberately after the MVP.

## 2. Users

- **Primary:** combat medic / військовий парамедик running IV infusions in the
  field, gloved, at night, offline, under time pressure.
- **Secondary (build-time):** the Owner and combat-medicine advisers verifying
  clinical content; auditors tracing why each number is shown.

## 3. Goals (what success looks like)

1. Convert an infusion (volume + target time, or target rate) into an integer
   **gtt/min** for the selected IV set, and pace it with a synchronized metronome
   (sound / vibration / animation).
2. Offer a **small curated list of drip medications/fluids**, each showing its
   **recommended dose** (from a registered source), then let the medic enter the
   **actual dose / diluent volume / target time** and get the drip rate.
3. Run **up to 3 concurrent drips**, each with its own rate, running total, and an
   **alarm 5 minutes before the bag empties** (and at empty).
4. Work **100% offline**, be legible at night, be operable with gloves.
5. Make it structurally impossible to display an unverified or invented clinical
   number (Constitution Art. I–III).

## 4. Scope (MVP / P0)

1. **Drip engine** — volume↔time↔rate calculator, IV-set drop-factor selection,
   metronome (audio + haptic + animation, independently mutable), end-of-bag timer
   with a **5-minute pre-end alarm**, and **up to 3 concurrent drips**.
   → `specs/001-drip-rate-core`.
2. **Drip drug list & infusion recipe** — a curated list of drip-able
   medications/fluids from the versioned protocol file; each shows its recommended
   dose; the medic enters actual dose / diluent volume / target time; output rate
   is handed to the drip engine. Weight input is optional (only for mg/kg doses).
   → `specs/002-weight-dose-calculator` (retitled "Drip Drug List & Infusion Recipe").
3. **Burn fluid (simplified)** — manual %TBSA entry + weight → **Rule of Ten** rate
   → treated as one burn-fluid drip. **No body diagram in the MVP.**
   → `specs/003-burn-resuscitation`.
4. **Clinical content pipeline** — versioned, source-tagged, Owner-verified data;
   the safety substrate for 1–3. → `specs/005-clinical-content-pipeline`.
5. **Field platform** — offline-first PWA, red/dark night theme, ≥48 px targets,
   Ukrainian UI, persistent disclaimer, Android APK **and native iOS app** (both
   offline, no server; vibration via Capacitor Haptics). → `plan/architecture.md`,
   Sprint 3.

## 5. Non-Goals (explicitly NOT in the MVP)

Accounts, sync, cloud, analytics/telemetry, patient records, **any** data
transmission, AI features, English UI, pediatric dosing, Parkland burn
formula, TQ-timer module, PFC care-timer module. **Newly deferred by this
amendment** (→ `IDEAS.md`): Rule-of-Nines **body diagram**; antibiotic
prophylaxis **by injury type**; a full weight×mg/kg dose calculator beyond the
simple infusion recipe; more than 3 concurrent drips; non-drip (bolus/push) drug
references. The antibiotic-prophylaxis data stays in the protocol file (all
`UNVERIFIED`) but is **not surfaced** in the MVP UI.

## 6. Success Criteria (measurable)

| # | Criterion | How measured |
|---|---|---|
| SC-1 | Given (500 ml, 4 h, 20 gtt/ml) → **42 gtt/min**; and (500 ml, 20 h, 20 gtt/ml) → **8 gtt/min**. | Automated unit tests. |
| SC-2 | Metronome audio+haptic+animation stay in sync **≥10 min**, drift **< 1 drop / 10 min**. | Automated timestamp test (Spec 001). |
| SC-3 | Fully functional in airplane mode; **zero** network requests at runtime. | CI assertion + manual airplane-mode run. |
| SC-4 | A record with `review_status != VERIFIED` is **never** rendered in field mode. | Automated test + review (Spec 005). |
| SC-5 | Disclaimer shown on first launch and reachable from every screen. | UI test. |
| SC-6 | All interactive targets ≥ 48 px; passes Lighthouse PWA installability. | Automated audit (Sprint 3). |
| SC-7 | Every displayed clinical number shows its `source_version` + verification state. | UI test. |
| SC-8 | APK installs and runs on the Owner's Android device. | Manual acceptance. |
| **SC-9** | **Up to 3 concurrent drips** each keep an independent rate + running timer + fire a **5-min pre-end alarm** and an at-empty alarm, offline. | Automated + manual test (Spec 001). |

## 7. Assumptions

- The registered sources supplied by the Owner (TCCC 2026; MOZ 2023; and any PCC
  guidelines the Owner later registers) are current and authoritative. Confirming
  currency is an Owner responsibility (Constitution Art. VII).
- Continuous-infusion (drip) doses generally live in the **JTS PCC guidelines**
  (analgesia/sedation, burns), not the condensed TCCC 2026 field card — so most
  drip-drug doses will be `TODO(clinical-review)` until the Owner registers and
  verifies a PCC source.
- Adult patients; weight input optional and only for mg/kg doses.

## 8. Dependencies & Risks

- **R1 — Clinical accuracy.** Mitigated by the pipeline + Owner gate (Art. I–III).
- **R2 — Audio/haptic timing drift.** Mitigated by AudioContext scheduling + SC-2
  drift test (ADR-0005).
- **R3 — Source coverage for drip doses.** Most drip doses need a PCC source;
  tracked in `clinical/OPEN-CLINICAL-QUESTIONS.md`.
- **R4 — Scope creep.** Mitigated by Art. VIII and `IDEAS.md`.
- **R5 — Concurrency correctness (3 drips).** Independent timers/alarms must not
  interfere; covered by SC-9 tests.

## 9. Glossary

- **CPP / ПДП** — Prolonged Casualty Care. **PCC** — the JTS Prolonged Casualty
  Care guideline set (analgesia/sedation, burns, etc.).
- **gtt** — drops; **drop factor** — drops per ml of an IV set (10/15/20/60).
- **infusion recipe** — a drug's dose diluted in a volume, run over a target time.
- **Rule of Ten** — TCCC/USAISR burn initial-rate rule: %TBSA × 10 ml/hr (40–80 kg).
- **review_status** — verification state of a clinical record (Art. II).

## Clarifications resolved

- Source hierarchy → TCCC primary, MOZ antibiotic reference (ADR-0002); PCC
  guidelines to be registered for drip doses (pending Owner — future ADR-0006).
- Burn formula → Rule of Ten; **body diagram deferred** (this amendment).
- MVP shape → drip-first, curated list, up to 3 concurrent, 5-min alarm.
- Spec language → English; App UI → Ukrainian.

## Change Log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-07-12 | Initial overview. |
| 1.1 | 2026-07-12 | Narrowed to drip-first MVP: curated infusion list, up to 3 concurrent drips (SC-9), explicit 5-min pre-end alarm. Deferred to IDEAS: Rule-of-Nines body diagram, antibiotic-by-injury, full weight×mg/kg calculator. Burn kept but simplified (manual %TBSA, no diagram). |
