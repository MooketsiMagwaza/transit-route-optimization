// Captures real screenshots of the running local stack for the marketing site and the README.
//
//   docker compose up -d
//   node scripts/capture-shots.mjs
//
// Needs Chrome, Edge, or Chromium (set CHROME_PATH if it is somewhere unusual). Screenshots are
// written to marketing/public/shots as WebP when `sharp` is installed in marketing/node_modules
// (it comes with Next.js), otherwise as PNG. Nothing here is a mock-up: each image is the app as
// it runs, so re-running this after a redesign keeps the site honest.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "marketing", "public", "shots");
const API = process.env.API_URL ?? "http://localhost:8000";
const RIDER = process.env.RIDER_URL ?? "http://localhost:3002";
const OPS = process.env.OPS_URL ?? "http://localhost:3001";
const DEMO = { email: "demo@tsela.local", password: "TselaDemo2026!" }; // the local Compose demo account

const SHOTS = [
  { name: "rider-routes-desktop", url: `${RIDER}/routes`, width: 1440, height: 900, scale: 1, wait: 9000 },
  { name: "rider-plan-desktop", url: `${RIDER}/plan`, width: 1440, height: 900, scale: 1, wait: 8000 },
  { name: "rider-home-phone", url: `${RIDER}/`, width: 390, height: 844, scale: 2, wait: 6000 },
  { name: "rider-routes-phone", url: `${RIDER}/routes`, width: 390, height: 844, scale: 2, wait: 9000 },
  { name: "ops-dashboard-desktop", url: `${OPS}/`, width: 1440, height: 900, scale: 1, wait: 7000, ops: true },
];

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  const found = candidates.find((path) => existsSync(path));
  if (!found) throw new Error("No Chrome, Edge, or Chromium found. Set CHROME_PATH.");
  return found;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function opsToken() {
  const response = await fetch(`${API}/api/developer/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(DEMO) });
  if (!response.ok) throw new Error(`Demo sign-in failed (${response.status}); is the local stack running?`);
  return (await response.json()).token;
}

async function capture(browserPath, shot, token) {
  const port = 9300 + Math.floor(Math.random() * 500);
  const browser = spawn(browserPath, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "tsela-shot-"))}`, "about:blank"], { stdio: "ignore" });
  try {
    let targets;
    for (let attempt = 0; attempt < 60 && !targets; attempt++) {
      try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await sleep(250); }
    }
    if (!targets) throw new Error("The browser did not start");
    const socket = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve) => (socket.onopen = resolve));
    let counter = 0;
    const pending = new Map();
    socket.onmessage = (message) => { const data = JSON.parse(message.data); if (data.id && pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); } };
    const send = (method, params = {}) => new Promise((resolve) => { const id = ++counter; pending.set(id, resolve); socket.send(JSON.stringify({ id, method, params })); });

    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: shot.width, height: shot.height, deviceScaleFactor: shot.scale, mobile: shot.width < 700 });
    const seed = `try{localStorage.setItem('tsela-privacy-choice-v1','necessary');${shot.ops ? `localStorage.setItem('tsela_admin_token',${JSON.stringify(token)});` : ""}}catch(e){}`;
    await send("Page.addScriptToEvaluateOnNewDocument", { source: seed });
    await send("Page.navigate", { url: shot.url });
    await sleep(shot.wait);
    const result = await send("Page.captureScreenshot", { format: "png" });
    socket.close();
    return Buffer.from(result.result.data, "base64");
  } finally {
    browser.kill();
  }
}

mkdirSync(outDir, { recursive: true });
const browserPath = findBrowser();
let sharp = null;
try { sharp = createRequire(join(root, "marketing", "package.json"))("sharp"); } catch { /* PNG output is fine */ }

await fetch(`${API}/api/routes/network`).catch(() => undefined); // warm the map data
const needsToken = SHOTS.some((shot) => shot.ops && (!process.argv[2] || process.argv.slice(2).includes(shot.name)));
const token = needsToken ? await opsToken().catch((error) => { console.warn(`skipping operations shots: ${error.message}`); return null; }) : null;

const wanted = process.argv.slice(2);
for (const shot of SHOTS) {
  if (wanted.length && !wanted.includes(shot.name)) continue;
  if (shot.ops && !token) continue;
  const png = await capture(browserPath, shot, token);
  if (sharp) {
    const file = join(outDir, `${shot.name}.webp`);
    writeFileSync(file, await sharp(png).webp({ quality: 88 }).toBuffer());
    console.log(`wrote ${file}`);
  } else {
    const file = join(outDir, `${shot.name}.png`);
    writeFileSync(file, png);
    console.log(`wrote ${file}`);
  }
}
