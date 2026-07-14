import { describe, it, expect } from "vitest";
import {
  volumeTimeToGtt,
  doseToMlPerH,
  mlPerHToGtt,
  secPerDrop,
  bagRunHours,
  parseConcentrationMgPerMl,
  burnRuleOfTenMlPerH,
  doseRangeMg,
  clamp,
  WEIGHT,
} from "../src/drip/calc";

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
