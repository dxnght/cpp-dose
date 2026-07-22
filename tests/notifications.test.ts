import { describe, it, expect } from "vitest";
import { dripScheduleKey } from "../src/drip/notifications";

// Owner field reports, 2026-07-22 (v5): the OS notification for a drip stage
// was getting silently self-cancelled the moment the in-app alarm caught up
// and flipped warned10/5/Empty, because the reschedule effect keyed on those
// flags. Fix: key purely on the parameters that actually change a drip's
// alarm timing. This locks in that the key function's signature has no way
// to accept warned10/5/Empty at all — regression-guards the bug at the type
// level, not just behaviorally.
describe("dripScheduleKey (Spec 001 FR-12, v5 regression, 2026-07-22)", () => {
  it("is stable for identical inputs", () => {
    const a = dripScheduleKey(100, 300, 1000, false);
    const b = dripScheduleKey(100, 300, 1000, false);
    expect(a).toBe(b);
  });

  it("changes when bagMl changes", () => {
    expect(dripScheduleKey(100, 300, 1000, false)).not.toBe(
      dripScheduleKey(150, 300, 1000, false),
    );
  });

  it("changes when mlPerH changes (retitration)", () => {
    expect(dripScheduleKey(100, 300, 1000, false)).not.toBe(
      dripScheduleKey(100, 320, 1000, false),
    );
  });

  it("changes when startedAt changes", () => {
    expect(dripScheduleKey(100, 300, 1000, false)).not.toBe(
      dripScheduleKey(100, 300, 2000, false),
    );
  });

  it("changes when silenced toggles", () => {
    expect(dripScheduleKey(100, 300, 1000, false)).not.toBe(
      dripScheduleKey(100, 300, 1000, true),
    );
  });
});
