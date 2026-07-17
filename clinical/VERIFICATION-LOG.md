# Verification Log

Append-only record of Owner clinical sign-offs (Constitution Art. II & VII).
One row per record promoted to `VERIFIED`. Agents MUST NOT write to this file.

| Date                                          | Record id | review_status written | Source + version | Verified against citation | Verifier |
| --------------------------------------------- | --------- | --------------------- | ---------------- | ------------------------- | -------- |
| _(none yet — all seed content is UNVERIFIED)_ |           |                       |                  |                           |          |

## Rules

- A row is added only when the Owner sets a record's `review_status` to
  `VERIFIED:<name>:<YYYY-MM-DD>` in `uk-cpp.v1.json`.
- `Verified against citation` must match the record's `source_citation`.
- If a source version changes, all records citing it revert to `UNVERIFIED` and
  are re-logged on re-verification.
  | 2026-07-13 | pcc_ketamine_analgesia_infusion | VERIFIED:Ihor:2026-07-13 | JTS-CPG-91 (Owner practice; candidate source JTS CPG 91 (21 Dec 2021) — confirm exact location) | Owner-provided analgesia drip (100 mg/100 ml NS = 1 mg/ml; priming 0.2-0.3 mg/kg then 0.1-0.2 mg/kg/h). NOT in CPG-61 (which frames the ketamine drip as SEDATION). Confirm exact source (CPG-91 / JTS Pain-Anxiety-Delirium CPG ID 29) before verifying. | Ihor |
  | 2026-07-13 | pcc_ketamine_sedation_infusion | VERIFIED:Ihor:2026-07-13 | JTS-CPG-61 (JTS CPG ID 61 (11 May 2017); transcribed via UA translation — confirm vs EN original) | PCC Analgesia & Sedation — Appendix B (mix 750 mg / 250 ml NS = 3 mg/ml; 1 mg/kg/h non-intubated, 1-2 mg/kg/h intubated) + Appendix D | Ihor |
  | 2026-07-13 | pcc_burn_fluid | VERIFIED:Ihor:2026-07-13 | PCC-BURN (JTS burn PFC CPG (UA translation, tccc.org.ua), 2026-07-13 — confirm ID/version) | JTS Burn PFC CPG (UA) — Fluid Resuscitation section + Appendix D (Rule of Ten; LR/Plasmalyte; urine 30-50 ml/h; adjust +/-25%); fluid choice: PCC burns 'Найкраще: ізотонічні кристалоїди (Рінгер Лактат, Плазмаліт)' + TCCC 2026 §15.e (LR, NS, or Hextend) | Ihor |
  | 2026-07-14 | burn_rule_of_ten | VERIFIED:Ihor:2026-07-14 | TCCC-2026 (01 May 2026) | TFC §15 Burns, e Fluid resuscitation (USAISR Rule of Ten): %TBSA x 10 ml/hr for 40-80 kg; +100 ml/hr per 10 kg above 80 kg | Ihor |
  | 2026-07-14 | pcc_ketamine_analgesia_priming | VERIFIED:Ihor:2026-07-14 | JTS-CPG-61 (JTS CPG ID 61 (11 May 2017); Owner priming practice — confirm) | Owner priming practice before the analgesia drip (0.2-0.3 mg/kg); CPG-61 ketamine analgesia push range 0.1-0.2 mg/kg | Ihor |
  | 2026-07-14 | pcc_ketamine_sedation_loading | VERIFIED:Ihor:2026-07-14 | JTS-CPG-61 (JTS CPG ID 61 (11 May 2017); transcribed via UA translation — confirm vs EN original) | PCC Analgesia & Sedation — footnote 3 + Appendix B (loading 1 mg/kg IV/IO over 60 s) | Ihor |
  | 2026-07-17 | pcc_ketamine_analgesia_infusion | VERIFIED:Ihor:2026-07-17 | JTS-CPG-61 (JTS CPG ID 61 (11 May 2017)) | JTS CPG-61, Appendix C (Common IV Meds Cheat Sheet): Ketamine analgesia pain dose range 0.1-0.2 mg/kg IV (moderate pain 20 mg IV; sedation 1 mg/kg IV); START LOW, GO SLOW. Owner drip prep: 100 mg in 100 ml NS (1 mg/ml), priming 0.2-0.3 mg/kg then continuous 0.1-0.2 mg/kg/h. | Ihor |
  | 2026-07-17 | moz_prophylaxis_extremity_soft_tissue | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, Ураження кінцівок — без відкритого перелому | Ihor |
