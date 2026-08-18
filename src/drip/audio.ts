// One shared, unlocked AudioContext for every sound the app makes.
//
// Why this module exists (Owner field report, 2026-07-25): on iPhone the
// alarm changed the card colour but produced **no sound at all**. That was
// not an iOS/PWA limitation — it was four separate defects in `alarm()`,
// each on its own enough to silence it:
//
//  1. **Created a fresh AudioContext inside a timer callback.** iOS starts
//     any AudioContext constructed outside a user gesture in the
//     `suspended` state, and a suspended context plays nothing. The
//     metronome worked only because `Metronome.start()` happens to be
//     called from a tap, which unlocks *its* context — a different one.
//  2. **Never called `resume()`.** Even an existing context gets suspended
//     by iOS when the app is backgrounded, and stays that way on return.
//  3. **No `webkitAudioContext` fallback**, unlike the metronome. On Safari
//     versions that only expose the prefixed constructor, `alarm()` found
//     `undefined` and silently did nothing at all.
//  4. **Leaked a context per alarm and never closed them.** iOS caps the
//     number of concurrent AudioContexts (historically ~4); past that,
//     construction throws — straight into `alarm()`'s empty `catch`, i.e.
//     silent failure exactly when the alarm matters most.
//
// So: one context for the whole app, created once, unlocked on the first
// user gesture, resumed defensively before every sound.
//
// **Still a genuine platform limit, and not fixable here:** on iOS the
// hardware Ring/Silent switch mutes Web Audio. A native app can override
// that by declaring an AVAudioSession `playback` category; a web app
// cannot. If the medic's phone is on silent, the alarm is visual and
// haptic only. The UI has to say so rather than imply a guarantee it can't
// keep — see the drip screen's alarm hint.

type AudioCtor = typeof AudioContext;

function getCtor(): AudioCtor | null {
  const w = window as unknown as {
    AudioContext?: AudioCtor;
    webkitAudioContext?: AudioCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

let ctx: AudioContext | null = null;
let unlocked = false;

/** The app's single AudioContext, created lazily. `null` where Web Audio
 * doesn't exist at all (jsdom in tests, very old browsers) — every caller
 * treats that as "no audio channel", never as an error. */
export function getAudioContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = getCtor();
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

/**
 * Unlock audio from inside a user gesture. Must be called from a real
 * touch/click handler — that is the whole point; calling it from a timer
 * does nothing on iOS.
 *
 * Playing a one-sample silent buffer is the part that actually performs the
 * unlock on iOS; `resume()` alone is not reliably enough on older versions.
 * Idempotent and cheap, so it is safe to wire to a broad "first interaction
 * anywhere" listener.
 */
export function unlockAudio(): void {
  const c = getAudioContext();
  if (!c) return;
  if (c.state === "suspended") void c.resume().catch(() => {});
  if (unlocked) return;
  try {
    const buf = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(0);
    unlocked = true;
  } catch {
    /* not fatal — resume() above may still have been enough */
  }
}

/** Nudge the context awake before making a sound. iOS suspends it whenever
 * the app is backgrounded, and an alarm firing on return would otherwise be
 * silent. Cheap enough to call unconditionally. Returns a promise so a
 * caller that schedules sound relative to ctx.currentTime (e.g. alarm())
 * can await the context actually being running first — resume() is
 * asynchronous, so a fire-and-forget call can still leave the context
 * "suspended" on the very next line. */
export function resumeAudio(): Promise<void> {
  if (ctx && ctx.state === "suspended") return ctx.resume().catch(() => {});
  return Promise.resolve();
}

/** Test seam only — resets the module between test cases. */
export function __resetAudioForTests(): void {
  ctx = null;
  unlocked = false;
}
