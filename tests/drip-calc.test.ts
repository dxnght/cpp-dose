import { describe, it, expect } from "vitest";
import {
  volumeTimeToGtt,
  doseToMlPerH,
  mlPerHToGtt,
  secPerDrop,
  bagRunHours,
  retitratedStartedAt,
  parseConcentrationMgPerMl,
  burnRuleOfTenMlPerH,
  doseRangeMg,
  clamp,
  preSatisfiedAlarmStages,
  WEIGHT,
  VOLUME,
} from "../src/drip/calc";

const WARN10_MS = 10 * 60_000;
const WARN5_MS = 5 * 60_000;

describe("burn Rule of Ten", () => {
  it("(40%,70kg)=400, (40%,100kg)=600, (30%,80kg)=300", () => {
    expect(burnRuleOfTenMlPerH(40, 70)).toBe(400);
    expect(burnRuleOfTenMlPerH(40, 100)).toBe(600);
    expect(burnRuleOfTenMlPerH(30, 80)).toBe(300);
  });
  it("nearest-10 weight rule: 84kg no +100, 85kg +100, 95kg +200", () => {
    expect(burnRuleOfTenMlPerH(40, 84)).toBe(400);
    expect(burnRuleOfTenMlPerH(40, 85)).toBe(500);
    expect(burnRuleOfTenMlPerH(40, 95)).toBe(600);
  });
});

describe("bolus mg from mg/kg string", () => {
  it("range and single", () => {
    expect(doseRangeMg("0.2-0.3 mg/kg", 80)).toBe("16–24 мг");
    expect(doseRangeMg("1 mg/kg", 80)).toBe("80 мг");
  });
});

describe("bag-volume stepper stays on the 50 ml grid (Owner-reported regression, 2026-07-21)", () => {
  it("VOLUME.min is a multiple of the 50 ml stepper step", () => {
    // A min not aligned to the step let the DripScreen stepper clamp to the
    // floor, then climb off-grid (51, 101, 151 ml…) instead of round values.
    expect(VOLUME.min % 50).toBe(0);
  });
});

describe("preSatisfiedAlarmStages (Owner-reported regression, 2026-07-24)", () => {
  // Owner report: adding an 8-min bag immediately fired the "10 min left"
  // alarm at creation — remaining time started out already below the
  // threshold, so there was never a moment of crossing down through it.
  it("an 8-min bag pre-satisfies warned10 but not warned5", () => {
    // 100 ml @ 750 ml/h = 0.1333h = 8 min.
    expect(preSatisfiedAlarmStages(100, 750, WARN10_MS, WARN5_MS)).toEqual({
      warned10: true,
      warned5: false,
    });
  });

  it("a 3-min bag pre-satisfies both stages (nothing to warn about at all)", () => {
    // 100 ml @ 2000 ml/h = 0.05h = 3 min.
    expect(preSatisfiedAlarmStages(100, 2000, WARN10_MS, WARN5_MS)).toEqual({
      warned10: true,
      warned5: true,
    });
  });

  it("a 15-min bag pre-satisfies neither — both alarms are still real crossings", () => {
    // 100 ml @ 400 ml/h = 0.25h = 15 min.
    expect(preSatisfiedAlarmStages(100, 400, WARN10_MS, WARN5_MS)).toEqual({
      warned10: false,
      warned5: false,
    });
  });

  it("exactly 10 min is pre-satisfied for warned10 (boundary is inclusive)", () => {
    // 100 ml @ 600 ml/h = 0.16667h = 10 min exactly.
    expect(preSatisfiedAlarmStages(100, 600, WARN10_MS, WARN5_MS)).toEqual({
      warned10: true,
      warned5: false,
    });
  });

  it("no bag timer (bagMl null) pre-satisfies neither — moot, never checked", () => {
    expect(preSatisfiedAlarmStages(null, 750, WARN10_MS, WARN5_MS)).toEqual({
      warned10: false,
      warned5: false,
    });
  });

  it("mlPerH <= 0 pre-satisfies neither (guards the same way bagRunHours does)", () => {
    expect(preSatisfiedAlarmStages(100, 0, WARN10_MS, WARN5_MS)).toEqual({
      warned10: false,
      warned5: false,
    });
  });
});

