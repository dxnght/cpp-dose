// The in-app alarm tone. Extracted from DripScreen.tsx (2026-07-24).
//
// This is the fail-closed baseline alarm channel: it works whenever the app
// is foregrounded, with no permissions and no OS involvement. The OS-level
// notification backstop (notifications.ts) is a *separate, independent*
// channel for the same event — see decisions/ADR-0008-notification-saga.md
// before changing how the two relate.
import { warnHaptic, emptyHaptic } from "./haptics";
import { getAudioContext, resumeAudio } from "./audio";

// Distinct, escalating alarm feel so a medic can tell the stage apart without
// looking: a single beep at 10-min-out, a double at 5-min-out, a long triple
// at empty.
//
// Uses the app's one shared, gesture-unlocked AudioContext (see audio.ts).
// This function used to build its own context on every call, from inside a
// timer — which meant no sound at all on iOS. Do not reintroduce a local
// `new AudioContext()` here.
export function alarm(kind: "warn10" | "warn5" | "empty"): void {
  try {
    // Order matters: fetch (creating if needed) *then* resume. resumeAudio()
    // only acts on an already-created context, so calling it first made the
    // very first alarm of a session skip the resume entirely — which is the
    // exact case that matters when the medic hasn't touched the screen yet.
    // A unit test pins this ordering.
    const ctx = getAudioContext();
    resumeAudio();
    if (ctx) {
      const beeps = kind === "empty" ? 3 : kind === "warn5" ? 2 : 1;
      // Louder + longer (Owner, 2026-07-21 — the old 0.3-gain/0.2s sine beeps
      // were too quiet/soft to trust in the field). Square wave cuts through
      // better than sine; near-max gain sustained for most of the beep.
      const beepLen = 0.45;
      const gap = 0.55;
      for (let i = 0; i < beeps; i++) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "square";
        o.frequency.value = kind === "empty" ? 520 : 660;
        const t = ctx.currentTime + i * gap;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.9, t + 0.015);
        g.gain.setValueAtTime(0.9, t + beepLen - 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + beepLen);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + beepLen);
      }
    }
  } catch {
    /* audio unavailable */
  }
  if (kind === "empty") emptyHaptic();
  else warnHaptic();
}
