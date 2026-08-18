import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Build-variant guard (2026-07-24). The Play Store build must not touch the
// OS-notification subsystem at all: it needs USE_EXACT_ALARM, a
// Play-restricted permission a dosing calculator has no business declaring.
//
// This used to be a separate git branch, which silently rotted 20 commits
// behind before anyone noticed. The whole point of moving it to a build flag
// is that one codebase serves both variants — so there has to be a test that
// the flag actually does something, or we've swapped a visible problem for an
// invisible one.

const calls: string[] = [];

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    getPending: vi.fn(async () => {
      calls.push("getPending");
      return { notifications: [] };
    }),
    cancel: vi.fn(async () => {
      calls.push("cancel");
    }),
    removeAllDeliveredNotifications: vi.fn(async () => {
      calls.push("removeAllDelivered");
    }),
    schedule: vi.fn(async () => {
      calls.push("schedule");
    }),
    createChannel: vi.fn(async () => {
      calls.push("createChannel");
    }),
    listChannels: vi.fn(async () => {
      calls.push("listChannels");
      return { channels: [] };
    }),
    checkPermissions: vi.fn(async () => {
      calls.push("checkPermissions");
      return { display: "granted" };
    }),
    requestPermissions: vi.fn(async () => {
      calls.push("requestPermissions");
      return { display: "granted" };
    }),
  },
}));

const plan = {
  id: "d1",
  label: "Дріп",
  silenced: false,
  fireAt10: Date.now() + 600_000,
  fireAt5: Date.now() + 900_000,
  fireAtEmpty: Date.now() + 1_200_000,
};

beforeEach(() => {
  calls.length = 0;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function loadWithVariant(variant: string | undefined) {
  vi.resetModules();
  if (variant === undefined) {
    vi.stubEnv("VITE_VARIANT", "");
  } else {
    vi.stubEnv("VITE_VARIANT", variant);
  }
  return import("../src/drip/notifications");
}

describe("VITE_VARIANT=play disables the OS-notification subsystem", () => {
  it("schedules nothing", async () => {
    const m = await loadWithVariant("play");
    await m.rescheduleDripAlarms(plan);
    expect(calls).toEqual([]);
  });

  it("never asks for notification permission", async () => {
    const m = await loadWithVariant("play");
    expect(await m.ensureNotificationPermission()).toBe(false);
    expect(calls).toEqual([]);
  });

  it("reports healthy rather than nagging about a permission it never uses", async () => {
    const m = await loadWithVariant("play");
    // A "notifications denied" warning in a build that schedules no
    // notifications would be noise, not safety — the UI shows an honest
    // "alarm works while the app is open" hint instead.
    expect(await m.checkNotificationHealth()).toEqual({
      permissionGranted: true,
      channelImportance: null,
    });
    expect(calls).toEqual([]);
  });

  it("has nothing to sweep", async () => {
    const m = await loadWithVariant("play");
    await m.cancelOrphanedAlarms();
    expect(calls).toEqual([]);
  });

  it("cancelling a drip's alarms is a no-op", async () => {
    const m = await loadWithVariant("play");
    await m.cancelDripAlarms("d1");
    await m.forgetStaleDrips(new Set());
    expect(calls).toEqual([]);
  });
});

describe("default (apk) variant keeps the full alarm stack", () => {
  it("still schedules — proving the flag is what's gating, not a broken mock", async () => {
    const m = await loadWithVariant(undefined);
    await m.rescheduleDripAlarms(plan);
    expect(calls).toContain("schedule");
  });

  it("still requests permission", async () => {
    const m = await loadWithVariant("apk");
    await m.ensureNotificationPermission();
    expect(calls).toContain("checkPermissions");
  });
});
