/**
 * QA matrix: one key screen per app, in light and dark, at desktop and phone width, from the
 * running local Compose stack. Map-bearing pages wait for the MapLibre canvas and route lines to
 * actually paint before the screenshot is taken. Written to docs/assets/previews/.
 *
 *   docker compose up -d marketing admin rider docs api db
 *   node scripts/capture-theme-matrix.cjs
 */

const fs = require("node:fs");
const path = require("node:path");

const runtime = process.env.PLAYWRIGHT_RUNTIME
  ?? "C:/Users/Nido/.codex/playwright-runtime/node_modules/playwright";
const { chromium } = require(runtime);

const root = path.resolve(__dirname, "..");
const output = path.join(root, "docs", "assets", "previews");
const credentials = { email: "demo@tsela.local", password: "TselaDemo2026!" };

const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

const SCREENS = [
  { app: "marketing", origin: "http://localhost:3000", route: "/", waitForMap: false },
  { app: "rider", origin: "http://localhost:3002", route: "/routes", waitForMap: true },
  { app: "admin", origin: "http://localhost:3001", route: "/dashboard", waitForMap: false },
  { app: "docs", origin: "http://localhost:3003", route: "/reference", waitForMap: false },
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

async function capture(browser, token, screen, viewportName, theme) {
  const context = await browser.newContext({
    viewport: VIEWPORTS[viewportName],
    deviceScaleFactor: viewportName === "mobile" ? 2 : 1,
    isMobile: viewportName === "mobile",
    hasTouch: viewportName === "mobile",
    colorScheme: theme,
    locale: "en-BW",
    timezoneId: "Africa/Gaborone",
    reducedMotion: "reduce",
  });
  await context.addCookies([{
    name: "tsela.developer-session", value: token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax",
  }]);
  await context.addInitScript(({ sessionToken, theme: initTheme, origin }) => {
    try {
      if (origin === "http://localhost:3000") localStorage.setItem("tsela-privacy-choice-v1", "necessary");
      if (origin === "http://localhost:3001") localStorage.setItem("tsela_admin_token", sessionToken);
      if (origin === "http://localhost:3002") localStorage.setItem("transitos.account-session", sessionToken);
      if (["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"].includes(origin)) {
        if (initTheme === "dark") localStorage.setItem("tsela-theme", "dark");
      }
      if (origin === "http://localhost:3003" && initTheme === "dark") localStorage.setItem("theme", "dark");
    } catch { /* private mode */ }
  }, { sessionToken: token, theme, origin: screen.origin });

  const page = await context.newPage();
  const url = `${screen.origin}${screen.route}`;
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  if (!response || response.status() >= 400) throw new Error(`${url} returned ${response?.status() ?? "no response"}`);

  if (screen.waitForMap) {
    await page.waitForSelector("canvas.maplibregl-canvas", { timeout: 8_000 }).catch(() => {});
    await page.waitForTimeout(3_500);
  } else {
    await page.waitForTimeout(1_300);
  }

  const filename = `matrix-${screen.app}-${viewportName}-${theme}.png`;
  await page.screenshot({ path: path.join(output, filename), type: "png", fullPage: false });
  console.log(`captured ${filename}`);
  await context.close();
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const token = await login();
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge", headless: true });
  for (const screen of SCREENS) {
    for (const viewportName of ["desktop", "mobile"]) {
      for (const theme of ["light", "dark"]) {
        await capture(browser, token, screen, viewportName, theme);
      }
    }
  }
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
