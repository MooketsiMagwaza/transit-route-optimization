/**
 * Tsela's icons: plain outlined glyphs on a 24px grid, the way Material draws them, in the colour
 * of the text around them. `TselaMark` is the app mark: a dark green tile with a white route and a
 * bright green destination.
 *
 * This is the single source. `node design/sync.mjs` copies it to each app, and
 * `node design/sync.mjs --check` fails when a copy has drifted.
 */

import type { ReactNode } from "react";

export type TselaIconName =
  | "home" | "plan" | "routes" | "community" | "guide" | "code" | "grid" | "accounts" | "alerts"
  | "moderation" | "handbook" | "observability" | "search" | "pin" | "bookmark" | "check" | "history"
  | "star" | "chevron" | "back" | "external";

const GLYPHS: Record<TselaIconName, ReactNode> = {
  home: <><path d="M4 11.2 12 4l8 7.2" /><path d="M6 10v9.2h12V10" /><path d="M10 19.2v-5h4v5" /></>,
  plan: <><circle cx="6.5" cy="17.5" r="2.3" /><circle cx="17.5" cy="6.5" r="2.3" /><path d="M6.5 15.2C6.5 9.5 17.5 14.5 17.5 8.8" /></>,
  routes: <><path d="M9 5 4 7v12l5-2 6 2 5-2V5l-5 2z" /><path d="M9 5v12M15 7v12" /></>,
  community: <><circle cx="9" cy="9" r="3" /><circle cx="17" cy="8.5" r="2.2" /><path d="M3.8 19c.5-3.4 2.4-5 5.2-5s4.7 1.6 5.2 5" /><path d="M14.6 13.7c2.7-.3 4.5 1 5.1 4.3" /></>,
  guide: <><path d="M6 4.5h9a3 3 0 0 1 3 3V20H9a3 3 0 0 1-3-3z" /><path d="M9 20a3 3 0 0 1 3-3h6" /><path d="M9.5 8.5H14M9.5 12H14.5" /></>,
  code: <><path d="m9 8-4 4 4 4" /><path d="m15 8 4 4-4 4" /></>,
  grid: <><rect x="4.5" y="4.5" width="6" height="6" rx="1.6" /><rect x="13.5" y="4.5" width="6" height="6" rx="1.6" /><rect x="4.5" y="13.5" width="6" height="6" rx="1.6" /><rect x="13.5" y="13.5" width="6" height="6" rx="1.6" /></>,
  accounts: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.6-4 3.4-6 7-6s6.4 2 7 6" /></>,
  alerts: <><path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2H5z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  moderation: <><path d="m12 4-7 2.5v5c0 4.2 2.8 7.2 7 8.5 4.2-1.3 7-4.3 7-8.5v-5z" /><path d="m9 12 2.2 2.2L15.5 10" /></>,
  handbook: <><path d="M7 3.5h7l4 4V20H7z" /><path d="M14 3.5V8h4" /><path d="M10 12h5M10 15.5h5" /></>,
  observability: <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />,
  search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.2-4.2" /></>,
  pin: <><path d="M12 21s6-5.6 6-11a6 6 0 0 0-12 0c0 5.4 6 11 6 11z" /><circle cx="12" cy="10" r="2.2" /></>,
  bookmark: <path d="M7 4.5h10v15l-5-3.5-5 3.5z" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  history: <><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></>,
  star: <path d="m12 4 2.3 4.7 5.2.8-3.8 3.6.9 5.1L12 15.8 7.4 18.2l.9-5.1L4.5 9.5l5.2-.8z" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  back: <path d="m15 5-7 7 7 7" />,
  external: <><path d="M14 5h5v5" /><path d="m19 5-8 8" /><path d="M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4" /></>,
};

/** An outlined glyph that inherits `color`. Decorative unless a `title` is given. */
export function TselaIcon({ name, size = 24, title }: { name: TselaIconName; size?: number; title?: string }) {
  return (
    <svg className="tsela-icon" viewBox="0 0 24 24" width={size} height={size} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} focusable="false">
      {title ? <title>{title}</title> : null}
      <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{GLYPHS[name]}</g>
    </svg>
  );
}

/** The Tsela app mark: a dark green tile, a white route, and a bright green destination. */
export function TselaMark({ size = 32 }: { size?: number }) {
  return (
    <svg className="tsela-mark" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="14" fill="#146c2e" />
      <circle cx="20" cy="45" r="6" fill="#fff" />
      <circle cx="44" cy="19" r="6" fill="#3ddc84" stroke="#fff" strokeWidth="2.5" />
      <path d="M20 39C20 27 44 37 44 25" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
