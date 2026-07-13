# Source Registry (archived documents)

Read-only archive of the exact source documents the clinical content is built
against (Constitution Art. VII). The machine-readable registry is `sources[]` in
`../uk-cpp.v1.json`; this folder holds the actual files + checksums.

| id | file | version | checksum (SHA-256) |
|----|------|---------|--------------------|
| MOZ-ATB-2023 | `antibiotocs-UA.pdf` | 2023 | `f110259071c25b9fdb28e5ebf17ef6021b9aa976af02bb3657df3d27f2f0302d` |
| TCCC-2026 | `tccc-guidelines-2026-en.pdf` | 01 May 2026 | `340a17a03388a1e4479df3737c5b038462494fea4c28a35251410662b1a019b6` |

## Policy

- Never edit a file in this folder. To update a protocol, add a **new** versioned
  file and a new `sources[]` entry, then bump `meta.protocol_version`.
- `CHECKSUMS.txt` is regenerated with `sha256sum *.pdf` and must match `sources[]`.
- The TCCC 2026 PDF must be downloaded from the Owner-supplied URL and placed here;
  until then its checksum is `TODO(archive-source)` and any record citing
  `TCCC-2026` cannot pass the release gate.
