// Draws Tsela's app icons (an ink route with a blue destination on a green tile) and writes them as PNG files.
//
//   node design/make-icons.mjs
//
// No dependencies and no browser: the shapes are rasterised here with 3x3 supersampling and
// encoded with Node's built-in zlib. Output matches design/logo.svg. Full-bleed squares are
// deliberate: phones round them, and the maskable version keeps the mark inside the safe zone.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TILE = [63, 208, 139];
const MARK = [29, 27, 22];
const BLUE = [26, 102, 230];

// The mark, in the 64-unit space of design/logo.svg.
const DOTS = [[20, 45, 6], [44, 19, 6]];
const CURVE = [[20, 39], [20, 27], [44, 37], [44, 25]];
const STROKE = 4.5;
const curvePoints = Array.from({ length: 121 }, (_, i) => {
  const t = i / 120, u = 1 - t;
  return [0, 1].map((k) => u ** 3 * CURVE[0][k] + 3 * u * u * t * CURVE[1][k] + 3 * u * t * t * CURVE[2][k] + t ** 3 * CURVE[3][k]);
});

function distanceToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Which colour is at a point in the mark: 0 none, 1 ink, 2 blue (the destination).
function paint(x, y) {
  const [ex, ey, er] = DOTS[1];
  const toEnd = Math.hypot(x - ex, y - ey);
  if (toEnd <= er) return toEnd > er - 2.5 ? 1 : 2;
  const [sx, sy, sr] = DOTS[0];
  if (Math.hypot(x - sx, y - sy) <= sr) return 1;
  if (x < 12 || x > 52 || y < 12 || y > 52) return 0;
  for (let i = 0; i < curvePoints.length - 1; i++) {
    if (distanceToSegment(x, y, curvePoints[i], curvePoints[i + 1]) <= STROKE / 2) return 1;
  }
  return 0;
}

function render(size, viewMin, viewSize) {
  const pixels = Buffer.alloc(size * size * 3);
  const SAMPLES = 3;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = viewMin + ((px + (sx + 0.5) / SAMPLES) / size) * viewSize;
          const y = viewMin + ((py + (sy + 0.5) / SAMPLES) / size) * viewSize;
          const which = paint(x, y);
          const color = which === 1 ? MARK : which === 2 ? BLUE : TILE;
          for (let c = 0; c < 3; c++) sum[c] += color[c];
        }
      }
      const at = (py * size + px) * 3;
      for (let c = 0; c < 3; c++) pixels[at + c] = Math.round(sum[c] / (SAMPLES * SAMPLES));
    }
  }
  return pixels;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
function png(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = 2; // 8-bit RGB
  const rows = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) pixels.copy(rows, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const targets = [
  { size: 192, file: "icon-192.png", view: [0, 64] },
  { size: 512, file: "icon-512.png", view: [0, 64] },
  { size: 512, file: "icon-maskable-512.png", view: [-13, 90] },
  { size: 180, file: "apple-touch-icon.png", view: [0, 64] },
];
for (const app of ["rider", "admin"]) {
  const dir = join(root, app, "public", "icons");
  mkdirSync(dir, { recursive: true });
  for (const { size, file, view } of targets) {
    writeFileSync(join(dir, file), png(size, render(size, view[0], view[1])));
    console.log(`wrote ${app}/public/icons/${file}`);
  }
}
