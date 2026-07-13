# Sprint 3 — Field Hardening

**Goal:** make it survive real field use and pass the release checks.
(Corresponds to the original plan's M3.)

**Primary spec:** 000 (field platform requirements) across all modules.

## Backlog

- **T3.1** Red night theme finalized; no white flashes; legible at low brightness.
- **T3.2** Audit every interactive target ≥ 48 px; fix violations. *(SC-6)*
- **T3.3** Glove-friendly hit areas and spacing; large numerals.
- **T3.4** Disclaimer: first-run gate + reachable from every screen; "About /
  sources" screen showing `protocol_version` and per-record sources. *(SC-5/SC-7,
  Art. VII)*
- **T3.5** Lighthouse PWA installability pass. *(SC-6)*
- **T3.6** Release APK installs and runs on the Owner's Android device. *(SC-8)*
- **T3.7** Full offline soak: airplane-mode run of all modules; zero network. *(SC-3)*
- **T3.8** Accessibility/robustness pass: rotation, screen sleep/resume (metronome
  re-anchor), low battery.
- **T3.9** Run the **release gate**; confirm all exposed content is `VERIFIED` and
  archived; capture Owner sign-off in `VERIFICATION-LOG.md`.

## Acceptance criteria (exit) — the Spec-000 scorecard

- **AC-3.1 (SC-6)** All targets ≥ 48 px; Lighthouse PWA installability passes.
- **AC-3.2 (SC-5)** Disclaimer on first launch and from every screen.
- **AC-3.3 (SC-7)** Every clinical number shows `source_version` + verification.
- **AC-3.4 (SC-8)** Release APK installs/runs on the Owner's device.
- **AC-3.5 (SC-3)** Zero network across all modules in airplane mode.
- **AC-3.6** Release gate green **only if** the Owner has verified the exposed
  content; otherwise the field build is intentionally blocked.

## Definition of Done

Global DoD + AC-3.x green + release-gate + Owner sign-off logged. Ship the APK to
the Owner. Anything unfinished or unverified stays out of the build and is logged.

## Note

If clinical verification is incomplete at the end of Sprint 3, the app is still
"done" as software — it simply presents the fail-closed state for unverified items.
Field release waits on the Owner's verification, by design.
