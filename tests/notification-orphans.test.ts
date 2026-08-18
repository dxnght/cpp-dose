import { describe, it, expect, vi, beforeEach } from "vitest";

// v6 regression (Owner field report, 2026-07-24): "надсилає повідомлення про
// закінчення дріпу навіть коли всі дріпи видалено і додаток не запущено."
//
// The cause was a lifetime mismatch: the module's id bookkeeping lives in
// memory, but the notifications live in Android's AlarmManager, which
// survives the process being killed. After a restart the app could no longer
// name the ids it had previously scheduled, so nothing could cancel them and
// the orphaned alarm fired on time with no drip behind it.
//
// These tests pin the two properties of the fix that are easy to regress:
// the startup sweep actually cancels what's pending, and — the subtle one —
// scheduling never runs before that sweep has finished.

const calls: string[] = [];
let pendingIds: number[] = [];
let resolveGetPending: (() => void) | null = null;

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    getPending: vi.fn(async () => {
      calls.push("getPending");
      // Let a test hold the sweep open to prove ordering.
      if (resolveGetPending) {
        await new Promise<void>((r) => {
          resolveGetPending = r;
        });
      }
      return { notifications: pendingIds.map((id) => ({ id })) };
    }),
    cancel: vi.fn(async (arg: { notifications: { id: number }[] }) => {
      calls.push(`cancel:${arg.notifications.map((n) => n.id).join(",")}`);
    }),
    removeAllDeliveredNotifications: vi.fn(async () => {
      calls.push("removeAllDelivered");
    }),
    schedule: vi.fn(async () => {
      calls.push("schedule");
    }),
    createChannel: vi.fn(async () => {}),
    listChannels: vi.fn(async () => ({ channels: [] })),
    checkPermissions: vi.fn(async () => ({ display: "granted" })),
    requestPermissions: vi.fn(async () => ({ display: "granted" })),
  },
}));

async function freshModule() {
  vi.resetModules();
  calls.length = 0;
  return import("../src/drip/notifications");
}

beforeEach(() => {
  pendingIds = [];
  resolveGetPending = null;
});

describe("orphaned notification sweep (v6 regression, 2026-07-24)", () => {
  it("cancels every alarm left pending by a previous session", async () => {
    pendingIds = [1, 2, 3];
    const m = await freshModule();

    await m.cancelOrphanedAlarms();

    expect(calls).toContain("getPending");
    expect(calls).toContain("cancel:1,2,3");
  });

  it("also clears already-delivered notifications from the dead session", async () => {
    pendingIds = [];
    const m = await freshModule();

    await m.cancelOrphanedAlarms();

    // Nothing pending to cancel, but the tray still needs clearing — a
    // delivered "мішок закінчився" for a drip that no longer exists is
    // exactly what the medic reported seeing.
    expect(calls).toContain("removeAllDelivered");
  });

  it("runs only once no matter how many times it's called", async () => {
    pendingIds = [7];
    const m = await freshModule();

    await Promise.all([
      m.cancelOrphanedAlarms(),
      m.cancelOrphanedAlarms(),
      m.cancelOrphanedAlarms(),
    ]);

    expect(calls.filter((c) => c === "getPending")).toHaveLength(1);
  });

  it("never schedules a new alarm before the sweep has finished", async () => {
    // The race this guards: session-local ids restart at 1 every launch, so
    // a drip added immediately on open gets the same ids as the orphans
    // being swept. If scheduling didn't wait, the in-flight sweep would
    // cancel the *new* drip's alarms and the medic would get no warning at
    // all — a worse failure than the one being fixed.
    pendingIds = [1, 2, 3];
    resolveGetPending = () => {}; // hold the sweep open
    const m = await freshModule();

    const scheduling = m.rescheduleDripAlarms({
      id: "d1",
      label: "Дріп",
      silenced: false,
      fireAt10: Date.now() + 600_000,
      fireAt5: Date.now() + 900_000,
      fireAtEmpty: Date.now() + 1_200_000,
    });

    // Drain plenty of microtasks: without the gate, scheduling would run
    // its own cancel → ensureChannel → schedule chain straight through
    // while the sweep is still parked, and "schedule" would show up here.
    for (let i = 0; i < 50; i++) await Promise.resolve();
    expect(calls).not.toContain("schedule");

    resolveGetPending?.(); // let the sweep complete
    await scheduling;

    // Both must have happened, in this order. Asserting presence first
    // matters: a bare indexOf comparison passes vacuously when the sweep
    // never ran at all (-1 < any real index), which is exactly the broken
    // state this test exists to catch.
    expect(calls).toContain("cancel:1,2,3");
    expect(calls).toContain("schedule");
    expect(calls.indexOf("cancel:1,2,3")).toBeLessThan(
      calls.indexOf("schedule"),
    );
  });
});
