// Search box on "Препарати" (2026-08-15, Owner-directed): filters all three
// sections by drug name, indication text, or (for MOZ prophylaxis cards) the
// injury_type body-part label — a query like "Очі" should surface the eye
// prophylaxis cards even though no drug name contains it.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { App } from "../src/App";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

function openDrugsTab() {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Я зрозумів(-ла)" }));
  fireEvent.click(screen.getByRole("button", { name: "Препарати" }));
}

function search(q: string) {
  fireEvent.change(
    screen.getByRole("searchbox", { name: "Пошук за назвою або частиною тіла…" }),
    { target: { value: q } },
  );
}

describe("Drugs screen search (Owner-directed, 2026-08-15)", () => {
  it("filters by drug name — a TCCC drug name hides non-matching sections", () => {
    openDrugsTab();
    search("Cefadroxil");
    expect(screen.getByRole("heading", { name: /^Cefadroxil —/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^Cephalexin —/ })).toBeNull();
    expect(screen.getAllByText("Нічого не знайдено за цим запитом.").length).toBeGreaterThan(0);
  });

  it("filters MOZ prophylaxis cards by body-part (injury_type), not just drug name", () => {
    openDrugsTab();
    search("Очі");
    const eyeHeadings = screen.getAllByRole("heading", { name: /^Очі —/ });
    expect(eyeHeadings).toHaveLength(2);
    // A non-eye injury type must not survive the filter.
    expect(screen.queryByRole("heading", { name: /^Кінцівки/ })).toBeNull();
  });

  it("shows the no-matches empty state for a query with zero hits, distinct from the not-yet-verified state", () => {
    openDrugsTab();
    search("zzznonexistentquery");
    expect(screen.getAllByText("Нічого не знайдено за цим запитом.").length).toBe(3);
    expect(screen.queryByText(/ще не підтверджено Власником/)).toBeNull();
  });

  it("clearing the query restores the full list", () => {
    openDrugsTab();
    search("Cefadroxil");
    expect(screen.queryByRole("heading", { name: /^Cephalexin —/ })).toBeNull();
    search("");
    expect(screen.getByRole("heading", { name: /^Cephalexin —/ })).toBeInTheDocument();
  });
});
