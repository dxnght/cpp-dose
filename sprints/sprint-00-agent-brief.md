# Sprint 0 — overnight agent brief (paste this to claude-code)

> Copy the block below as the task. It is deliberately scoped, test-gated, and has
> explicit stop conditions so an unsupervised run is safe.

---

You are implementing **Sprint 0 (Foundation)** of CPP-DOSE. First read `CLAUDE.md`,
`memory/constitution.md`, `specs/000-product-overview/spec.md`,
`specs/005-clinical-content-pipeline/spec.md`, `plan/architecture.md`,
`plan/data-model.md`, and `sprints/sprint-00-foundation.md`. Follow the five hard
rules in `CLAUDE.md` without exception.

**Goal:** stand up the app skeleton and the clinical-safety pipeline. Do NOT build
the drip, dose, or burn features — that is Sprint 1–2.

**Do exactly the Sprint 0 backlog (T0.1–T0.10):**
- Scaffold a React + TypeScript + Vite PWA (service worker) with a Capacitor
  Android project that builds a debug APK.
- Add CSP + a lint rule banning `fetch`/`XMLHttpRequest`/`sendBeacon`, and a CI
  test that asserts zero network requests (offline).
- Implement and wire the four npm scripts from `CLAUDE.md`: `validate`, `verify`,
  `compile:field`, `gate:release`, plus `test`.
- Implement the field-bundle compile and the release gate exactly per
  `plan/data-model.md` (§ Field-bundle projection) and Spec 005 FR-3/4.
- Build the app shell: Ukrainian i18n scaffold, red night theme, navigation,
  persistent disclaimer banner + first-run full disclaimer, and a `SourceBadge`
  component. Make rendering a non-`VERIFIED` record in field mode unreachable
  (throw in tests).
- Archive the TCCC 2026 PDF from the URL in `clinical/uk-cpp.v1.json` sources into
  `clinical/sources/`, record its SHA-256, and update the registry. If you cannot
  fetch it, leave the checksum as `TODO(archive-source)` and note it — do not
  fabricate a checksum.

**Constraints:**
- Touch only: project scaffolding, `src/**`, `clinical/**` tooling, CI config,
  `package.json`. Do NOT edit `memory/constitution.md`, `specs/**`, or any
  `review_status` value in `clinical/uk-cpp.v1.json`.
- Add NO clinical values. The seed data stays `UNVERIFIED`.
- No dependency that makes network calls or collects telemetry.

**You are done when all Sprint 0 acceptance criteria (AC-0.1…AC-0.6) pass:**
- `npm run validate` passes.
- With the seed data, `npm run compile:field` yields a field bundle with **zero
  clinical records**, and the app shows the "no verified content" state.
- After a test temporarily marks one record `VERIFIED`, only that record enters the
  bundle (revert the test edit afterward).
- The offline test passes (zero network).
- Disclaimer shows on first run and is reachable from every screen.
- The debug APK builds.

**Before you stop:** run `npm run test`, `npm run validate`, `npm run gate:release`.
Leave a short `SPRINT-00-REPORT.md` listing what you built, every test's status,
and every `TODO(clinical-review)` / `TODO(archive-source)` you left. If you hit any
of the STOP conditions in `CLAUDE.md`, stop and record it in that report rather
than guessing.

---

## Why this is a good overnight task

- **Bounded:** scaffolding + pipeline, not open-ended feature work.
- **Self-checking:** success is defined by scripts/tests the agent must make green,
  so quality doesn't depend on you watching.
- **Safe:** it explicitly cannot touch clinical values or the constitution, and it
  fails closed by construction.
