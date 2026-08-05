# CPP-DOSE

Offline IV **drip-rate & dosing** support for **Prolonged Casualty Care** (CPP / ПДП).
A small, phone-first tool for combat medics: pick a drip drug or fluid, get the
drops-per-minute for the IV set, and pace it with a synchronized metronome + drip
animation — all fully offline, at night, with gloves.

> ⚠️ **Decision-support / reference tool only.** It does **not** replace protocols,
> medical direction, or clinical judgement. Every clinical value shown is transcribed
> from a registered source and signed off by the Owner. See
> [`memory/constitution.md`](memory/constitution.md).

Ukrainian UI · offline (zero network at runtime) · light + dark themes · Android + iOS.

> **Створено інструкторами 151 НЦ.**

---

## What it does

- **Drip engine** — drop-factor selector (10 / 15 / 20 gtt/ml), weight + dose
  steppers, live gtt/min hero, up to **5 concurrent drips** each with an end-of-bag
  timer and two-stage pre-end alarms at **10 and 5 minutes** remaining (loud,
  distinct beep patterns per stage; an optional per-drip mute checkbox, off by
  default). Alarms fire via OS-level local notifications too, so they still
  work with the **screen locked**.
- **By drug** — a curated list of verified drip medications/fluids (ketamine analgesia
  1 mg/ml, sedation 3 mg/ml, burn fluid) with the recommended dose + a priming/loading
  bolus computed for the patient.
- **Час мішка** — how long a bag lasts at the rate you're running (+ a tap-to-calibrate
  tool that measures your real drops/min).
- **Опіки** — burn fluid rate via the TCCC Rule of Ten (%TBSA × 10 ml/h).
- **Focus mode** — full-screen big count + chamber for one-glance night pacing, with
  audio / vibration / silent-flash channels and live retitration.

## Clinical safety model (the core idea)

A wrong number can kill, so the app is **fail-closed by construction**:

1. **No invented values.** Every drug/dose/rate/formula is transcribed from a
   registered source (TCCC 2026, MOZ 2023, JTS PCC CPGs) with a citation.
2. **Owner verification gate.** Records are `UNVERIFIED` until the Owner personally
   promotes them to `VERIFIED:<name>:<date>`. Agents/code can never write a `VERIFIED`
   status.
3. **Only verified content ships.** A build compiles a `field-bundle.json` containing
   _only_ verified + archived records; the app can't render anything else.

See [`memory/constitution.md`](memory/constitution.md) and
[`specs/005-clinical-content-pipeline`](specs/005-clinical-content-pipeline/spec.md).

## Try it

**PWA (no install, works offline after first load):** `https://cpp-dose.probleminu.workers.dev/` —
see [`reports/DEPLOY-PWA.md`](reports/DEPLOY-PWA.md) to publish it.
Note the web build's alarm only runs while the app is open and the screen is
on; the Android APK adds the OS-level locked-screen backstop.

## Build variants

One codebase, two builds (replaced the old `variant/play-store` branch, which
drifted 20 commits behind before anyone noticed):

```bash
npm run build            # apk variant (default) — full alarm stack
npm run build:play       # Play Store variant — no OS notifications,
                         #   no USE_EXACT_ALARM (Play-restricted permission)
```

See [`src/config.ts`](src/config.ts) for why the split exists.

## Quick start

```bash
npm install
npm run dev        # local dev server (compiles the field bundle first)
npm run test       # unit + offline (zero-network) + guard tests
npm run lint       # incl. no-network + no-VERIFIED lint rules
npm run build      # production PWA build (service worker, offline)
```

Clinical-content commands:

```bash
npm run validate       # JSON-Schema-validate the protocol file
npm run verify         # Owner checklist of unverified records
npm run verify:record -- <recordId> "Name"   # Owner-only: promote a record
npm run gate:release   # fail if any unverified/un-archived record would ship
```

## Build the apps (offline, no server)

- **Android APK** → [`reports/BUILD-APK.md`](reports/BUILD-APK.md) (needs JDK 17 + Android SDK).
- **Native iOS** → [`reports/BUILD-IOS.md`](reports/BUILD-IOS.md) (needs a Mac + Xcode).
- **PWA** → `npm run dev`/`preview`, then "Add to Home Screen" (no toolchain; note the
  iOS PWA limits documented in the iOS guide).

## Tech

React + TypeScript + Vite, PWA (service worker, full offline), Capacitor for the
Android/iOS shells. Vibration via Capacitor Haptics. No backend, no accounts, no
telemetry, no network at runtime — enforced by CSP + a lint rule + an offline test.
See [`plan/architecture.md`](plan/architecture.md).

## How this repo is built (Spec-Driven Development)

Adapted from GitHub's Spec-Kit. Work flows one direction, and every step re-checks the
constitution:

```
Constitution → Spec (WHAT/WHY) → Plan (HOW) → Tasks → Implementation
```

- **Specs** (`specs/`) describe intent; **plans** (`plan/`) describe construction;
  **ADRs** (`decisions/`) record why each significant choice was made (for auditors).
- Agents/contributors: read [`CLAUDE.md`](CLAUDE.md) and the constitution first.

## Repository map

```
cpp-dose/
├── src/                     # the app (React + TS)
│   ├── drip/                # drip engine: calc, metronome, haptics, screen
│   ├── clinical/            # types, field-bundle loader, fail-closed guard
│   ├── components/          # disclaimer, theme toggle, source badge, nav
│   ├── screens/             # drugs / about screens
│   └── theme.css            # light + dark design system
├── tests/                   # unit + offline + guard + schema tests
├── public/                  # app icons (offline)
├── scripts/                 # validate / verify / compile-field / gate-release
├── clinical/                # SAFETY-CRITICAL content pipeline
│   ├── protocol.schema.json #   JSON Schema for every record
│   ├── uk-cpp.v1.json       #   the protocol data (source-tagged, review_status)
│   ├── sources/             #   archived source PDFs + checksums
│   ├── OPEN-CLINICAL-QUESTIONS.md
│   └── VERIFICATION-LOG.md
├── memory/constitution.md   # supreme governing document (clinical red lines)
├── specs/                   # per-feature specs (000 overview, 001 drip, 003 burn, 005 pipeline)
├── plan/                    # architecture.md + data-model.md
├── decisions/               # ADR-0001 … ADR-0006
├── sprints/                 # sprint plan + Sprint 0–3
├── reports/                 # build guides (APK/iOS) + sprint reports
├── CLAUDE.md                # operating rules for agents/contributors
├── IDEAS.md                 # deliberately deferred backlog
└── plan-review.md           # review of the original plan
```

## Status

MVP feature-complete (drip engine, by-drug, bag-time, burn, focus mode, calibrator).
**43 clinical records verified and live** (31 drugs + 12 antibiotic-prophylaxis
regimens); 8 more are still `UNVERIFIED` and are deliberately not rendered.
Run `npm run compile:field` or `npm run gate:release` for the current count
rather than trusting this line — it read "6" until 2026-07-24, long after the
antibiotics set landed. Remaining: on-device Lighthouse pass, and each verified
record is the Owner's sign-off (`clinical/OPEN-CLINICAL-QUESTIONS.md`).

## License

Not yet licensed — usage/redistribution rights are reserved by the Owner pending a
license decision. If you intend to use or contribute, contact the Owner first.
