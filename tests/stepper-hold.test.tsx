// UI polish pass (2026-08-15) — the ± Stepper buttons used to be single-tap
// only; sweeping a wide range (e.g. dose 0.1-2 mg/kg/h at a 0.05 step) took
// ~38 taps. This covers the hold-to-repeat addition in src/drip/components.tsx:
// a quick tap must still do exactly one step, and a completed hold must not
// let the browser's trailing click add a spurious extra step on release.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { Stepper } from "../src/drip/components";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderStepper(onChange: (v: number) => void) {
  return render(
    <Stepper
      label="Доза"
      value={1}
      display="1.00"
      step={0.05}
      min={0.1}
      max={2}
      onChange={onChange}
    />,
  );
}

describe("Stepper hold-to-repeat", () => {
  it("a quick tap still fires exactly one step", () => {
    const onChange = vi.fn();
    const { getByLabelText } = renderStepper(onChange);
    fireEvent.click(getByLabelText("Доза +"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(1.05);
  });

  it("holding past the repeat delay fires more than one step, and releasing does not add an extra one", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { getByLabelText } = renderStepper(onChange);
    const plus = getByLabelText("Доза +");

    fireEvent.pointerDown(plus);
    vi.advanceTimersByTime(2000); // well past the initial delay + several repeat ticks
    const countDuringHold = onChange.mock.calls.length;
    expect(countDuringHold).toBeGreaterThan(1);

    fireEvent.pointerUp(plus);
    fireEvent.click(plus); // the trailing click a real browser fires after a completed hold
    expect(onChange).toHaveBeenCalledTimes(countDuringHold);
  });

  it("releasing before the repeat delay elapses leaves the plain click to fire the single step", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { getByLabelText } = renderStepper(onChange);
    const plus = getByLabelText("Доза +");

    fireEvent.pointerDown(plus);
    vi.advanceTimersByTime(100); // short of the repeat delay — no auto-repeat should start
    fireEvent.pointerUp(plus);
    fireEvent.click(plus);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(1.05);
  });
});
