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

- **TQ-timer module** — ❌ **withdrawn (Owner, 2026-07-18)**. Considered as
  `specs/006-tq-timer/spec.md` (independent tourniquet timers per limb, TCCC-2026
  §6.a.3's 2 h/6 h conversion thresholds — exact quote: "Every effort should be
  made to convert tourniquets in less than 2 hours... Do not remove a tourniquet
  that has been in place more than 6 hours unless close monitoring and lab
  capability are available.") but the Owner decided a separate tourniquet-timer
  subsystem isn't needed. **Superseded by**: the existing drip end-of-bag pre-end
  alarm lead time changed 5 → 10 min instead (`PRE_END_ALARM_MS` in
  `src/drip/DripScreen.tsx`) — that's the entire "timer module" ask, done.
- **PFC / PCC care-timer module** — ⏸ **on hold, Owner still deciding necessity**
  (2026-07-18). Spec drafted: see `specs/007-pfc-nursing-timer/spec.md`.
  MVP scope is deliberately minimal — just the **q2h repositioning + splint/pulse
  check** (JTS-CPG-91 Table 17, both rows say "Every 2 hours"). The rest of
  Table 17 is a ready-to-go, already-sourced backlog if the minimal version
  proves not enough in the field:
  - Lip care — every hour (lip balm / lotion / petroleum jelly)
  - Oral/Nasal care — every 24 h; Oral/Dental care — every 12 h
  - Cough/deep breathing — every hour
  - Hypothermia prevention — continuous (not interval-based, doesn't fit a timer)
  - Head-injury positioning (elevate 30°) — continuous
  - Nutrition — every 4–6 h; Hygiene — every 24 h
  - IV/IO site care — flush catheter every 8–12 h, change tubing every 96 h
  - Bowel management — as required
  All rows are in the archived `clinical/sources/Prolonged_Casualty_Care_Guidelines_21_Dec_2021_ID91.pdf`,
  Table 17 — no new source needed to pick any of these up later.
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
