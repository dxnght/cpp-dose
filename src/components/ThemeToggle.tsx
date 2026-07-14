// Light/dark theme toggle. Defaults to the system preference; once the user picks,
// the choice is remembered (local only — no network). Applies via data-theme on
// <html>, which the CSS variables switch on.
import { useEffect, useState } from "react";

const KEY = "cpp-dose.theme";

function systemDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<string | null>(() => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark" || theme === "light") root.dataset.theme = theme;
    else delete root.dataset.theme;
  }, [theme]);

  const dark = theme ? theme === "dark" : systemDark();

  return (
    <button
      className="theme-toggle"
      aria-label={dark ? "Світла тема" : "Темна тема"}
      onClick={() => {
        const next = dark ? "light" : "dark";
        try {
          localStorage.setItem(KEY, next);
        } catch {
          /* storage unavailable */
        }
        setTheme(next);
      }}
    >
      {dark ? "☀" : "☾"}
    </button>
  );
}
