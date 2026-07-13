# CPP-DOSE — Spec Repository

Weight→dose and IV drip-rate decision-support tool for Prolonged Casualty Care
(CPP / ПДП). **This repository holds the specifications, plans, decisions, and
clinical-content pipeline that govern the build — not the app code (yet).**

> ⚠️ Decision-support / reference tool only. Not a substitute for protocols,
> medical direction, or clinical judgement. See `memory/constitution.md`.

## Read this in order

1. `memory/constitution.md` — **non-negotiable governance.** Start here. Encodes
   the clinical red lines: sources of truth, the Owner verification gate, fail-closed.
2. `plan-review.md` — evaluation of the original `cpp-app-plan.md` against
   Spec-Driven Development, and the changes it drove.
3. `specs/000-product-overview/spec.md` — the product: problem, users, scope,
   non-goals, success criteria.
4. `specs/00X-*/spec.md` — one spec per feature (WHAT & WHY).
5. `plan/architecture.md` + `plan/data-model.md` — the HOW.
6. `clinical/` — the safety-critical content pipeline: source registry, schema,
   seeded protocol data (all `UNVERIFIED` until the Owner signs).
7. `decisions/ADR-*.md` — why each significant choice was made (for auditors).
8. `sprints/` — Sprint 0–3 execution plan with acceptance criteria.
9. `IDEAS.md` — everything deliberately deferred out of the MVP.

## How we work (Spec-Driven Development)

Adapted from GitHub's Spec-Kit. The flow is one-directional:

```
Constitution  →  Spec (WHAT/WHY)  →  Plan (HOW)  →  Tasks  →  Implementation
     ▲                                                              │
     └──────────────── every step re-checks the Constitution ◄──────┘
```

- **Specs describe intent, not code.** No framework/API names in a spec.
- **Plans describe construction.** Stack, architecture, data model live here.
- **Every clinical value** enters only via the pipeline in `clinical/`, carries a
  source tag, and is `UNVERIFIED` until the Owner promotes it. Agents never write
  a `VERIFIED:` status and never invent a number. See Constitution Articles I–III.
- **Decisions are recorded.** If a choice is non-obvious or hard to reverse, it
  gets an ADR.

## For AI agents (claude-code) working in this repo

Before doing anything, read `memory/constitution.md` and the relevant
`specs/*/spec.md`. Then:

- Never originate, guess, round, or "recall" a clinical value. Transcribe from a
  registered source with a citation, mark it `UNVERIFIED`, or write
  `TODO(clinical-review)`. (Constitution Art. I–II.)
- Never set `review_status` to `VERIFIED:*`. That is the Owner's action only.
- Do not add scope beyond `specs/000-product-overview`. Route new ideas to
  `IDEAS.md`.
- Begin each unit of work with a Constitution Check and end with one.

## Repository map

```
CPP-DOSE/
├── README.md                       ← you are here
├── plan-review.md                  ← review of the original plan
├── IDEAS.md                        ← deferred backlog (post-MVP)
├── memory/
│   └── constitution.md             ← supreme governing document
├── specs/
│   ├── 000-product-overview/spec.md
│   ├── 001-drip-rate-core/spec.md
│   ├── 002-weight-dose-calculator/spec.md
│   ├── 003-burn-resuscitation/spec.md
│   └── 005-clinical-content-pipeline/spec.md
├── plan/
│   ├── architecture.md
│   └── data-model.md
├── clinical/
│   ├── protocol.schema.json        ← JSON Schema for every protocol record
│   ├── uk-cpp.v1.json              ← seeded content, all UNVERIFIED
│   ├── sources/                    ← registered source documents (read-only)
│   ├── OPEN-CLINICAL-QUESTIONS.md   ← TODO(clinical-review) items for the Owner
│   └── VERIFICATION-LOG.md         ← Owner sign-off log
├── decisions/                      ← ADR-0001 … ADR-000N
└── sprints/
    ├── sprint-plan.md
    ├── sprint-00-foundation.md
    ├── sprint-01-drip-core.md
    ├── sprint-02-dose-and-burn.md
    └── sprint-03-field-hardening.md
```
