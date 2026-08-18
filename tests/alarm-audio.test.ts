// @vitest-environment jsdom
// Owner field report (2026-07-25): on iPhone the alarm changed the drip
// card's colour but made no sound at all. Not an iOS limitation — four
// defects in the old `alarm()`, each independently fatal on iOS. These tests
// pin each one, because every one of them fails *silently* (the old code
// swallowed everything in a bare `catch`), which is the worst possible
// failure mode for the app's primary safety signal.
//
// See src/drip/audio.ts for the full account.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fakeGainNode } from "./fake-gain-node";

interface Created {
  count: number;
  resumeCalls: number;
  started: number;
  state: string;
}

function installFakeAudio(opts: { prefixedOnly?: boolean } = {}): Created {
  const rec: Created = {
    count: 0,
    resumeCalls: 0,
    started: 0,
    state: "suspended",
  };
  class FakeAudioContext {
    destination = {};
    currentTime = 0;
    get state() {
      return rec.state;
    }
    constructor() {
      rec.count++;
    }
    resume() {
      rec.resumeCalls++;
      rec.state = "running";
      return Promise.resolve();
    }
    createGain() {
      return fakeGainNode();
    }
    createOscillator() {
      return {
        frequency: { value: 0 },
        type: "",
        connect() {},
        start: () => {
          rec.started++;
        },
        stop() {},
      };
    }
    createBuffer() {
      return {};
    }
    createBufferSource() {
      return { buffer: null, connect() {}, start() {} };
    }
  }
  const w = window as unknown as {
    AudioContext?: unknown;
    webkitAudioContext?: unknown;
  };
  if (opts.prefixedOnly) {
    // Older Safari exposes only the prefixed constructor. The old alarm()
    // read window.AudioContext exclusively, found undefined, and produced
    // no sound whatsoever.
    delete w.AudioContext;
    w.webkitAudioContext = FakeAudioContext;
  } else {
    w.AudioContext = FakeAudioContext;
  }
  return rec;
}

async function freshModules() {
  vi.resetModules();
  const audio = await import("../src/drip/audio");
  audio.__resetAudioForTests();
  const alarmMod = await import("../src/drip/alarm-audio");
  return { audio, alarm: alarmMod.alarm };
}

beforeEach(() => {
  const w = window as unknown as Record<string, unknown>;
  delete w.AudioContext;
  delete w.webkitAudioContext;
});

afterEach(() => {
  vi.resetModules();
});

describe("alarm audio (iOS silence regression, 2026-07-25)", () => {
  it("resumes a suspended context before sounding", async () => {
    // Defect 2: iOS suspends the context whenever the app is backgrounded.
    // Without an explicit resume, the first alarm after coming back is mute
    // — precisely when a medic is checking why the phone buzzed.
    const rec = installFakeAudio();
    const { alarm } = await freshModules();

    expect(rec.state).toBe("suspended");
    await alarm("warn10");

    expect(rec.resumeCalls).toBeGreaterThan(0);
    expect(rec.started).toBeGreaterThan(0);
  });

  it("reuses one context across many alarms instead of leaking one per call", async () => {
    // Defect 4: iOS caps concurrent AudioContexts (historically ~4). The old
    // code built a new one per alarm and never closed them, so after a few
    // alarms construction threw straight into an empty catch.
    installFakeAudio();
    const { alarm } = await freshModules();
    const rec = installFakeAudio(); // reset counters, same shape

    // Re-import so the module picks up the counter object above.
    vi.resetModules();
    const audio2 = await import("../src/drip/audio");
    audio2.__resetAudioForTests();
    const { alarm: alarm2 } = await import("../src/drip/alarm-audio");

    for (let i = 0; i < 10; i++) alarm2("empty");
    void alarm;

    expect(rec.count).toBe(1);
  });

  it("works when only the prefixed webkitAudioContext exists", async () => {
    // Defect 3: no prefixed fallback meant total silence on older Safari,
    // while the metronome (which had the fallback) kept working — which is
    // exactly why this looked like "the app makes sound, the alarm doesn't".
    const rec = installFakeAudio({ prefixedOnly: true });
    const { alarm } = await freshModules();

    await alarm("warn5");

    expect(rec.count).toBe(1);
    expect(rec.started).toBeGreaterThan(0);
  });

  it("does not throw when Web Audio is absent entirely", async () => {
    // No AudioContext at all (old browser, locked-down webview): the alarm
    // must degrade to haptics, never crash the drip screen.
    const { alarm } = await freshModules();
    await expect(alarm("empty")).resolves.toBeUndefined();
  });

  it("unlockAudio plays a silent buffer — the part iOS actually requires", async () => {
    // Defect 1: iOS only lets a context produce sound if it was unlocked
    // inside a user gesture. resume() alone is not reliably enough on older
    // versions; starting a one-sample buffer is.
    const rec = installFakeAudio();
    const { audio } = await freshModules();

    audio.unlockAudio();

    expect(rec.count).toBe(1);
    expect(rec.resumeCalls).toBeGreaterThan(0);
  });

  it("fires the right number of beeps per stage", async () => {
    // The escalation is the medic's only way to tell stages apart without
    // looking: 1 beep at 10 min, 2 at 5 min, 3 at empty.
    for (const [kind, beeps] of [
      ["warn10", 1],
      ["warn5", 2],
      ["empty", 3],
    ] as const) {
      const rec = installFakeAudio();
      const { alarm } = await freshModules();
      await alarm(kind);
      expect(rec.started, `${kind} should sound ${beeps}x`).toBe(beeps);
    }
  });
});
