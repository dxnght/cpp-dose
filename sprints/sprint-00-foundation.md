# Sprint 0 — Foundation & Clinical Pipeline

**Goal:** stand up the app skeleton and the safety machinery *before* any dose or
rate is shown. At the end, the app runs offline, shows the disclaimer, and proves
it fails closed on unverified content.

**Primary specs:** 005 (pipeline), 000 (shell), `plan/architecture.md`,
`plan/data-model.md`.

## Backlog

- **T0.1** Scaffold React+TS+Vite PWA; service worker; Capacitor Android project
  builds a debug APK. *(ADR-0001)*
- **T0.2** CSP + dependency allow-list; CI **offline test** asserting zero network
  requests. *(Art. V, SC-3)*
- **T0.3** Wire `clinical/protocol.schema.json` validation of `uk-cpp.v1.json` into
  CI. *(Spec 005 AC-1)*
- **T0.4** Implement the **field-bundle compile** (include only `VERIFIED` +
  archived; always include `engineering` formulas). *(Spec 005 FR-3)*
- **T0.5** Implement the **`verify` report** (list non-VERIFIED by source). *(FR-4)*
- **T0.6** Implement the **release gate** (fail on unverified/un-archived/`TODO(`).
  *(FR + ADR-0004)*
- **T0.7** App shell: Ukrainian i18n scaffold, red night theme, navigation,
  persistent disclaimer banner + first-run full disclaimer. *(Art. IV)*
- **T0.8** Clinical guard component + `SourceBadge` (renders `source_version` +
  verification state); a render of a non-verified record in field mode is
  unreachable/throws in tests. *(Art. III; SC-7)*
- **T0.9** Lint rule: no `fetch`/`XMLHttpRequest`/`sendBeacon`; no agent-written
  `VERIFIED:` status.
- **T0.10** Archive TCCC 2026 PDF into `clinical/sources/`, record checksum; update
  `sources[]`. *(closes an OPEN-CLINICAL-QUESTIONS item)*

## Acceptance criteria (exit)

- **AC-0.1** `uk-cpp.v1.json` validates in CI (Spec 005 AC-1). *(already green in
  seed — keep it gated.)*
- **AC-0.2** With seed data, the compiled field bundle contains **no** clinical
  records; the app shows the "no verified content" state (Spec 005 AC-2 / SC-4).
- **AC-0.3** After marking one record `VERIFIED`, only that record enters the
  bundle (Spec 005 AC-3).
- **AC-0.4** Offline test green; zero network requests (SC-3).
- **AC-0.5** Disclaimer shows on first run and from every screen (SC-5).
- **AC-0.6** Debug APK installs on the Owner's Android device.

## Definition of Done

Global DoD + all AC-0.x green + `verify` report generated for the Owner.

## Risks

- Capacitor/Android toolchain setup time (R-platform). Mitigate: get the debug APK
  building on day 1.
