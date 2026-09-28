/**
 * Tsela's icons.
 *
 * `ClayIcon` is the brand icon: a soft, puffy 3D glyph built from rounded shapes with a gradient
 * body, a highlight and shade masked to the shape, and a small ground shadow. It uses only
 * gradients (no SVG filters), so it stays cheap to paint on low-end phones. `TselaIcon` is the
 * plain line glyph for small controls, and `TselaMark` is the app mark (a lime tile, a plum route).
 *
 * This is the single source. `node design/sync.mjs` copies it to each app, and
 * `node design/sync.mjs --check` fails when a copy has drifted.
 */

import { useId } from "react";
import type { ReactNode } from "react";

export type ClayIconName =
  | "home" | "plan" | "routes" | "community" | "guide" | "code" | "grid" | "accounts" | "alerts"
  | "moderation" | "handbook" | "observability" | "search" | "pin" | "bookmark" | "check" | "history" | "star";

export type ClayTone = "purple" | "lime" | "pink" | "teal" | "amber" | "ink";

const TONES: Record<ClayTone, [string, string, string]> = {
  purple: ["#dcc4fa", "#a668ea", "#5a25a3"],
  lime: ["#f8ffbd", "#dff43f", "#b1cc17"],
  pink: ["#ffd0e4", "#ff6fa8", "#cf2f74"],
  teal: ["#a8f5e6", "#2fc4a8", "#0f7f6c"],
  amber: ["#ffeaa6", "#ffb020", "#cf7d00"],
  ink: ["#7b7385", "#4a4254", "#241e2c"],
};

