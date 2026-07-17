# IDEAS — deferred backlog (NOT in the MVP)

Parking lot for everything deliberately out of P0. Nothing here is built until it
is promoted into `specs/000-product-overview` by an Owner-approved scope amendment
(Constitution Art. VIII). Items keep their source discipline: any future clinical
value still enters via the pipeline, source-tagged and Owner-verified.

## Deferred by the drip-first amendment (Spec 000 v1.1, 2026-07-12)

- **Rule-of-Nines body diagram** — tappable body regions to estimate %TBSA. MVP
  uses **manual %TBSA entry** instead (Spec 003 v1.1).
- **Antibiotic prophylaxis by injury type** — the `antibiotic_prophylaxis[]` data
  stays in the protocol file (all `UNVERIFIED`) but is **not surfaced** in the MVP
  UI. Bring back as a guided "by injury type" browser later.
- **Full weight×mg/kg dose calculator** for all drugs — MVP has only the simple
  infusion recipe (optional weight for mg/kg drip doses). A general dosing
  calculator (bolus/push drugs, all routes) comes later.
- **More than 3 concurrent drips**, and **non-drip (bolus/push) drug references**.
- **PCC source registration** — register the JTS PCC guidelines (analgesia/sedation,
  burns) as sources so continuous-infusion drip doses can be transcribed + verified.
  Needs a source-hierarchy ADR (future ADR-0006). *(This is the near-term unlock for
  real drip content, not a far-future idea.)*

## Deferred from the original plan

- **TQ-timer module** — independent tourniquet timers per limb, with application
  timestamps and 2 h / 6 h thresholds. Reminders and checklists only — **never a
  clinical decision.** (TCCC 2026 §6.a.3 supports the 2 h/6 h conversion logic as
  reference.)
- **PFC / PCC care-timer module** — turn/reassess reminders for prolonged care.
- **iOS build** — MVP is Android-only.
- **English (and other) UI** — MVP is Ukrainian-only.

## Clinical scope extensions (require sources + Owner verification)

- **Pediatric dosing** — the MOZ 2023 Standard already contains pediatric mg/kg
  antibiotic doses (cefazolin, metronidazole, clindamycin, ertapenem, ceftriaxone,
  vancomycin, ciprofloxacin). Deferred to avoid a half-built pediatric path; when
  built, add as a distinct, clearly-labeled mode with its own verification.
- **Antibiotic "by injury type" browser** — ~~surface `antibiotic_prophylaxis[]`
  as a guided picker~~ **in progress on `feature/antibiotics-reference`**, see
  Spec 004 / ADR-0007 / Sprint 4. Built as a read-only reference (TCCC 2026 +
  MOZ 2023, source-separated) in the existing "Препарати" tab, not a guided
  decision-tree picker — the CNS branching-logic decision tree itself
  (open question C.1) is still open and out of scope for that pass.
- **Parkland burn formula** — only if a current MOZ/registered protocol prescribing
  it is added to the Source Registry (ADR-0003). Not otherwise.
- **Lund–Browder TBSA chart** — more accurate than Rule of Nines; MVP uses Rule of
  Nines per TCCC.
- **Ongoing burn titration** — urine-output/mental-status-guided rate adjustment
  after the initial Rule-of-Ten rate.
- **Fluid/blood resuscitation helper** — TCCC §6 whole-blood/1:1:1 ladder and
  calcium timing as a reference flow.
- **TBI herniation helper** — hypertonic saline dosing flow (data seeded:
  `tccc_hypertonic_saline_*`).

## Platform / UX ideas

- Content update channel (still offline-install only; signed protocol bundles).
- Multi-casualty / multi-line management.
- Configurable pre-empty alert lead times; shift/handover notes (no PII).
- **Night-vision red mode toggle** — optional red-on-black theme that preserves
  scotopic (night) vision for field use; the default is now a modern dark theme.
- **Drip start-time (HH:MM) on the card** and a **"болюс введено" checkbox** — for
  handover/tracking (no PII).
- **Auto-dim in night focus** — via the Capacitor screen-brightness plugin (native
  build); tracked as Spec 001 FR-3i.
- Larger accessibility options (color-blind-safe night palette variants).

## Explicitly excluded (MVP red lines — need a Constitution amendment, not just a
## scope amendment)

- Accounts, cloud sync, analytics/telemetry, patient records, any data
  transmission, AI-generated clinical content. (Constitution Art. V.)
