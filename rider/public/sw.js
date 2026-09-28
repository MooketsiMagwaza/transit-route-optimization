/* Tsela rider service worker.
 *
 * Scope is deliberately narrow. It caches only:
 *   1. the app's own hashed static files (immutable, cache-first),
 *   2. the offline fallback page, and
 *   3. PUBLIC, read-only route data (route list, network, stops, geometry).
 * It never caches anything that carries an Authorization header, any non-GET request, account
 * or community endpoints, map tiles, or third-party responses. Cached route data is served only
 * when the network fails, and is marked so the app can tell the rider it may be out of date.
 */

const VERSION = "tsela-rider-v1";
const STATIC_CACHE = `${VERSION}-static`;
const DATA_CACHE = `${VERSION}-data`;
const OFFLINE_URL = "/offline.html";
const DATA_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const NETWORK_TIMEOUT_MS = 6000;

// Read-only public route data. Anything else under /api is never cached.
const SAFE_DATA_PATHS = [
  /^\/api\/routes\/?$/,
  /^\/api\/routes\/network\/?$/,
  /^\/api\/routes\/\d+\/?$/,
  /^\/api\/routes\/\d+\/nodes\/?$/,
  /^\/api\/routes\/\d+\/geometry\/?$/,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => !name.startsWith(VERSION)).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

function isSafeData(url) {
  return SAFE_DATA_PATHS.some((pattern) => pattern.test(url.pathname));
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}

async function stamped(response, extra) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(extra)) headers.set(name, value);
  return new Response(await response.blob(), { status: response.status, statusText: response.statusText, headers });
}

async function networkFirstData(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
    if (response.ok) await cache.put(request.url, await stamped(response.clone(), { "x-tsela-cached-at": new Date().toISOString() }));
    return response;
  } catch (error) {
    const cached = await cache.match(request.url);
    if (cached) {
      const cachedAt = cached.headers.get("x-tsela-cached-at") ?? "";
      if (cachedAt && Date.now() - Date.parse(cachedAt) < DATA_MAX_AGE_MS) return stamped(cached, { "x-tsela-served-from": "cache" });
    }
    throw error;
  }
}

async function navigate(request) {
  try {
    return await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
  } catch {
    return (await caches.match(OFFLINE_URL)) ?? Response.error();
  }
}

async function cacheFirstStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.headers.has("authorization")) return;
  const url = new URL(request.url);

  if (request.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith(navigate(request));
    return;
  }
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }
  if (isSafeData(url)) {
    event.respondWith(networkFirstData(request));
  }
});
