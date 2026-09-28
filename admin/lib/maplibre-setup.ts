/** Points MapLibre at the worker served from /maplibre; import this before creating any map. */

import { setWorkerUrl } from "maplibre-gl";

// The file is copied into public/maplibre by scripts/copy-maplibre-worker.mjs. Without this call
// MapLibre guesses a URL that 404s after bundling and GeoJSON layers never draw.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
