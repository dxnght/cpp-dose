// @vitest-environment jsdom
// AC-1.2 / SC-2 / T1.9 — metronome drift harness.
//
// The scheduler (src/drip/metronome.ts) derives audio, haptic and animation from
// ONE clock (the AudioContext timeline), so the three channels cannot drift apart.
// This test drives that scheduler with a deterministic fake AudioContext + fake
// timers over a simulated 10+ minute run, logs every audio tick timestamp, and
// asserts:
//   1. drift vs the ideal grid stays < 1 drop / 10 min (the acceptance criterion),
//      and in fact sub-millisecond — the scheduler adds the period with no
//      rounding, so a regression to integer-ms or a period round-off would fail here;
//   2. audio, haptic and animation each fire the SAME number of ticks — none get
//      dropped or drift apart.
//
// jsdom has no Web Audio, so we inject a fake AudioContext whose oscillator
// start(time) records the scheduled tick time (the canonical grid the audio clock
// would have played).

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Metronome } from "../src/drip/metronome";
import { __resetAudioForTests } from "../src/drip/audio";

interface FakeClock {
  currentTime: number;
}

// Install a minimal fake Web Audio API on window and capture every scheduled
// oscillator start time (= the metronome's scheduled tick time).
function installFakeAudio(clock: FakeClock): { ticks: number[]; uninstall: () => void } {
  const ticks: number[] = [];
  class FakeGain {
    gain = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
    connect() {}
  }
  class FakeOscillator {
    frequency = { value: 0 };
    connect() {}
    start(time: number) {
      ticks.push(time);
    }
    stop() {}
  }
  class FakeAudioContext {
    state = "running";
    destination = {};
    get currentTime() {
      return clock.currentTime;
    }
    createGain() {
      return new FakeGain();
    }
    createOscillator() {
      return new FakeOscillator();
    }
    resume() {
      return Promise.resolve();
    }
  }
  const w = window as unknown as { AudioContext?: unknown };
  const prev = w.AudioContext;
  w.AudioContext = FakeAudioContext as unknown as typeof AudioContext;
  return {
    ticks,
    uninstall: () => {
      w.AudioContext = prev as typeof AudioContext;
      __resetAudioForTests();
    },
  };
}

// Run the real scheduler for `minutes` of virtual time. currentTime and the fake
// timers advance in lockstep in 100 ms steps (< the 200 ms look-ahead, so the
// scheduler always stays ahead and never has to re-anchor / drop a tick).
function simulate(rate: number, minutes: number) {
  const clock: FakeClock = { currentTime: 0 };
  // The app now shares ONE AudioContext between the metronome and the alarm
  // (src/drip/audio.ts) — that shared context is what fixed the alarm being
  // silent on iOS. It memoises, so without this reset the second simulate()
  // in a file would keep the first case's fake and record zero ticks.
  __resetAudioForTests();
  const { ticks: audioTicks, uninstall } = installFakeAudio(clock);
  let hapticCount = 0;
  let animCount = 0;

  const m = new Metronome();
  m.setChannels({ audio: true, haptic: true, animation: true });
  m.setHapticHandler(() => {
    hapticCount++;
  });
  m.setTickHandler(() => {
    animCount++;
  });
  m.start(rate); // currentTime is 0 here → first tick anchored at 0.1 s

  const STEP_MS = 100;
  const totalMs = minutes * 60 * 1000;
  for (let elapsed = STEP_MS; elapsed <= totalMs; elapsed += STEP_MS) {
    clock.currentTime = elapsed / 1000;
    vi.advanceTimersByTime(STEP_MS);
  }
  m.stop();
  vi.runOnlyPendingTimers(); // flush any haptic/animation callbacks already queued

  uninstall();
  return { audioTicks, hapticCount, animCount };
}

describe("metronome drift (AC-1.2 / SC-2)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  for (const rate of [20, 42]) {
    it(`${rate} gtt/min stays on-grid over 10+ min (< 1 drop drift, 3 channels locked)`, () => {
      const minutes = 10.5;
      const { audioTicks, hapticCount, animCount } = simulate(rate, minutes);
      const period = 60 / rate;

      // enough ticks to actually cover a 10-minute window
      expect(audioTicks.length).toBeGreaterThanOrEqual(Math.floor((10 * 60) / period));

      // ticks are monotonic and sit on the ideal grid t0 + i·period
      const t0 = audioTicks[0];
      let maxDevSec = 0;
      for (let i = 1; i < audioTicks.length; i++) {
        expect(audioTicks[i]).toBeGreaterThan(audioTicks[i - 1]);
        maxDevSec = Math.max(maxDevSec, Math.abs(audioTicks[i] - (t0 + i * period)));
      }

      // AC-1.2: drift < 1 drop / 10 min. Exact addition → sub-millisecond in practice.
      expect(maxDevSec / period).toBeLessThan(1);
      expect(maxDevSec).toBeLessThan(0.001);

      // all three channels fired the same number of ticks (one shared clock)
      expect(hapticCount).toBe(audioTicks.length);
      expect(animCount).toBe(audioTicks.length);
    });
  }

  it("silent (vibration-only) mode still paces haptics with no audio ticks", () => {
    const clock: FakeClock = { currentTime: 0 };
    const { ticks: audioTicks, uninstall } = installFakeAudio(clock);
    let hapticCount = 0;

    const m = new Metronome();
    m.setChannels({ audio: false, haptic: true, animation: false });
    m.setHapticHandler(() => {
      hapticCount++;
    });
    m.start(20);
    for (let elapsed = 100; elapsed <= 60_000; elapsed += 100) {
      clock.currentTime = elapsed / 1000;
      vi.advanceTimersByTime(100);
    }
    m.stop();
    vi.runOnlyPendingTimers();
    uninstall();

    expect(audioTicks.length).toBe(0); // AC-1.3: no audio in vibration-only mode
    expect(hapticCount).toBeGreaterThanOrEqual(19); // ~20 taps/min at 20 gtt/min
  });
});