const WHITE = { fill: "#fff", stroke: "none" } as const;
const ETCH = { fill: "none", stroke: "#fff", strokeOpacity: 0.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

type Glyph = { sw: number; shape: ReactNode; deco?: ReactNode };

const GLYPHS: Record<ClayIconName, Glyph> = {
  home: {
    sw: 6,
    shape: <path d="M17 31 32 18l15 13v16H17z" />,
    deco: <rect x="28.5" y="37" width="7" height="10" rx="3" {...WHITE} opacity=".92" />,
  },
  plan: {
    sw: 7,
    shape: <><circle cx="19" cy="45" r="5" /><circle cx="45" cy="19" r="5" /><path d="M19 40C19 28 45 36 45 24" fill="none" /></>,
    deco: <><circle cx="19" cy="45" r="2.2" {...WHITE} /><circle cx="45" cy="19" r="2.2" {...WHITE} /></>,
  },
  routes: {
    sw: 5,
    shape: <path d="M15 22 25 18l14 4 10-4v24l-10 4-14-4-10 4z" />,
    deco: <path d="M25 18v24M39 22v24" strokeWidth="2.5" {...ETCH} />,
  },
  community: {
    sw: 5,
    shape: <><circle cx="25" cy="25" r="5.5" /><path d="M14 47c0-8 22-8 22 0z" /><circle cx="42" cy="28" r="4" /><path d="M38 47c0-5 12-5 12 1z" /></>,
  },
  guide: {
    sw: 5,
    shape: <path d="M16 21c6-2 12-1 16 3 4-4 10-5 16-3v22c-6-2-12-1-16 3-4-4-10-5-16-3z" />,
    deco: <path d="M32 24v22" strokeWidth="2.5" {...ETCH} />,
  },
  code: { sw: 8, shape: <path d="M26 22 16 32l10 10M38 22l10 10-10 10" fill="none" /> },
  grid: {
    sw: 4,
    shape: <><rect x="17" y="17" width="11" height="11" rx="4" /><rect x="36" y="17" width="11" height="11" rx="4" /><rect x="17" y="36" width="11" height="11" rx="4" /><rect x="36" y="36" width="11" height="11" rx="4" /></>,
  },
  accounts: { sw: 5, shape: <><circle cx="32" cy="24" r="7" /><path d="M17 50c0-11 30-11 30 0z" /></> },
  alerts: {
    sw: 5,
    shape: <><path d="M32 15c-8 0-12 6-12 13v7l-4 7h32l-4-7v-7c0-7-4-13-12-13z" /><circle cx="32" cy="49" r="3" /></>,
  },
  moderation: {
    sw: 5,
    shape: <path d="m32 15 14 5v9c0 9-6 15-14 18-8-3-14-9-14-18v-9z" />,
    deco: <path d="m25 32 5 5 9-10" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  },
  handbook: {
    sw: 5,
    shape: <path d="M20 15h16l9 9v25H20z" />,
    deco: <path d="M26 32h13M26 39h13" strokeWidth="3" {...ETCH} />,
  },
  observability: { sw: 7, shape: <path d="M12 34h9l5-13 8 24 5-11h9" fill="none" /> },
  search: { sw: 7, shape: <><circle cx="28" cy="28" r="12" fill="none" /><path d="m38 38 12 12" fill="none" /></> },
  pin: {
    sw: 5,
    shape: <path d="M32 51S18 39 18 28a14 14 0 0 1 28 0c0 11-14 23-14 23z" />,
    deco: <circle cx="32" cy="28" r="5" {...WHITE} opacity=".92" />,
  },
  bookmark: { sw: 5, shape: <path d="M20 16h24v32l-12-8-12 8z" /> },
  check: {
    sw: 5,
    shape: <circle cx="32" cy="32" r="16" />,
    deco: <path d="m24 33 6 6 11-13" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  },
  history: {
    sw: 5,
    shape: <circle cx="32" cy="32" r="16" />,
    deco: <path d="M32 23v10l7 4" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  },
  star: { sw: 4, shape: <path d="m32 15 5.2 10.6 11.6 1.7-8.4 8.2 2 11.6L32 41.7l-10.4 5.4 2-11.6-8.4-8.2 11.6-1.7z" /> },
};

/** The soft 3D brand icon. Decorative unless a `title` is given. */
export function ClayIcon({ name, size = 40, tone = "purple", title }: { name: ClayIconName; size?: number; tone?: ClayTone; title?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [light, mid, dark] = TONES[tone];
  const glyph = GLYPHS[name];
  const body = `url(#body${uid})`;
  return (
    <svg className="clay-icon" viewBox="5 4 54 54" width={size} height={size} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} focusable="false">
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={`body${uid}`} gradientUnits="userSpaceOnUse" x1="14" y1="8" x2="50" y2="58">
          <stop offset="0" stopColor={light} /><stop offset=".55" stopColor={mid} /><stop offset="1" stopColor={dark} />
        </linearGradient>
        <radialGradient id={`light${uid}`} gradientUnits="userSpaceOnUse" cx="24" cy="21" r="22">
          <stop offset="0" stopColor="#fff" stopOpacity=".85" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`shade${uid}`} gradientUnits="userSpaceOnUse" cx="46" cy="52" r="30">
          <stop offset=".5" stopColor={dark} stopOpacity="0" /><stop offset="1" stopColor={dark} stopOpacity=".55" />
        </radialGradient>
        <g id={`shape${uid}`} strokeLinejoin="round" strokeLinecap="round">{glyph.shape}</g>
        <mask id={`mask${uid}`} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <use href={`#shape${uid}`} fill="#fff" stroke="#fff" strokeWidth={glyph.sw} />
        </mask>
      </defs>
      <ellipse cx="32" cy="55.2" rx="14" ry="2.1" fill={dark} opacity=".2" />
      <use href={`#shape${uid}`} fill={body} stroke={body} strokeWidth={glyph.sw} />
      <g mask={`url(#mask${uid})`}>
        <rect width="64" height="64" fill={`url(#shade${uid})`} />
        <rect width="64" height="64" fill={`url(#light${uid})`} />
      </g>
      {glyph.deco}
    </svg>
  );
}

const LINES = {
  chevron: <path d="m9 5 7 7-7 7" />,
  back: <path d="m15 5-7 7 7 7" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  external: <><path d="M14 5h5v5" /><path d="m19 5-8 8" /><path d="M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4" /></>,
} satisfies Record<string, ReactNode>;

/** A plain line glyph for small controls; it inherits `color`. */
export function TselaIcon({ name, size = 20 }: { name: keyof typeof LINES; size?: number }) {
  return (
    <svg className="tsela-icon" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {LINES[name]}
    </svg>
  );
}

/** The Tsela app mark: a lime tile with a plum route. */
export function TselaMark({ size = 32 }: { size?: number }) {
  return (
    <svg className="tsela-mark" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="16" fill="#e2f550" />
      <circle cx="20" cy="45" r="6" fill="#4a2270" />
      <circle cx="44" cy="19" r="6" fill="#4a2270" />
      <path d="M20 39C20 27 44 37 44 25" stroke="#4a2270" strokeWidth="4.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
