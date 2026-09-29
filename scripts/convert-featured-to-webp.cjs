/**
 * Converts the README's always-visible "featured" screenshots (the ones shown before a reader
 * expands a <details> section, plus whichever ones are picked for the GitHub profile) to WebP,
 * into docs/assets/featured/. The full galleries stay as JPEG in docs/assets/screenshots/ — this
 * folder exists only to keep the images GitHub renders by default, and the ones linked from an
 * external profile README, small.
 *
 *   node scripts/convert-featured-to-webp.cjs
 */

const fs = require("node:fs");
const path = require("node:path");
const sharp = require(path.join(__dirname, "..", "marketing", "node_modules", "sharp"));

const root = path.resolve(__dirname, "..");
const source = path.join(root, "docs", "assets", "screenshots");
const output = path.join(root, "docs", "assets", "featured");

// The README's always-visible pair per section, plus every image currently selected for the
// GitHub profile README. Add a name here to include it next time this runs.
const NAMES = [
  "marketing-home",
  "rider-home",
  "rider-plan",
  "rider-routes",
  "rider-pathfinder",
  "rider-community",
  "rider-guide",
  "rider-login",
  "admin-dashboard",
  "admin-observability",
  "marketing-services",
  "marketing-developers",
  "docs-overview",
  "docs-console",
];

async function main() {
  fs.mkdirSync(output, { recursive: true });
  for (const name of NAMES) {
    const from = path.join(source, `${name}.jpg`);
    const to = path.join(output, `${name}.webp`);
    const before = fs.statSync(from).size;
    await sharp(from).webp({ quality: 82 }).toFile(to);
    const after = fs.statSync(to).size;
    console.log(`${name}: ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
