import { describe, it, expect } from "vitest";
import {
  serializeDrips,
  deserializeDrips,
  STALE_AFTER_EMPTY_MS,
  type PersistedDrip,
} from "../src/drip/persistence";

// Spec 001 FR-13/AC-6f (Owner decision 2026-07-24): live drips survive an app
// restart so that state and the OS-level alarms stop having different
// lifetimes. Restored drips come back `unconfirmed` — that part is UI; what's
// tested here is the storage layer, which has to be paranoid: it parses
// whatever happens to be on disk, and a dosing tool must never fail to start
// because of a bad value in localStorage.

const NOW = 1_700_000_000_000;

function drip(over: Partial<PersistedDrip> = {}): PersistedDrip {
  return {
    id: "d1",
    label: "Дріп",
    gtt: 20,
    mlPerH: 100,
    dropFactor: 20,
    bagMl: 500,
    startedAt: NOW - 60_000,
    silenced: false,
    sourceRecordId: null,
    ...over,
  };
}

describe("drip persistence round-trip", () => {
  it("survives serialize → deserialize unchanged", () => {
    const d = drip();
    expect(deserializeDrips(serializeDrips([d]), NOW)).toEqual([d]);
  });

  it("keeps several drips", () => {
    const list = [drip({ id: "a" }), drip({ id: "b" }), drip({ id: "c" })];
    expect(deserializeDrips(serializeDrips(list), NOW)).toHaveLength(3);
  });

  it("keeps a drip with no bag timer (bagMl null)", () => {
    const d = drip({ bagMl: null });
    expect(deserializeDrips(serializeDrips([d]), NOW)).toEqual([d]);
  });
});

describe("displayTag never reaches storage (2026-07-24 threat model)", () => {
  it("is stripped even when smuggled in past the type system", () => {
    // displayTag can hold a callsign. The agreed model is that it lives in
    // memory only and is gone once the app closes — writing it to disk would
    // quietly break that. Types alone don't hold at runtime, so this checks
    // the structural guarantee: pass an object that *does* carry the field
    // (as a loose cast or sloppy refactor could) and it must not survive.
    const smuggled = {
      ...drip(),
      displayTag: "Сокіл-12",
    } as unknown as PersistedDrip;

    const raw = serializeDrips([smuggled]);

    expect(raw).not.toContain("displayTag");
    expect(raw).not.toContain("Сокіл-12");
    expect(deserializeDrips(raw, NOW)[0]).not.toHaveProperty("displayTag");
  });
});

describe("drip persistence rejects anything unusable", () => {
  it("returns empty for null / empty storage", () => {
    expect(deserializeDrips(null, NOW)).toEqual([]);
    expect(deserializeDrips("", NOW)).toEqual([]);
  });

  it("returns empty for malformed JSON instead of throwing", () => {
    // A partial write or a cleared key must not stop the app from starting.
    expect(deserializeDrips("{not json", NOW)).toEqual([]);
    expect(deserializeDrips("null", NOW)).toEqual([]);
    expect(deserializeDrips('{"drips":[]}', NOW)).toEqual([]);
  });

  it("drops entries with missing or wrong-typed fields", () => {
    const bad = [
      { ...drip(), id: "" },
      { ...drip(), gtt: "20" },
      { ...drip(), mlPerH: Number.NaN },
      { ...drip(), dropFactor: 0 },
      { ...drip(), silenced: "no" },
      { ...drip(), bagMl: "500" },
      { ...drip(), sourceRecordId: 42 },
      null,
      "nonsense",
    ];
    expect(deserializeDrips(JSON.stringify(bad), NOW)).toEqual([]);
  });

  it("keeps the good entries and drops only the bad ones", () => {
    const mixed = [drip({ id: "good" }), { ...drip({ id: "bad" }), gtt: null }];
    const out = deserializeDrips(JSON.stringify(mixed), NOW);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("good");
  });

  it("drops a drip that claims to have started in the future", () => {
    // Corrupt record or a device clock change — either way any countdown
    // derived from it would be nonsense.
    const d = drip({ startedAt: NOW + 60_000 });
    expect(deserializeDrips(JSON.stringify([d]), NOW)).toEqual([]);
  });
});

describe("staleness cutoff", () => {
  // 500 ml at 100 ml/h = 5 h run time.
  const FIVE_HOURS = 5 * 3600_000;

  it("keeps a drip that is still running", () => {
    const d = drip({ startedAt: NOW - 3600_000 }); // 1 h in, 4 h left
    expect(deserializeDrips(JSON.stringify([d]), NOW)).toHaveLength(1);
  });

  it("keeps a recently-emptied drip — that's the prompt to swap the bag", () => {
    const d = drip({ startedAt: NOW - FIVE_HOURS - 60_000 }); // empty 1 min ago
    expect(deserializeDrips(JSON.stringify([d]), NOW)).toHaveLength(1);
  });

  it("drops a drip that ran dry long ago", () => {
    const d = drip({
      startedAt: NOW - FIVE_HOURS - STALE_AFTER_EMPTY_MS - 60_000,
    });
    expect(deserializeDrips(JSON.stringify([d]), NOW)).toEqual([]);
  });

  it("never drops a drip with no bag timer, however old", () => {
    const d = drip({ bagMl: null, startedAt: NOW - 30 * 24 * 3600_000 });
    expect(deserializeDrips(JSON.stringify([d]), NOW)).toHaveLength(1);
  });
});
