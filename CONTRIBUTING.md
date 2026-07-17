# Contributing to CPP-DOSE

This is a safety-critical tool. Before anything, read
[`memory/constitution.md`](memory/constitution.md) and
[`CLAUDE.md`](CLAUDE.md) — they are the operating rules for humans and AI agents alike.

## The hard rules (non-negotiable)

1. **Never originate a clinical value.** Drug names, doses, concentrations, rates,
   durations, and formulas may only be *transcribed* from a registered source (in
   `clinical/sources/`) with a citation. If a value is missing, write
   `TODO(clinical-review)` and add a row to `clinical/OPEN-CLINICAL-QUESTIONS.md`.
2. **Never write a `VERIFIED:` status.** Only the Owner promotes a record
   (`npm run verify:record`). Code and contributors write `UNVERIFIED` at most.
3. **No network at runtime, ever.** No `fetch`/XHR/WebSocket/beacon/analytics. This is
   enforced by CSP, a lint rule, and an offline test.
4. **Fail closed.** Only `VERIFIED` + archived records ship. When unsure, show nothing
   with a reason — never a fabricated number.
5. **Spec before code.** Implement only what an approved `specs/*/spec.md` defines.
   New ideas go to `IDEAS.md`, not into the build.

## Workflow

- Start and end each change with a one-line **Constitution Check**.
- Keep the checks green:

  ```bash
  npm run validate && npm run test && npm run lint && npm run gate:release
  ```

- Record non-obvious or hard-to-reverse decisions as an ADR in `decisions/`.
- Update the relevant `specs/*` / ADRs if a decision changes.

## Conventions

- Timezone: always `Europe/Kyiv` (never "Kiev").
- UI is Ukrainian; code identifiers and docs are English.
