"use client";

/**
 * Light/dark toggle on the shared tokens (`[data-theme]` in design/tokens.css). `THEME_INIT_SCRIPT`
 * runs inline, before hydration, so the right theme paints first: stored choice, else system
 * preference. `ThemeToggle` flips `data-theme` on `<html>` and writes the choice back to storage.
 *
 * This is the single source. `node design/sync.mjs` copies it to marketing, rider, and admin
 * (the developer portal uses Fumadocs' own theme switch instead), and `--check` fails when a copy
 * has drifted.
 */

import { useEffect, useState } from "react";

const STORAGE_KEY = "tsela-theme";

export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}');var d=s?s==='dark':matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();`;

function currentTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  // Starts "light" to match server-rendered markup, then reads the real value once mounted
  // (the inline script may have already set it before React ever ran).
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => setTheme(currentTheme()), []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* private mode */ }
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-pressed={theme === "dark"}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {theme === "dark"
          ? <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
          : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>}
      </svg>
      <span className="sr-only">{theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}</span>
    </button>
  );
}