describe("retitratedStartedAt (code review 2026-08-01 — retitration finish-time bug)", () => {
  const START = 1_700_000_000_000;

  it("preserves the true remaining-volume end time across a rate change", () => {
    // 500 ml bag at 200 ml/h; after 1h, 200 ml infused, 300 ml left. Dropping
    // to 100 ml/h should still empty the bag 4h after the original start
    // (1h elapsed + 300/100h remaining) — not 5h (500/100h from scratch).
    const oneHourIn = START + 3600_000;
    const newStart = retitratedStartedAt(START, 200, 100, oneHourIn);
    const endAt = newStart + bagRunHours(500, 100) * 3600_000;
    expect(endAt).toBe(START + 4 * 3600_000);
  });

  it("is a no-op when the rate doesn't change", () => {
    const now = START + 1234;
    expect(retitratedStartedAt(START, 100, 100, now)).toBe(START);
  });

  it("speeding up moves the end time earlier, not later (the safe direction)", () => {
    const oneHourIn = START + 3600_000;
    const newStart = retitratedStartedAt(START, 100, 200, oneHourIn);
    const endAt = newStart + bagRunHours(500, 200) * 3600_000;
    // Original rate (100 ml/h) would have emptied at START + 5h.
    expect(endAt).toBeLessThan(START + 5 * 3600_000);
  });

  it("handles a second retitration correctly (re-anchors from the first)", () => {
    // 500 ml @ 200 ml/h -> after 1h, drop to 100 ml/h -> after another 1h
    // (2h total elapsed), drop to 50 ml/h.
    // At the second retitration: 200 ml infused in hour 1, 100 ml infused in
    // hour 2 (at 100 ml/h) = 300 ml infused total, 200 ml left. At 50 ml/h
    // that's 4h more, so the bag should empty at START + 2h + 4h = START+6h.
    const oneHourIn = START + 3600_000;
    const twoHoursIn = START + 2 * 3600_000;
    const afterFirst = retitratedStartedAt(START, 200, 100, oneHourIn);
    const afterSecond = retitratedStartedAt(afterFirst, 100, 50, twoHoursIn);
    const endAt = afterSecond + bagRunHours(500, 50) * 3600_000;
    expect(endAt).toBe(START + 6 * 3600_000);
  });
});

describe("classic gravity drip (drip_rate) — SC-1", () => {
  it("(500 ml, 4 h, 20) -> 42", () => expect(volumeTimeToGtt(500, 240, 20)).toBe(42));
  it("(500 ml, 20 h, 20) -> 8", () => expect(volumeTimeToGtt(500, 1200, 20)).toBe(8));
  it("(1000 ml, 8 h, 15) -> 31", () => expect(volumeTimeToGtt(1000, 480, 15)).toBe(31));
  it("(250 ml, 30 min, 60) -> 500", () => expect(volumeTimeToGtt(250, 30, 60)).toBe(500));
});

describe("weight-based infusion (dose_rate_to_gtt)", () => {
  it("analgesia: 0.2 mg/kg/h, 80 kg, 1 mg/ml -> 16 ml/h -> 5 gtt/min @20", () => {
    const mlh = doseToMlPerH(0.2, 80, 1);
    expect(mlh).toBe(16);
    expect(Math.round(mlPerHToGtt(mlh, 20))).toBe(5);
  });
  it("analgesia: 0.1 mg/kg/h, 80 kg, 1 mg/ml -> ~3 gtt/min @20", () => {
    expect(Math.round(mlPerHToGtt(doseToMlPerH(0.1, 80, 1), 20))).toBe(3);
  });
  it("sedation: 1 mg/kg/h, 80 kg, 3 mg/ml -> 26.7 ml/h -> 9 gtt/min @20", () => {
    const mlh = doseToMlPerH(1, 80, 3);
    expect(mlh).toBeCloseTo(26.667, 2);
    expect(Math.round(mlPerHToGtt(mlh, 20))).toBe(9);
  });
});

describe("helpers", () => {
  it("secPerDrop", () => expect(Math.round(secPerDrop(5))).toBe(12));
  it("bagRunHours: 100 ml at 15 ml/h ~ 6.7 h", () => expect(bagRunHours(100, 15)).toBeCloseTo(6.667, 2));
  it("parses concentration from record strings", () => {
    expect(parseConcentrationMgPerMl("1 mg/ml — STANDARD (1 ml = 1 mg).")).toBe(1);
    expect(parseConcentrationMgPerMl("3 mg/ml (750 mg = 1.5 amp of 500 mg/5 ml, in 250 ml NS)")).toBe(3);
    expect(parseConcentrationMgPerMl("n/a (crystalloid)")).toBeNull();
  });
  it("clamp respects bounds", () => {
    expect(clamp(200, WEIGHT)).toBe(150);
    expect(clamp(10, WEIGHT)).toBe(30);
  });
});
