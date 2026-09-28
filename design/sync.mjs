// Copies the shared design files into every app, or with --check fails if a copy has drifted.
//
//   node design/sync.mjs          write the copies
//   node design/sync.mjs --check  exit 1 when any copy differs from the source (used in CI)
//
// The copies are byte-identical on purpose: each app builds on its own, so it needs its own
// files, and the check keeps them from quietly diverging.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apps = ["marketing", "rider", "admin", "docs-site"];
const files = [
  { from: "design/tokens.css", to: (app) => `${app}/app/tokens.css` },
  { from: "design/tsela-icon.tsx", to: (app) => `${app}/components/tsela-icon.tsx` },
  { from: "design/tsela-art.tsx", to: (app) => `${app}/components/tsela-art.tsx` },
];

const check = process.argv.includes("--check");
const drifted = [];

for (const file of files) {
  const source = readFileSync(join(root, file.from));
  for (const app of apps) {
    const target = join(root, file.to(app));
    const current = existsSync(target) ? readFileSync(target) : null;
    if (current && current.equals(source)) continue;
    if (check) {
      drifted.push(file.to(app));
    } else {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, source);
      console.log(`wrote ${file.to(app)}`);
    }
  }
}

if (check) {
  if (drifted.length) {
    console.error("These copies differ from design/. Run `node design/sync.mjs` and commit the result:");
    for (const path of drifted) console.error(`  - ${path}`);
    process.exit(1);
  }
  console.log("design files are in sync");
}
