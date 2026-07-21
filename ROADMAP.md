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

## Current state (updated 2026-07-21)

MVP is **feature-complete**: drip engine (drop-factor, steppers, gtt/min hero, up to 5
concurrent drips + two-stage 10-min/5-min pre-end alarms), by-drug mode, "Час мішка", burn (Rule of Ten), focus
mode, tap-calibrator, light/dark themes, wake-lock, Capacitor Haptics. Governance +
CI + GitHub-ready (`github.com/dxnght/cpp-dose`, `master` branch). **Android APK
field-tested by the Owner on a real device — no issues reported.** iOS scaffold in
place, currently blocked on a device/OS mismatch (not a v1.0 blocker, Android-first
per Owner decision). **43 clinical records + 2 engineering formulas verified**: the
full v1.0 focused drip set, all 25 MOZ-ATB-2023 antibiotic records, and 3/4 of the
TCCC-2026 general antibiotics (`feature/antibiotics-reference` merged to `master`,
Spec 004 / ADR-0007 / Sprint 4).

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
- Pediatric mode; antibiotic-by-injury browser — **DONE and merged to `master`**
  (Spec 004 / ADR-0007 / Sprint 4): read-only, source-separated TCCC 2026 + MOZ 2023
  reference in "Препарати". Content-complete (25/25 MOZ + 3/4 TCCC verified); the
  duration-escalation logic originally imagined for this feature (in
  `TACMED-POC-MASTER-BRIEF.md` §5.2 item 8) was **not found in the archived source**
  and was **not built** — flagged for the Owner, not guessed at (Art. I).
- TQ-timer + PFC care-timer modules (reminders only, never clinical decisions) —
  **in spec** (Spec 006 / Spec 007 / Sprint 5), see "Development vectors" below.
- Night-vision red theme toggle; auto-dim in focus (Capacitor Brightness); drip
  start-time + handover notes.

---

## Development vectors (Owner review, 2026-07-18)

Four directions were proposed for what comes next, all constrained to the existing
**source lock** (TCCC-2026, MOZ-ATB-2023, JTS-CPG-61/91, PCC-BURN — no new source
without Owner approval) and the project's minimalist stance: grow *verified content
and precision*, not app surface area. Owner picked **(B) v1.0 tails** and **(C)
timer modules** to work first; (A) and (D) stay queued.

**(A) Fixed-dose reference screen** — `TACMED-POC-MASTER-BRIEF.md` §5.2 item 1
(TXA, esketamine, ondansetron, calcium, hypertonic saline, meloxicam/paracetamol,
midazolam). Cheapest of the four: all ~14 records are **already transcribed and
seeded** in `uk-cpp.v1.json` as `UNVERIFIED` TCCC-2026 drugs — needs a small
read-only screen (same shape as the antibiotics reference) + Owner verification,
no new sourcing. Queued.

**(B) Close the [v1.0] tails** — ✅ mostly done. Checklist in
`clinical/OPEN-CLINICAL-QUESTIONS.md` §A: PCC-BURN's exact JTS CPG ID **resolved**
(CPG ID 57, 13 Jan 2017, confirmed against jts.health.mil); JTS-CPG-61 cross-check
against the English original **resolved** — all 4 verified ketamine drip records
match the EN source exactly, no discrepancies. TCCC-2026 edition is corroborated
(low residual risk, optional). The one remaining item is Owner-only:
`tccc_cephalexin_po` verification (one command, in the checklist).

**(C) Timer modules — resolved same day, smaller than proposed.** Owner reviewed
`specs/006-tq-timer` / `specs/007-pfc-nursing-timer` and decided: **TQ-timer
withdrawn** — no separate tourniquet-timer subsystem; the whole "timer module"
ask turned out to be **the existing drip end-of-bag pre-end alarm, with its lead
time changed from 5 → 10 min** (done — `PRE_END_ALARM_MS` in `DripScreen.tsx`,
logged in `CHANGELOG.md`). **PFC nursing-timer stays on hold** — Owner still
deciding whether it's needed at all; spec drafted (JTS-CPG-91 Table 17 q2h
subset) but not approved for work. `sprints/sprint-05-timer-modules.md` has no
active backlog right now.

**(D) Field-hardening (M2 close-out)** — `CHANGELOG.md` (missing, flagged),
Lighthouse PWA-installability pass, on-device airplane-mode soak log, signed
release APK, and a decision on whether the red night theme is still wanted (the
app currently has light/dark Apple-style themes instead). No new clinical content.
Queued.

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
