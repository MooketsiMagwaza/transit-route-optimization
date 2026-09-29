/**
 * Capture a deterministic README gallery from the running local Compose stack.
 *
 * Playwright is intentionally loaded from a disposable runtime outside the
 * repository so the product packages do not carry screenshot-only dependencies.
 */

const fs = require("node:fs");
const path = require("node:path");

const runtime = process.env.PLAYWRIGHT_RUNTIME
  ?? "C:/Users/Nido/.codex/playwright-runtime/node_modules/playwright";
const { chromium } = require(runtime);

const root = path.resolve(__dirname, "..");
const output = path.join(root, "docs", "assets", "screenshots");
const credentials = { email: "demo@tsela.local", password: "TselaDemo2026!" };

const groups = [
  {
    name: "marketing",
    origin: "http://localhost:3000",
    pages: [
      ["home", "/"],
      ["services", "/services"],
      ["developers", "/developers"],
      ["company", "/company"],
      ["brand", "/brand"],
      ["journal", "/journal"],
      ["journal-road-aligned-routes", "/journal/2026-09-07-road-aligned-routes"],
      ["journal-rider-home", "/journal/2026-09-08-rider-home"],
      ["privacy", "/legal/privacy"],
      ["terms", "/legal/terms"],
      ["refunds", "/legal/refunds"],
      ["cookies", "/legal/cookies"],
    ],
  },
  {
    name: "rider",
    origin: "http://localhost:3002",
    pages: [
      ["home", "/", true], // wide-screen build fetches the network and renders a mini map card
      ["plan", "/plan", true],
      ["pathfinder", "/pathfind", true],
      ["routes", "/routes", true],
      ["live-route", "/live/1", true],
      ["community", "/community"],
      ["guide", "/guide"],
      ["login", "/account/login"],
      ["recover", "/account/recover"],
      ["reset", "/account/reset"],
    ],
  },
  {
    name: "docs",
    origin: "http://localhost:3003",
    pages: [
      ["access", "/"],
      ["recover", "/recover"],
      ["reset", "/reset"],
      ["overview", "/reference"],
      ["routes-list", "/reference/routes/list"],
      ["route-geometry", "/reference/routes/geometry"],
      ["getting-started", "/reference/guides/getting-started"],
      ["authentication", "/reference/guides/authentication"],
      ["errors-and-retries", "/reference/guides/errors-and-retries"],
      ["rate-limits", "/reference/guides/rate-limits"],
      ["versioning", "/reference/guides/versioning"],
      ["console", "/console"],
    ],
  },
  {
    name: "admin",
    origin: "http://localhost:3001",
    pages: [
      ["login", "/login"],
      ["dashboard", "/dashboard", true],
      ["routes", "/routes"],
      ["route-detail", "/routes/1", true],
      ["accounts", "/accounts"],
      ["observability", "/observability"],
    ],
  },
];

async function login() {
  const response = await fetch("http://localhost:8000/api/developer/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) throw new Error(`Demo login failed (${response.status})`);
  return (await response.json()).token;
}

async function capturePage(page, group, name, route, hasMap) {
  const url = `${group.origin}${route}`;
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  if (!response || response.status() >= 400) {
    throw new Error(`${url} returned ${response?.status() ?? "no response"}`);
  }
  // Map-bearing pages need the MapLibre canvas to exist, then time for tiles and route lines to
  // paint, before the screenshot is honest; everything else just needs layout to settle. Which
  // pages these are is named explicitly per page above — inferring it from the route string
  // missed the rider home page, whose network-map card is keyed off no map-shaped word at all.
  if (hasMap) {
    await page.waitForSelector("canvas.maplibregl-canvas", { timeout: 8_000 }).catch(() => {});
    await page.waitForTimeout(3_500);
  } else {
    await page.waitForTimeout(1_100);
  }
  const title = await page.title();
  const filename = `${group.name}-${name}.jpg`;
  await page.screenshot({ path: path.join(output, filename), type: "jpeg", quality: 86, fullPage: false });
  return { group: group.name, name, route, filename, title, finalUrl: page.url() };
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const token = await login();
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    colorScheme: "light",
    locale: "en-BW",
    timezoneId: "Africa/Gaborone",
    reducedMotion: "reduce",
  });
  await context.addCookies([{
    name: "tsela.developer-session",
    value: token,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  }]);
  await context.addInitScript(({ sessionToken }) => {
    if (location.origin === "http://localhost:3000") {
      localStorage.setItem("tsela-privacy-choice-v1", "necessary");
    }
    if (location.origin === "http://localhost:3001") {
      localStorage.setItem("tsela_admin_token", sessionToken);
    }
    if (location.origin === "http://localhost:3002") {
      localStorage.setItem("transitos.account-session", sessionToken);
    }
  }, { sessionToken: token });

  const page = await context.newPage();
  const manifest = [];
  const selectedGroups = process.env.INCLUDE_DOCS === "true"
    ? groups
    : groups.filter((group) => group.name !== "docs");
  for (const group of selectedGroups) {
    for (const [name, route, hasMap] of group.pages) {
      const item = await capturePage(page, group, name, route, hasMap);
      manifest.push(item);
      console.log(`captured ${item.filename}`);
    }
  }

  if (process.env.INCLUDE_DOCS === "true") {
    await page.goto("http://localhost:3003/reference/routes/list", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      localStorage.setItem("theme", "dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    });
    await page.screenshot({ path: path.join(output, "docs-routes-list-dark.jpg"), type: "jpeg", quality: 86 });
    manifest.push({ group: "docs", name: "routes-list-dark", route: "/reference/routes/list", filename: "docs-routes-list-dark.jpg", title: await page.title(), finalUrl: page.url() });
  }

  fs.writeFileSync(path.join(output, "manifest.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), viewport: "1440x960", pages: manifest }, null, 2)}\n`);
  await browser.close();
  console.log(`captured ${manifest.length} pages`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
