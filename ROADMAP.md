# CPP-DOSE — Roadmap & Milestones

Proposed. This is the "how deep do we go" map: what's the **minimum** that makes a
genuinely useful, safe field tool, and the **maximum** we could grow into. Refine
with the Owner. Nothing here changes the constitution or the fail-closed model.

## Scope boundary (what this is, and isn't)

- **Is:** a focused, offline **drip-setup** tool — a small curated set of verified
  drip medications/fluids, drop-rate math, pacing (metronome + chamber + timers),
  and burn fluid. A "good analog of Goterum, aligned with TCCC/PCC."
- **Isn't:** a full drug database / formulary, an EHR, or a protocol reader. Content
  grows slowly and deliberately, always source-tagged and Owner-verified.

## Current state

MVP is **feature-complete**: drip engine (drop-factor, steppers, gtt/min hero, up to 3
concurrent drips + 5-min alarm), by-drug mode, "Час мішка", burn (Rule of Ten), focus
mode, tap-calibrator, light/dark themes, wake-lock, Capacitor Haptics. Governance +
CI + GitHub-ready. Android APK builds; iOS scaffold in place. **6 clinical records
verified** (currently re-verifying the analgesia drip after a citation fix).

---

## Milestones

### M0 — Foundation & MVP build ✅ DONE
Governance (constitution, specs, ADRs), fail-closed pipeline, drip engine + all
modules, themes, both native shells scaffolded, CI, repo prepared for GitHub.

### M1 — Clinical content complete & verified  *(gates any field use — mostly Owner)*
- Archive every source with checksum (TCCC-2026 ✔, MOZ ✔, CPG-61 ✔, CPG-91 ✔;
  confirm PCC-BURN edition; archive JTS originals where only UA translations exist).
- Verify the full **curated drip set**: analgesia drip + priming bolus, sedation drip
  + loading, burn fluid, `burn_rule_of_ten`, analgesia/sedation boluses.
- Resolve `clinical/OPEN-CLINICAL-QUESTIONS.md`: IM ketamine doses, esketamine (needs
  its own source), Appendix B numeric drip tables (transcribe carefully), weight
  bounds / sub-40 kg behavior. Park pediatric + antibiotic-by-injury.
- **DoD:** `npm run gate:release` green with the intended field content; Owner sign-off
  logged in `VERIFICATION-LOG.md`.

### M2 — Field-release hardening → **v1.0**  *(first real field pilot)*
- Lighthouse PWA installability pass; on-device airplane-mode soak of every module.
- Metronome drift test on-device (SC-2, ≥10 min); 48 px audit ✔.
- Signed **Android APK** (+ PWA) running on the Owner's device; icons/splash.
  *(iOS parity is a follow-on — M2b — not a v1.0 blocker.)*
- First-run disclaimer + "about/sources" screen final.
- **DoD:** all Spec-000 success criteria (SC-1…SC-9) green + Owner release sign-off.
- **Outcome:** hand v1.0 to a small group of medics for real feedback.

### M3 — Post-MVP growth  *(from `IDEAS.md`, each source-gated & opt-in)*
- More drip drugs/fluids via the pipeline; **esketamine** once sourced; Appendix B
  numeric tables in-app.
- Pediatric mode; antibiotic-by-injury browser (data already seeded).
- TQ-timer + PFC care-timer modules (reminders only, never clinical decisions).
- Night-vision red theme toggle; auto-dim in focus (Capacitor Brightness); drip
  start-time + handover notes.

---

## Minimum vs Maximum

| | **Minimum viable field tool (v1.0)** | **Maximum (v2+)** |
|---|---|---|
| Content | Ketamine analgesia + sedation drips, burn fluid + boluses (verified) | Full CPP infusion set, pediatric, antibiotics-by-injury |
| Features | Drip engine, by-drug, bag-time, burn, focus, timers, calibrator | + timer modules, multi-casualty, handover/export |
| Platforms | Android APK + PWA | + polished iOS (TestFlight for other medics) |
| Effort | Owner verification + M2 hardening | ongoing, incremental |

**Recommendation:** ship the **focused v1.0** (the drip set above) as soon as M1+M2
are green — it's already a genuinely useful, safe field tool — then grow content
incrementally through the pipeline. Depth is bounded by "what's verified," not by code.

## Decisions (Owner, 2026-07-15)

1. **v1.0 depth = focused minimum** — ketamine analgesia + sedation drips, burn
   fluid, and the priming/loading boluses. Broader content (TXA, antibiotics,
   Appendix B numeric tables, esketamine, pediatric) grows *after* v1.0 via the
   pipeline (M3).
2. **Platform = Android-first** — v1.0 ships as **Android APK + PWA**; iOS parity is
   a follow-on (**M2b**), not a v1.0 blocker.
3. **M3 content ambition** — still open; decide per-item when we get there.

### What "v1.0 content complete" now means (the short list)
`pcc_ketamine_analgesia_infusion` (+ `pcc_ketamine_analgesia_priming`),
`pcc_ketamine_sedation_infusion` (+ `pcc_ketamine_sedation_loading`),
`pcc_burn_fluid`, `burn_rule_of_ten` — all `VERIFIED` + sources archived. Everything
else in the protocol file stays parked (excluded by the gate) until M3.
