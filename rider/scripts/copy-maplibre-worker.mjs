// Copies MapLibre's web worker into public/maplibre so the browser can actually load it.
//
// MapLibre 6 finds its worker with `new URL("./maplibre-gl-worker.mjs", import.meta.url)`. After
// Next bundles the library, `import.meta.url` points at a hashed chunk, so that URL 404s and the
// server answers with an HTML page. The worker then never starts, and everything drawn from GeoJSON
// (every route line) silently never appears while the raster basemap, which needs no worker,
// looks fine. Serving the files ourselves and calling setWorkerUrl() removes the guesswork.
//
// Runs before `dev` and `build`, so the copy always matches the installed version.

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "maplibre-gl", "dist");
const target = join(root, "public", "maplibre");
const files = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

if (!existsSync(source)) {
  console.error("maplibre-gl is not installed; run npm ci first.");
  process.exit(1);
}
mkdirSync(target, { recursive: true });
for (const file of files) copyFileSync(join(source, file), join(target, file));
console.log(`copied ${files.join(" and ")} to public/maplibre`);
