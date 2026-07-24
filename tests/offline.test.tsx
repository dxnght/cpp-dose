// AC-0.4 / SC-3: the app makes ZERO network requests. We install spies over every
// egress API, drive the whole UI, and assert nothing was called (Constitution Art. V).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { App } from "../src/App";

const egressSpies: ReturnType<typeof vi.fn>[] = [];

beforeEach(() => {
  localStorage.clear();
  egressSpies.length = 0;
  const spy = () => {
    const f = vi.fn(() => {
      throw new Error("network call attempted — forbidden (Art. V)");
    });
    egressSpies.push(f);
    return f;
  };
  vi.stubGlobal("fetch", spy());
  vi.stubGlobal("XMLHttpRequest", class {
    open = spy();
    send = spy();
    setRequestHeader = vi.fn();
  });
  vi.stubGlobal("WebSocket", spy());
  vi.stubGlobal("EventSource", spy());
  if (!("sendBeacon" in navigator)) {
    Object.defineProperty(navigator, "sendBeacon", { value: spy(), configurable: true });
  } else {
    vi.spyOn(navigator, "sendBeacon").mockImplementation(spy());
  }
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("offline / zero exfiltration", () => {
  it("makes no network request across every screen", () => {
    render(<App />);
    // First-run disclaimer is up; acknowledge it, then visit every screen.
    fireEvent.click(screen.getByRole("button", { name: "Я зрозумів(-ла)" }));
    for (const label of ["Крапельниця", "Препарати", "Про застосунок / джерела", "Показати повне застереження"]) {
      fireEvent.click(screen.getByRole("button", { name: label }));
    }
    for (const s of egressSpies) expect(s).not.toHaveBeenCalled();
  });
});
