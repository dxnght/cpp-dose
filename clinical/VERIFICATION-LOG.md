# Verification Log

Append-only record of Owner clinical sign-offs (Constitution Art. II & VII).
One row per record promoted to `VERIFIED`. Agents MUST NOT write to this file.

| Date | Record id | review_status written | Source + version | Verified against citation | Verifier |
|------|-----------|-----------------------|------------------|---------------------------|----------|
| _(none yet — all seed content is UNVERIFIED)_ | | | | | |

## Rules

- A row is added only when the Owner sets a record's `review_status` to
  `VERIFIED:<name>:<YYYY-MM-DD>` in `uk-cpp.v1.json`.
- `Verified against citation` must match the record's `source_citation`.
- If a source version changes, all records citing it revert to `UNVERIFIED` and
  are re-logged on re-verification.
| 2026-07-13 | pcc_ketamine_analgesia_infusion | VERIFIED:Ihor:2026-07-13 | JTS-CPG-91 (Owner practice; candidate source JTS CPG 91 (21 Dec 2021) — confirm exact location) | Owner-provided analgesia drip (100 mg/100 ml NS = 1 mg/ml; priming 0.2-0.3 mg/kg then 0.1-0.2 mg/kg/h). NOT in CPG-61 (which frames the ketamine drip as SEDATION). Confirm exact source (CPG-91 / JTS Pain-Anxiety-Delirium CPG ID 29) before verifying. | Ihor |
| 2026-07-13 | pcc_ketamine_sedation_infusion | VERIFIED:Ihor:2026-07-13 | JTS-CPG-61 (JTS CPG ID 61 (11 May 2017); transcribed via UA translation — confirm vs EN original) | PCC Analgesia & Sedation — Appendix B (mix 750 mg / 250 ml NS = 3 mg/ml; 1 mg/kg/h non-intubated, 1-2 mg/kg/h intubated) + Appendix D | Ihor |
| 2026-07-13 | pcc_burn_fluid | VERIFIED:Ihor:2026-07-13 | PCC-BURN (JTS burn PFC CPG (UA translation, tccc.org.ua), 2026-07-13 — confirm ID/version) | JTS Burn PFC CPG (UA) — Fluid Resuscitation section + Appendix D (Rule of Ten; LR/Plasmalyte; urine 30-50 ml/h; adjust +/-25%); fluid choice: PCC burns 'Найкраще: ізотонічні кристалоїди (Рінгер Лактат, Плазмаліт)' + TCCC 2026 §15.e (LR, NS, or Hextend) | Ihor |
