// Shared by tests/alarm-audio.test.ts and tests/metronome-drift.test.ts, whose
// fake AudioContexts otherwise each hand-rolled an identical GainNode stub.
// The two mocks differ in every part that's actually under test (oscillator
// tick recording vs. start-call counting, resume/state behaviour) — this is
// only the one inert, byte-identical piece neither test suite exercises.
export function fakeGainNode() {
  return {
    gain: {
      setValueAtTime() {},
      exponentialRampToValueAtTime() {},
    },
    connect() {},
  };
}
