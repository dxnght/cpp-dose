# Sprint 0 — Foundation & Clinical Pipeline — Overnight Report

- **Date:** 2026-07-12 (overnight run)
- **Agent:** Claude Code (unsupervised)
- **Scope:** Sprint 0 backlog T0.1–T0.10 only. No drip/dose/burn feature code (that is Sprint 1–2).
- **Constitution Check (open):** Articles I, II, III, V, VI, VIII apply. No clinical
  value was invented, extrapolated, or recalled. No `VERIFIED:` status was written
  by the agent. No runtime network was added. No spec/constitution file was edited.
- **Constitution Check (close):** All five hard rules held. See "Rules compliance" below.

---

## TL;DR

The app skeleton and the clinical-safety pipeline are up and **fail closed by
construction**. With the seed data (everything `UNVERIFIED`), the compiled field
bundle contains **zero clinical records** and the app shows the "no verified
content" state. All automated acceptance criteria that can run in this environment
are green. **One AC is blocked by the environment, not by the code: the debug APK
cannot be built here because no Java Runtime / Android SDK is installed** (AC-0.6).
Everything needed for the APK is scaffolded and ready; it just needs a JDK 17 +
Android SDK on the build machine.

---

## Command results (run at end of session)

| Command | Result |
|---|---|
| `npm run validate` | ✅ PASS — 33 drugs, 12 prophylaxis regimens, 2 formulas, 3 sources validate against schema + referential-integrity checks. |
| `npm run test` | ✅ PASS — 5 files, 15 tests. |
| `npm run compile:field` | ✅ PASS — bundle = 0 clinical records + 1 engineering formula. |
| `npm run gate:release` | ✅ PASS — nothing unverified/un-archived exposed; no `TODO(` in bundle. |
| `npm run verify` | ✅ Generated Owner checklist — 46 records awaiting verification. |
| `npm run lint` | ✅ PASS — 0 problems (no-network + no-`VERIFIED:` rules active). |
| `npm run build` | ✅ PASS — Vite build + PWA service worker (`dist/sw.js`, precache 5 entries). |
| Debug APK (`./gradlew assembleDebug`) | ⛔ BLOCKED — "Unable to locate a Java Runtime." No JDK/Android SDK in this environment. |

---

## Acceptance criteria (Sprint 0 exit)

| AC | Statement | Status |
|----|-----------|--------|
| **AC-0.1** | `uk-cpp.v1.json` validates in CI. | ✅ `tests/schema.test.ts` + `npm run validate`. |
| **AC-0.2** | Seed → field bundle has **no** clinical records; app shows "no verified content". | ✅ `tests/compile-field.test.ts` (data) + `tests/disclaimer.test.tsx` (UI state). |
| **AC-0.3** | After marking one record `VERIFIED`, only that record enters the bundle. | ✅ `tests/compile-field.test.ts` — done **in-memory** as a test fixture; the on-disk seed is never mutated. |
| **AC-0.4** | Offline test green; zero network requests. | ✅ `tests/offline.test.tsx` — spies over fetch/XHR/WebSocket/EventSource/sendBeacon assert 0 calls across every screen. |
| **AC-0.5** | Disclaimer on first run and reachable from every screen. | ✅ `tests/disclaimer.test.tsx`. |
| **AC-0.6** | Debug APK installs on the Owner's Android device. | ⛔ **BLOCKED (environment).** Capacitor Android project scaffolded + synced OK; APK build needs JDK 17 + Android SDK, absent here. See "Blocked / STOP items". |

---

## What was built (by task)

- **T0.1 — Scaffold.** React 18 + TypeScript + Vite PWA. Service worker via
  `vite-plugin-pwa` (`generateSW`, precache-only, **no `runtimeCaching`** → no
  network at runtime). Capacitor Android project added (`npx cap add android`,
  synced, Haptics plugin detected). *(ADR-0001.)*
- **T0.2 — Offline enforcement (three layers).**
  1. **CSP** meta in `index.html`: `connect-src 'self'` (+ `object-src 'none'`,
     `form-action 'none'`), forbidding any foreign egress.
  2. **Lint rule** (`eslint.config.js`): bans `fetch`, `XMLHttpRequest`,
     `navigator.sendBeacon`, `window.fetch`, `WebSocket`, `EventSource`. Verified
     it actually errors on a probe file.
  3. **CI offline test** (`tests/offline.test.tsx`): asserts zero calls to every
     egress API while driving the whole UI. *(Art. V, SC-3.)*
- **T0.3 — Schema validation** (`scripts/validate.mjs`): Ajv (Draft 2020-12) +
  ajv-formats, **plus** referential-integrity checks the schema can't express
  (source_document → sources[]; prophylaxis drug ids → drugs[]). *(Spec 005 AC-1/AC-6.)*
- **T0.4 — Field-bundle compile** (`scripts/compile-field.mjs`, logic in
  `scripts/lib.mjs`): includes a record iff engineering formula, **or** `^VERIFIED:`
  **and** its source has a real 64-hex SHA-256. Prophylaxis is dropped if it
  references any excluded drug (fail-closed). Emits `src/clinical/field-bundle.json`.
  *(Spec 005 FR-3, data-model.md § Field-bundle projection.)*
- **T0.5 — Verify report** (`scripts/verify.mjs`): read-only, lists non-VERIFIED
  records grouped by source with citations. Never mutates status. *(FR-4.)*
- **T0.6 — Release gate** (`scripts/gate-release.mjs`): fails if the bundle exposes
  any non-VERIFIED/un-archived record or contains any `TODO(` marker. *(ADR-0004.)*
