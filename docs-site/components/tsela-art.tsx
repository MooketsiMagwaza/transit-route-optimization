/**
 * Tsela's illustrations: hand-drawn looking scenes in black ink with green and orange spot colour
 * printed slightly off-register, for onboarding, empty states, and marketing.
 *
 * Nothing here is an image file. Each scene is drawn from simple shapes by a seeded "pen" that
 * wobbles every stroke a little, so the drawings look sketched yet render identically on the
 * server and in the browser. Colours come from `design/tokens.css`.
 *
 * This is the single source. `node design/sync.mjs` copies it to each app, and
 * `node design/sync.mjs --check` fails when a copy has drifted.
 */

import type { ReactNode } from "react";

export type ArtName = "combi" | "stop" | "map" | "community" | "guide" | "success";

type Pt = [number, number];
const f = (n: number) => Math.round(n * 10) / 10;

function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

class Pen {
  private next: () => number;
  constructor(seed: number, private wobble = 1.1) { this.next = makeRandom(seed); }
  private jitter(amount = 1) { return (this.next() - 0.5) * 2 * this.wobble * amount; }

  /** One stroke between two points, slightly bowed like a hand-drawn line. */
  line(x1: number, y1: number, x2: number, y2: number): string {
    const dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx, dy) || 1;
    const bow = this.jitter(Math.min(2.4, length / 28 + 0.4));
    const cx = (x1 + x2) / 2 + (-dy / length) * bow, cy = (y1 + y2) / 2 + (dx / length) * bow;
    return `M${f(x1 + this.jitter(0.6))} ${f(y1 + this.jitter(0.6))}Q${f(cx)} ${f(cy)} ${f(x2 + this.jitter(0.6))} ${f(y2 + this.jitter(0.6))}`;
  }

  /** Edges through the points, each drawn as its own stroke so corners overshoot a little. */
  edges(points: Pt[], closed = false): string {
    const last = closed ? points.length : points.length - 1;
    let d = "";
    for (let i = 0; i < last; i++) {
      const [x1, y1] = points[i], [x2, y2] = points[(i + 1) % points.length];
      d += this.line(x1, y1, x2, y2);
    }
    return d;
  }

  rect(x: number, y: number, w: number, h: number): string {
    return this.edges([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true);
  }

  /** A filled polygon with jittered corners, for the spot colour. */
  poly(points: Pt[]): string {
    return "M" + points.map(([x, y]) => `${f(x + this.jitter(0.8))} ${f(y + this.jitter(0.8))}`).join("L") + "Z";
  }

  private smooth(points: Pt[], closed: boolean): string {
    const n = points.length;
    const at = (i: number) => (closed ? points[((i % n) + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
    let d = `M${f(points[0][0])} ${f(points[0][1])}`;
    const segments = closed ? n : n - 1;
    for (let i = 0; i < segments; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return closed ? d + "Z" : d;
  }

  curve(points: Pt[]): string {
    return this.smooth(points.map(([x, y]) => [x + this.jitter(0.7), y + this.jitter(0.7)] as Pt), false);
  }

  blob(points: Pt[]): string {
    return this.smooth(points.map(([x, y]) => [x + this.jitter(1), y + this.jitter(1)] as Pt), true);
  }

  circle(cx: number, cy: number, r: number): string {
    const points: Pt[] = Array.from({ length: 10 }, (_, i) => {
      const angle = (i / 10) * Math.PI * 2 + this.jitter(0.05);
      const radius = r * (1 + (this.next() - 0.5) * 0.09);
      return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
    });
    return this.smooth(points, true);
  }
}

const SPOT = { fill: "var(--c-spot)" } as const;
const SUN = { fill: "var(--c-accent)" } as const;
const PAPER = { fill: "var(--c-surface)" } as const;

/** Spot colour sits a few pixels off the ink, like a misregistered print. */
function Spot({ d, orange = false }: { d: string; orange?: boolean }) {
  return <path d={d} transform="translate(3.5 3.5)" style={orange ? SUN : SPOT} />;
}
function Ink({ d, paper = false, width }: { d: string; paper?: boolean; width?: number }) {
  return <path d={d} style={paper ? PAPER : { fill: "none" }} strokeWidth={width} />;
}

function rays(pen: Pen, cx: number, cy: number, from: number, to: number, count: number): string {
  let d = "";
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + 0.2;
    d += pen.line(cx + Math.cos(a) * from, cy + Math.sin(a) * from, cx + Math.cos(a) * to, cy + Math.sin(a) * to);
  }
  return d;
}

function Combi(): ReactNode {
  const p = new Pen(11);
  const body: Pt[] = [[30, 132], [30, 70], [38, 62], [160, 62], [206, 92], [228, 96], [232, 104], [232, 132]];
  return <>
    <Spot d={p.poly([[30, 106], [232, 106], [232, 132], [30, 132]])} />
    <Spot d={p.circle(74, 134, 15)} />
    <Spot d={p.circle(190, 134, 15)} />
    <Spot d={p.poly([[96, 44], [130, 44], [130, 60], [96, 60]])} orange />
    <Spot d={p.circle(226, 32, 13)} orange />
    <Ink d={p.line(6, 142, 254, 142) + p.line(24, 152, 66, 152) + p.line(196, 154, 238, 154)} />
    <Ink d={p.edges(body, true)} />
    <Ink d={p.rect(44, 74, 34, 26) + p.rect(86, 74, 34, 26) + p.rect(128, 74, 34, 26)} paper />
    <Ink d={p.edges([[170, 74], [170, 100], [202, 100], [186, 80]], true)} paper />
    <Ink d={p.circle(61, 87, 6) + p.circle(103, 88, 6) + p.circle(145, 87, 6) + p.circle(184, 91, 5)} />
    <Ink d={p.curve([[52, 100], [61, 94], [70, 100]]) + p.curve([[94, 100], [103, 95], [112, 100]]) + p.curve([[136, 100], [145, 94], [154, 100]])} />
    <Ink d={p.rect(84, 108, 42, 24) + p.line(118, 119, 124, 119)} />
    <Ink d={p.circle(74, 134, 15) + p.circle(190, 134, 15)} />
    <Ink d={p.circle(74, 134, 6) + p.circle(190, 134, 6)} paper />
    <Ink d={p.rect(96, 44, 34, 16) + p.curve([[102, 54], [108, 49], [116, 54], [124, 49]]) + p.line(113, 60, 113, 62)} />
    <Ink d={p.circle(228, 110, 4)} paper />
    <Ink d={p.line(6, 96, 22, 96) + p.line(2, 108, 20, 108) + p.line(8, 120, 24, 120)} />
    <Ink d={p.circle(226, 32, 13) + rays(p, 226, 32, 18, 25, 8)} />
    <Ink d={p.curve([[40, 34], [50, 24], [64, 28], [74, 20], [92, 28], [86, 38], [46, 40], [40, 34]])} />
  </>;
}

function Stop(): ReactNode {
  const p = new Pen(23);
  return <>
    <Spot d={p.poly([[172, 22], [220, 22], [220, 56], [172, 56]])} orange />
    <Spot d={p.poly([[80, 76], [112, 76], [112, 118], [80, 118]])} />
    <Spot d={p.blob([[152, 60], [142, 46], [140, 36], [146, 28], [158, 28], [164, 36], [162, 46]])} orange />
    <Ink d={p.line(6, 142, 254, 142) + p.line(30, 152, 70, 152)} />
    <Ink d={p.line(196, 56, 196, 142) + p.rect(172, 22, 48, 34)} />
    <Ink d={p.curve([[184, 46], [192, 36], [200, 42], [208, 33]])} />
    <Ink d={p.circle(184, 46, 3) + p.circle(208, 33, 3)} paper />
    <Ink d={p.circle(96, 58, 13)} paper />
    <Ink d={p.curve([[84, 54], [90, 44], [104, 44], [110, 53]])} />
    <Ink d={p.rect(80, 74, 32, 44) + p.rect(70, 80, 12, 30)} />
    <Ink d={p.line(88, 118, 86, 142) + p.line(104, 118, 106, 142) + p.line(80, 142, 91, 142) + p.line(102, 142, 114, 142)} />
    <Ink d={p.line(110, 86, 130, 72)} />
    <Ink d={p.rect(128, 58, 14, 24) + p.line(131, 64, 139, 64)} paper />
    <Ink d={p.blob([[152, 60], [142, 46], [140, 36], [146, 28], [158, 28], [164, 36], [162, 46]])} />
    <Ink d={p.circle(152, 38, 4)} paper />
    <Ink d={p.line(172, 40, 180, 34) + p.line(176, 48, 186, 46) + p.line(122, 46, 128, 40)} />
  </>;
}

function MapScene(): ReactNode {
  const p = new Pen(37);
  const sheet: Pt[] = [[40, 52], [92, 40], [142, 54], [194, 42], [194, 124], [142, 136], [92, 122], [40, 134]];
  return <>
    <Spot d={p.poly([[92, 40], [142, 54], [142, 136], [92, 122]])} />
    <Spot d={p.blob([[186, 68], [176, 54], [174, 44], [180, 36], [192, 36], [198, 44], [196, 54]])} orange />
    <Ink d={p.edges(sheet, true)} />
    <Ink d={p.line(92, 40, 92, 122) + p.line(142, 54, 142, 136)} />
    <Ink d={p.line(52, 76, 80, 70) + p.line(60, 96, 84, 92) + p.line(150, 112, 184, 102) + p.line(152, 78, 176, 84)} />
    <path d={p.curve([[56, 114], [76, 98], [102, 106], [122, 86], [148, 92], [178, 64]])} style={{ fill: "none" }} strokeDasharray="6 7" strokeWidth={3} />
    <Ink d={p.circle(56, 114, 5)} paper />
    <Ink d={p.blob([[186, 68], [176, 54], [174, 44], [180, 36], [192, 36], [198, 44], [196, 54]])} />
    <Ink d={p.circle(186, 47, 4)} paper />
    <Ink d={p.line(214, 30, 214, 40) + p.line(209, 35, 219, 35) + p.line(24, 60, 24, 68) + p.line(20, 64, 28, 64)} />
  </>;
}

function Community(): ReactNode {
  const p = new Pen(53);
  return <>
    <Spot d={p.poly([[68, 106], [116, 106], [122, 134], [62, 134]])} />
    <Spot d={p.poly([[144, 112], [188, 112], [194, 134], [138, 134]])} orange />
    <Ink d={p.line(20, 142, 244, 142)} />
    <Ink d={p.circle(92, 82, 14) + p.curve([[64, 134], [68, 108], [92, 98], [116, 108], [120, 134]])} paper />
    <Ink d={p.circle(166, 90, 13) + p.curve([[140, 134], [144, 116], [166, 106], [188, 116], [192, 134]])} paper />
    <Ink d={p.curve([[80, 76], [86, 68], [98, 68], [104, 76]]) + p.line(162, 88, 162, 90) + p.line(172, 88, 172, 90) + p.curve([[160, 96], [166, 99], [172, 96]])} />
    <Ink d={p.blob([[44, 30], [62, 20], [92, 22], [104, 32], [98, 44], [78, 46], [70, 56], [68, 44], [48, 42]])} paper />
    <Ink d={p.circle(64, 34, 2) + p.circle(76, 34, 2) + p.circle(88, 34, 2)} />
    <Ink d={p.blob([[150, 30], [176, 22], [206, 28], [218, 38], [210, 50], [186, 52], [176, 62], [176, 52], [154, 46]])} paper />
    <Ink d={p.line(168, 38, 196, 38) + p.line(168, 44, 188, 44)} />
    <Ink d={p.line(232, 60, 232, 70) + p.line(227, 65, 237, 65)} />
  </>;
}

function Guide(): ReactNode {
  const p = new Pen(71);
  return <>
    <Spot d={p.poly([[130, 60], [214, 52], [214, 126], [130, 134]])} />
    <Spot d={p.poly([[190, 28], [204, 36], [200, 44], [186, 36]])} orange />
    <Ink d={p.line(20, 142, 244, 142)} />
    <Ink d={p.edges([[40, 50], [124, 58], [124, 132], [40, 124]], true) + p.edges([[130, 58], [214, 50], [214, 124], [130, 132]], true)} paper />
    <Ink d={p.line(127, 58, 127, 132)} />
    <Ink d={p.curve([[54, 78], [64, 73], [74, 79], [84, 74], [96, 79], [108, 75]]) + p.curve([[54, 92], [66, 88], [76, 93], [90, 89], [104, 93]]) + p.curve([[54, 106], [64, 102], [78, 107], [92, 103]])} />
    <path d={p.curve([[146, 112], [160, 92], [178, 102], [198, 76]])} style={{ fill: "none" }} strokeDasharray="5 6" strokeWidth={2.6} />
    <Ink d={p.circle(146, 112, 4) + p.circle(198, 76, 4)} paper />
    <Ink d={p.edges([[190, 24], [204, 34], [158, 90], [150, 92], [152, 84]], true)} paper />
    <Ink d={p.line(194, 30, 156, 86)} />
    <Ink d={p.line(224, 30, 224, 40) + p.line(219, 35, 229, 35) + p.line(28, 40, 28, 48) + p.line(24, 44, 32, 44)} />
  </>;
}

function Success(): ReactNode {
  const p = new Pen(89);
  return <>
    <Spot d={p.circle(130, 84, 46)} />
    <Spot d={p.circle(206, 42, 8)} orange />
    <Spot d={p.circle(52, 118, 6)} orange />
    <Ink d={p.circle(130, 84, 46)} paper />
    <path d={p.curve([[106, 86], [124, 104], [158, 64]])} style={{ fill: "none" }} strokeWidth={7} />
    <Ink d={rays(p, 130, 84, 58, 70, 10)} />
    <Ink d={p.circle(206, 42, 8) + p.circle(52, 118, 6)} />
    <Ink d={p.line(40, 40, 40, 50) + p.line(35, 45, 45, 45) + p.line(224, 120, 224, 130) + p.line(219, 125, 229, 125)} />
  </>;
}

const SCENES: Record<ArtName, () => ReactNode> = { combi: Combi, stop: Stop, map: MapScene, community: Community, guide: Guide, success: Success };

/** A hand-drawn scene. Decorative unless a `title` is given. */
export function TselaArt({ name, title, className }: { name: ArtName; title?: string; className?: string }) {
  const Scene = SCENES[name];
  return (
    <svg className={className ? `tsela-art ${className}` : "tsela-art"} viewBox="0 0 260 170" role={title ? "img" : undefined} aria-hidden={title ? undefined : true} focusable="false" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      {title ? <title>{title}</title> : null}
      <Scene />
    </svg>
  );
}
