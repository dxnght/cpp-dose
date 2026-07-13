# Drip Set — ready for Owner verification (2026-07-13)

Everything below is `UNVERIFIED`. **Sources are now archived** (PDFs + SHA-256
recorded 2026-07-13), so the only remaining step is **your verification**. Nothing
ships until you stamp a record.

For each record you have checked against its PDF:
`npm run verify:record -- <id> "Ihor"` → then `npm run compile:field && npm run gate:release`.

Do not stamp a record until you've eyeballed it against the archived source. Values
were drafted from the Ukrainian translations + your notes; the English JTS originals
(CPG 61, CPG 91) are now in `clinical/sources/` — confirm against them.

## A. Sources — ARCHIVED ✓ (PDFs + SHA-256 recorded 2026-07-13)

| Source id | Document | Get it from |
|-----------|----------|-------------|
| `JTS-CPG-61` | Analgesia & Sedation during PFC (11 May 2017) | jts.health.mil …`Analgesia_and_Sedation_Management_during_PFC_11_May_2017_ID61.pdf` |
| `JTS-CPG-91` | Prolonged Casualty Care Guidelines (21 Dec 2021) | jts.health.mil …`Prolonged_Casualty_Care_Guidelines_21_Dec_2021_ID91.pdf` |
| `PCC-BURN` | Burn Wound Management under PFC (confirm ID) | tccc.org.ua burns guide / JTS burn CPG |
| `TCCC-2026` | already archived | confirm it's the complete edition |

(The web tooling here returns text only, not the binary PDF, so archival + checksum
is a local/Owner step.)

## B. Continuous DRIPS (metronome-paced) — the core of the app

1. **`pcc_ketamine_analgesia_infusion`** — ANALGESIA drip.
   Mix **100 mg in 100 ml NS (1 mg/ml)**. **Priming bolus 0.2–0.3 mg/kg** (guideline
   20–30 mg; you use 0.2 and assess), **then drip 0.1–0.2 mg/kg/h**. Endpoint =
   **pain relief**; **nystagmus = sedation overshoot, avoid**.
   ⚠ **Provenance:** this low-dose analgesic infusion is **NOT in CPG-61** (which
   frames the ketamine drip as *sedation*) and was not found in CPG-91 either — it's
   **your practice recipe**. Decide/confirm its source before you verify this one.
2. **`pcc_ketamine_sedation_infusion`** — SEDATION drip.
   Mix **750 mg in 250 ml NS (3 mg/ml)**. Loading **1 mg/kg** over 60 s, then
   **1 mg/kg/h** (non-intubated) / **1–2 mg/kg/h** (intubated). Endpoint =
   **nystagmus**. Source: `JTS-CPG-61` Appendix B.
3. **`pcc_burn_fluid`** — burn-shock fluid drip.
   **Lactated Ringer's / Plasmalyte**; rate by **Rule of Ten (%TBSA × 10 ml/h,
   +100/10 kg over 80 kg)**; titrate to **urine 30–50 ml/h** (peds 0.5–1 ml/kg/h),
   ±25% every 1–2 h. Source: `PCC-BURN` (concordant with TCCC 2026 Rule of Ten).

## C. Supporting boluses / formula (part of the set, not paced drips)

4. **`pcc_ketamine_analgesia_iv`** — analgesia bolus 0.1–0.2 mg/kg IV/IO q10–20 min;
   endpoint pain relief (nystagmus/RR<10 = stop).
5. **`pcc_ketamine_sedation_loading`** — 1 mg/kg IV/IO over 60 s before the sedation drip.
6. **`burn_rule_of_ten`** — the rate formula (TCCC 2026 §15.e; confirmed by PCC burns).

## D. Do NOT verify until resolved (see `OPEN-CLINICAL-QUESTIONS.md` §E)

- Appendix B **numeric ketamine drip tables** — not transcribed as numbers yet
  (mg/kg/h ↔ mcg/kg/min ↔ ml/h ↔ drops/min for 15 & 10 gtt/ml). High-risk; do
  separately and carefully.
- **IM ketamine doses** — uncertain ("~4–8 mg/kg"); IM not used in prolonged care.
- **Esketamine / Ketanest** — DOUBLE concentration; recorded only as a warning, **no
  dose entered** (deriving it = extrapolation). Needs its own registered source.
- **Analgesia-drip rate discrepancy** — a prior note said 0.2–0.3 mg/kg/h for the
  drip; refined 2026-07-13 to **priming bolus 0.2–0.3 mg/kg then drip 0.1–0.2
  mg/kg/h**. Confirm.

## E. Verify (after archiving the source)

```
npm run verify:record -- pcc_ketamine_analgesia_infusion "Ihor"
npm run verify:record -- pcc_ketamine_sedation_infusion  "Ihor"
npm run verify:record -- pcc_burn_fluid                  "Ihor"
npm run compile:field && npm run gate:release
```
