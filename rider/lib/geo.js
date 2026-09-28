// @ts-check
/**
 * Small, dependency-free geometry helpers for live trip guidance. Plain JavaScript with JSDoc
 * types so the same file runs in the app and in `node --test` without a build step.
 */

const EARTH_RADIUS_METERS = 6_371_000;

/** @typedef {{ lat: number, long: number }} Point */

/** Great-circle distance in metres between two points.
 * @param {Point} a @param {Point} b */
export function distanceMeters(a, b) {
  const toRad = (/** @type {number} */ value) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLong = toRad(b.long - a.long);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLong / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/**
 * Shortest distance in metres from a point to a polyline of [longitude, latitude] pairs.
 * Segments are projected onto a local flat plane, which is accurate to well under a metre
 * over the few hundred metres that matter for an off-route check.
 * @param {Point} point
 * @param {ReadonlyArray<readonly [number, number]>} line
 * @returns {number} Infinity when the line has fewer than two points.
 */
export function distanceToPolylineMeters(point, line) {
  if (line.length < 2) return Number.POSITIVE_INFINITY;
  const cosLat = Math.cos((point.lat * Math.PI) / 180);
  const metersPerDegree = (Math.PI / 180) * EARTH_RADIUS_METERS;
  const toXY = (/** @type {readonly [number, number]} */ [long, lat]) => ({
    x: (long - point.long) * metersPerDegree * cosLat,
    y: (lat - point.lat) * metersPerDegree,
  });
  let best = Number.POSITIVE_INFINITY;
  for (let index = 1; index < line.length; index += 1) {
    const a = toXY(line[index - 1]);
    const b = toXY(line[index]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    // Parameter of the closest point on the segment, clamped to its ends; the point is the origin.
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / lengthSquared));
    best = Math.min(best, Math.hypot(a.x + t * dx, a.y + t * dy));
  }
  return best;
}

/**
 * Decide whether a reading is far enough from the route to warn the rider. The threshold grows
 * with GPS uncertainty so a poor fix does not raise a false alarm.
 * @param {number} offsetMeters @param {number} accuracyMeters
 */
export function isOffRoute(offsetMeters, accuracyMeters) {
  return offsetMeters > Math.max(120, accuracyMeters * 1.5);
}

/** True when the fix is too imprecise for stop-by-stop guidance. @param {number} accuracyMeters */
export function isApproximateFix(accuracyMeters) {
  return accuracyMeters > 150;
}
