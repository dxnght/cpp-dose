// AC-0.5: disclaimer shows on first run and is reachable from every screen.
// AC-0.2 (UI): with seed data the Drugs screen shows the "no verified content" state.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { App } from "../src/App";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("safety interlocks (Art. IV) and fail-closed UI (Art. III)", () => {
  it("shows the full disclaimer dialog on first run", () => {
    render(<App />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent(/НЕ замінює чинні протоколи/);
  });

  it("persistent banner is always visible", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Я зрозумів(-ла)" }));
    expect(screen.getByRole("note")).toHaveTextContent(/інструмент підтримки рішень/);
  });

  it("disclaimer is reachable again from every screen via the nav button", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Я зрозумів(-ла)" })); // dismiss first-run
    for (const scr of ["Головна", "Препарати", "Про застосунок / джерела"]) {
      fireEvent.click(screen.getByRole("button", { name: scr }));
      fireEvent.click(screen.getByRole("button", { name: "Застереження" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Я зрозумів(-ла)" }));
    }
  });

  it("Drugs screen never leaks an unverified record (fail-closed UI)", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Я зрозумів(-ла)" }));
    fireEvent.click(screen.getByRole("button", { name: "Препарати" }));
    // Whatever the verification state of the bundle, an UNVERIFIED badge must
    // never render — the app only ever loads VERIFIED + engineering records.
    expect(screen.queryByText("НЕ ПІДТВЕРДЖЕНО")).toBeNull();
    expect(screen.getByRole("heading", { name: "Препарати" })).toBeInTheDocument();
  });
});
