# Review of `cpp-app-plan.md`

Reviewer: Claude (agent) · Date: 2026-07-12 · Method: Spec-Driven Development
(Spec-Kit) + verification against the two governing sources supplied by the Owner.

## Verdict

**Strong product instinct, correct safety instincts, but not yet a spec.** The
plan is a good single-document MVP brief. To serve as the guiding artifact for a
multi-agent, auditable, safety-critical build it needs to be (a) split into
Constitution + Spec + Plan + Tasks, and (b) corrected on two clinical points where
it diverges from the sources we agreed to obey. All of that is done in this
repository; this file explains what changed and why.

---

## What is strong and is kept as-is

- **Offline-first, zero-exfiltration, Android-only MVP.** Correct for the threat
  model. Preserved verbatim as Constitution Article V and the overview non-goals.
- **The clinical content pipeline idea (§5.4).** Versioned protocol file,
  `review_status`, refusing to show unverified records, min/max clamps,
  double-tap confirm, persistent disclaimer. This is the heart of the project and
  is promoted from a paragraph to Constitution Articles I–IV plus a full spec
  (`specs/005-clinical-content-pipeline`).
- **Drip math and audio-timing discipline (§5.2, §5.5).** `gtt/min = volume_ml /
  time_min × drop_factor`, integer output, and "schedule via AudioContext, not
  setInterval" are correct and kept. The M1 example checks out:
  `500 / 240 × 20 = 41.67 → 42 gtt/min`. ✔
- **Glove-friendly ≥48 px targets, red night theme, Ukrainian UI.** Kept as
  field-hardening acceptance criteria (Sprint 3).
- **Explicit non-functions (§5.3)** and the deferred TQ/PFC timer modules. Kept;
  moved to `IDEAS.md`.

---

## What must change — clinical (verified against the sources)

### 1. Burn resuscitation: Parkland → **Rule of Ten** (BLOCKER, now resolved)

The plan's burn module (§5.2) specifies the **Parkland** formula
(`k × weight × TBSA`, half in the first 8 h). **TCCC Guidelines 2026 §15
("Burns", USAISR "Rule of Ten") does not use Parkland for prehospital burn
resuscitation.** It specifies:

> Initial IV/IO fluid rate = **%TBSA × 10 ml/hr** for adults **40–80 kg**; for
> every **10 kg above 80 kg, add 100 ml/hr**. Titrate to urine output / mental
> status thereafter. (TCCC 2026, §15.e, "Rule of Ten".)

Since the Owner's rule is "work only per these sources," Parkland has **no
registered source** and is therefore removed from the MVP. `specs/003-burn-
resuscitation` is written around the Rule of Ten. Parkland can return only if a
current MOZ protocol prescribing it is added to the Source Registry (see ADR-0003).
*Owner decision recorded 2026-07-12: Rule of Ten.*

### 2. Antibiotics come from **two** sources with different regimens

The plan's §5.4 schema implies one protocol file. But the two governing sources
disagree on antibiotics, and both are legitimate for different purposes:

- **MOZ Standard 2023** — prophylaxis **by injury type** (extremity, thorax,
  abdomen, maxillofacial, CNS, eye, burns), e.g. *Cefazolin 2 g IV q8h*;
  alternatives *Clindamycin*, *Ertapenem 1 g IV ×1*, *Metronidazole 500 mg IV
  q8–12h*, *Moxifloxacin 400 mg*, etc. Delayed-evacuation PO option:
  *Moxifloxacin 400 mg ×1* or *Levofloxacin 500 mg ×1*.
- **TCCC 2026 §12** — *Cefadroxil 1 g PO daily* (or *Cephalexin 500 mg PO q6h*);
  if unable to take PO: *Ceftriaxone 2 g IV/IO/IM daily*. Penetrating eye (§9):
  *Ceftriaxone 2 g IV/IM* or *Cefadroxil 1 g PO*.

**Resolution (Owner, 2026-07-12):** TCCC 2026 is the primary base for all
modules; the MOZ Standard is the source-tagged reference for antibiotic
prophylaxis by injury type. Every antibiotic record therefore carries its own
`source_document`, and where the app surfaces antibiotics it must show which
source a recommendation comes from. Recorded in ADR-0002.

### 3. Who verifies? Plan says instructor; Constitution says **Owner**

Plan §5.4 flips `review_status` to VERIFIED on a combat-medicine instructor's
confirmation. The Owner's red lines make the **Owner** the sole authority. Both
are reconciled: an instructor may advise, but the Owner signs
`VERIFIED:<name>:<date>`. Agents never write a VERIFIED status. (Constitution
Art. II.)

### 4. The plan omits several drugs the same sources clearly support

Because the plan grew from the drip/dose use-case, it doesn't enumerate the
TCCC-2026 field drugs a CPP medic actually titrates: **TXA 2 g slow IV/IO**
(§6.d), **Ketamine** (analgesia §11 and sedation §13), **Ceftriaxone**,
**hypertonic saline** for herniation (§8.d), **calcium** after transfusion
(§6.e). These are seeded (as `UNVERIFIED`) into `clinical/uk-cpp.v1.json` so the
dose calculator has real, source-tagged content to build against.

---

## What must change — process / Spec-Driven Development

| Gap in the original plan | Fix in this repo |
|---|---|
| No constitution / no single source of governance. | `memory/constitution.md` — red lines as enforceable articles. |
| One document mixes WHAT, HOW, and schedule; hard for agents to consume. | Split into `specs/*` (WHAT/WHY), `plan/*` (HOW), `sprints/*` (schedule). |
| Plan starts at "§5.2" — it is a fragment of a larger doc; problem/users/success not fully stated. | `specs/000-product-overview` states problem, users, scope, non-goals, measurable success criteria. |
| Acceptance criteria exist but live inside milestones, not owned by a feature spec. | Each feature spec owns its acceptance criteria; sprints reference them. |
| No decision records → auditors can't see *why*. | `decisions/ADR-000X` for stack, source hierarchy, burn formula, verification gate, audio timing. |
| Milestones assume feature work in week 1, but the safety pipeline + scaffolding aren't built yet. | Added **Sprint 0 (Foundation)**: scaffold, offline shell, clinical pipeline harness, disclaimer, verification tooling — *before* any dose is shown. |
| Clinical schema is sketched but not executable. | `clinical/protocol.schema.json` (validatable) + seeded `uk-cpp.v1.json`. |
| "UNVERIFIED refuses to show" is stated but not testable. | Turned into explicit acceptance criteria + a release gate (Constitution Art. II/III). |

## Smaller notes

- **iOS / English UI** correctly excluded from MVP; kept in `IDEAS.md`.
- **State management** ("zustand or context — keep it simple"): deferred to
  `plan/architecture.md`; not a spec-level concern.
- **Parkland `k` slider (2–4)** removed with Parkland; Rule of Ten has no `k`.
- **Pediatric dosing**: the MOZ Standard includes pediatric antibiotic doses
  (mg/kg). MVP targets adults; pediatric is flagged `TODO(clinical-review)` and
  parked in `IDEAS.md` to avoid a half-built pediatric path.

## Net

Keep the plan's product and safety instincts; adopt the SDD structure and the two
clinical corrections. Nothing here weakens the plan — it makes the same intent
executable by agents and legible to auditors.