| 2026-07-17 | moz_cefazolin | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, таблиця вибору АЛЗ; Примітка 1 (Цефазолін макс. добова доза 6 г) | Ihor |
| 2026-07-17 | moz_clindamycin_iv | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, таблиця; Примітка 2 (кліндаміцин за наявності алергії на β-лактами) | Ihor |
| 2026-07-17 | moz_clindamycin_po | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, таблиця (Кліндаміцин 450 мг перорально) | Ihor |
| 2026-07-17 | moz_ertapenem | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, таблиця (Ертапенем 1 г в/в одноразово) | Ihor |
| 2026-07-17 | moz_metronidazole | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, таблиця (метронідазол 500 мг в/в кожні 8-12 год) | Ihor |
| 2026-07-17 | moz_moxifloxacin | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, таблиця; Розділ II п.3.11 (моксифлоксацин 400 мг одноразово) | Ihor |
| 2026-07-17 | moz_levofloxacin_po_once | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Розділ II п.3.11 (левофлоксацин 500 мг одноразово); Додаток (відкладена евакуація) | Ihor |
| 2026-07-17 | moz_levofloxacin_eye | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, Ураження очей (Левофлоксацин 500 мг в/в або 750 мг перорально один раз на добу) | Ihor |
| 2026-07-17 | moz_vancomycin | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, Ураження ЦНС / очей (ванкоміцин 15-20 мг/кг в/в кожні 8-12 год) | Ihor |
| 2026-07-17 | moz_ciprofloxacin | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, Ураження ЦНС (ципрофлоксацин 400 мг в/в кожні 8-12 год) | Ihor |
| 2026-07-17 | moz_ceftriaxone | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, Ураження ЦНС (Цефтріаксон 2 г в/в кожні 24 год) | Ihor |
| 2026-07-17 | moz_fluoroquinolone_eyedrops | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, Ураження очей (очні краплі з фторхінолоном по 1 краплі кожні 6 год) | Ihor |
| 2026-07-17 | moz_silver_sulfadiazine_topical | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, Опіки; Примітка 3 (при опіках використовувати виключно місцеві АЛЗ) | Ihor |
| 2026-07-17 | moz_cefazolin | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, таблиця вибору АЛЗ; Примітка 1 (Цефазолін макс. добова доза 6 г) | Ihor |
| 2026-07-17 | moz_clindamycin_iv | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, таблиця; Примітка 2 (кліндаміцин за наявності алергії на β-лактами) | Ihor |
| 2026-07-17 | moz_clindamycin_po | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, таблиця (Кліндаміцин 450 мг перорально) | Ihor |
| 2026-07-17 | moz_ertapenem | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, таблиця (Ертапенем 1 г в/в одноразово) | Ihor |
| 2026-07-17 | moz_metronidazole | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, таблиця (метронідазол 500 мг в/в кожні 8-12 год) | Ihor |
| 2026-07-17 | moz_moxifloxacin | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, таблиця; Розділ II п.3.11 (моксифлоксацин 400 мг одноразово) | Ihor |
| 2026-07-17 | moz_levofloxacin_po_once | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Розділ II п.3.11 (левофлоксацин 500 мг одноразово); Додаток (відкладена евакуація) | Ihor |
| 2026-07-17 | moz_levofloxacin_eye | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, Ураження очей (Левофлоксацин 500 мг в/в або 750 мг перорально один раз на добу) | Ihor |
| 2026-07-17 | moz_vancomycin | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, Ураження ЦНС / очей (ванкоміцин 15-20 мг/кг в/в кожні 8-12 год) | Ihor |
| 2026-07-17 | moz_ciprofloxacin | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, Ураження ЦНС (ципрофлоксацин 400 мг в/в кожні 8-12 год) | Ihor |
| 2026-07-17 | moz_ceftriaxone | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, Ураження ЦНС (Цефтріаксон 2 г в/в кожні 24 год) | Ihor |
| 2026-07-17 | moz_fluoroquinolone_eyedrops | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, Ураження очей (очні краплі з фторхінолоном по 1 краплі кожні 6 год) | Ihor |
| 2026-07-17 | moz_silver_sulfadiazine_topical | VERIFIED:Ihor:2026-07-17 | MOZ-ATB-2023 (2023) | Додаток, Опіки; Примітка 3 (при опіках використовувати виключно місцеві АЛЗ) | Ihor |