- **T0.7 — App shell.** Ukrainian i18n scaffold (`src/i18n/uk.json` + `t()`),
  red-on-black night theme (`src/theme.css`, ≥48 px targets), bottom navigation,
  **persistent disclaimer banner**, **first-run full disclaimer** (localStorage
  gate) reachable again from every screen via a nav button. *(Art. IV.)*
- **T0.8 — Guard + SourceBadge.** `assertRenderable()` throws on any attempt to
  render a non-VERIFIED clinical record in field mode (engineering formulas
  exempt). `SourceBadge` shows `source_version` + verification state on every
  clinical record. "No verified content" empty state wired to the bundle.
  *(Art. III, SC-7; `tests/guard.test.ts`.)*
- **T0.9 — No agent-written `VERIFIED:`.** Lint rule bans a `VERIFIED:` string
  literal anywhere in `src/**` (only the Owner writes it, in clinical data).
- **T0.10 — Archive TCCC 2026 PDF.** Downloaded from the Owner-supplied URL,
  archived at `clinical/sources/tccc-guidelines-2026-en.pdf`, SHA-256 recorded in
  the registry (`uk-cpp.v1.json` sources[], `CHECKSUMS.txt`, `sources/README.md`)
  and the open-questions item closed. **See the ⚠ Owner note below.**

---

## Rules compliance (the five hard rules)

1. **Never originate a clinical value** — ✅ Only the TCCC source *checksum* was
   written (a build artifact, not a clinical value). No dose/rate/formula touched.
2. **Never write `VERIFIED:`** — ✅ Zero `VERIFIED:` statuses in the seed
   (grep-confirmed). AC-0.3's VERIFIED status exists only as an in-memory test
   fixture; the on-disk file stays all `UNVERIFIED`.
3. **Offline only** — ✅ CSP + lint + offline test. No network dependency added.
   (The TCCC PDF download was a one-time **build-time** source-archival step,
   exactly as the brief instructed; it is not a runtime call.)
4. **Fail closed** — ✅ App loads only the compiled bundle; the seed bundle exposes
   0 clinical records; guard throws on non-VERIFIED render.
5. **Spec before code** — ✅ Built only T0.1–T0.10 as specified. No scope added.

---

## ⚠ Items the Owner should look at

### Blocked / STOP items
- **AC-0.6 debug APK — BLOCKED by environment.** This machine has **no Java
  Runtime and no Android SDK**, so `./gradlew assembleDebug` cannot run. This is a
  toolchain gap, not a code defect. To finish AC-0.6 on a build machine:
  1. Install **JDK 17** and the **Android SDK** (Android Studio or command-line tools).
  2. `npm run build && npx cap sync android`
  3. `cd android && ./gradlew assembleDebug` → `android/app/build/outputs/apk/debug/`.
  The Capacitor project is already scaffolded and synced, so no other setup is needed.

### Clinical / verification notes (for the Owner, not to be actioned by an agent)
- **TCCC PDF is 17 pages / 314 KB.** The download from
  `https://tccc.org.ua/files/downloads/clinical-guidelines-2026-en.pdf` succeeded
  and is archived + checksummed, but a 17-page file may be a **condensed/summary
  edition** rather than the full guidelines. **Please confirm it is the complete,
  correct document before promoting any TCCC record to `VERIFIED`.** Recorded in
  `clinical/OPEN-CLINICAL-QUESTIONS.md` § B.
- **All 46 clinical records remain `UNVERIFIED`** by design. Run `npm run verify`
  for the checklist. Field bundle stays empty until you verify records
  (`review_status → VERIFIED:<name>:<YYYY-MM-DD>` in `uk-cpp.v1.json`, append to
  `clinical/VERIFICATION-LOG.md`).

### Open `TODO(...)` markers left
- **`TODO(clinical-review)`:** none newly introduced by this sprint. (The existing
  substantive clinical questions in `clinical/OPEN-CLINICAL-QUESTIONS.md` § C —
  CNS antibiotic branching, weight/burn bounds, TXA edge weights, pediatric parking,
  antibiotic-source wording — are pre-existing and remain open for the Owner.)
- **`TODO(archive-source)`:** none remaining. The one open item (TCCC checksum) was
  closed by T0.10.

---

## Decisions I made (and why), for audit

- **Field bundle is git-ignored and regenerated** by `prebuild`/`pretest`
  (`npm run compile:field`) so the shipped data is always a fresh projection of the
  authoring file — never hand-edited. `android/` is also git-ignored (regenerated
  from the web build, standard Capacitor practice).
- **"Archived source" = real 64-hex SHA-256.** The compile step and release gate
  treat any non-64-hex checksum (`TODO(...)`, `n/a`) as un-archived, so a VERIFIED
  clinical record still cannot ship without a real archived source. (`n/a` on the
  arithmetic-identity source is harmless because engineering formulas bypass the
  source-archival check by design.)
- **Production `tsc` build typechecks `src/` only.** Tests import the plain-JS
  pipeline lib (`scripts/lib.mjs`) and are validated by running them under Vitest,
  not by the app's `tsc -b`.

## Not done (correctly out of scope)
- No drip/dose/burn logic, no metronome, no weight slider — those are Sprint 1–3.
- No `VERIFIED` promotions, no VERIFICATION-LOG edits — Owner-only.

---

## How to reproduce
```bash
npm install
npm run validate        # schema + refs
npm run test            # 15 tests (offline, guard, schema, compile, disclaimer)
npm run compile:field   # → src/clinical/field-bundle.json (0 clinical at seed)
npm run gate:release    # PASS (nothing unverified exposed)
npm run verify          # Owner checklist (46 records)
npm run build           # PWA build + service worker
# APK (needs JDK 17 + Android SDK):
#   npx cap sync android && (cd android && ./gradlew assembleDebug)
```
