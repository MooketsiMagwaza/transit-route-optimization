// Geometry used by live trip guidance. Runs with `npm test` (node:test, no dependencies).

import assert from "node:assert/strict";
import test from "node:test";
import { distanceMeters, distanceToPolylineMeters, isApproximateFix, isOffRoute } from "../lib/geo.js";

// A straight east-west road near Gaborone: about 1.0 km long.
const ROAD = [[25.9000, -24.6500], [25.9098, -24.6500]];

test("point-to-point distance matches a known separation", () => {
  const metres = distanceMeters({ lat: -24.65, long: 25.9 }, { lat: -24.65, long: 25.9098 });
  assert.ok(metres > 980 && metres < 1010, `expected about 1 km, got ${metres}`);
});

test("a point on the road is zero metres away, and one to the side is measured perpendicular", () => {
  assert.ok(distanceToPolylineMeters({ lat: -24.65, long: 25.905 }, ROAD) < 1);
  const northOffset = distanceToPolylineMeters({ lat: -24.6491, long: 25.905 }, ROAD);
  assert.ok(northOffset > 95 && northOffset < 105, `expected about 100 m, got ${northOffset}`);
});

test("beyond the end of the road the distance is to the nearest end, not the extended line", () => {
  const past = distanceToPolylineMeters({ lat: -24.65, long: 25.9198 }, ROAD);
  assert.ok(past > 990 && past < 1030, `expected about 1 km past the end, got ${past}`);
});

test("the nearest of several segments wins", () => {
  const bend = [[25.9, -24.65], [25.905, -24.65], [25.905, -24.66]];
  const near = distanceToPolylineMeters({ lat: -24.655, long: 25.9052 }, bend);
  assert.ok(near < 30, `expected the southbound leg to be close, got ${near}`);
});

test("degenerate lines never look close", () => {
  assert.equal(distanceToPolylineMeters({ lat: 0, long: 0 }, []), Number.POSITIVE_INFINITY);
  assert.equal(distanceToPolylineMeters({ lat: 0, long: 0 }, [[1, 1]]), Number.POSITIVE_INFINITY);
});

test("the off-route threshold widens with poor GPS accuracy", () => {
  assert.equal(isOffRoute(100, 10), false);
  assert.equal(isOffRoute(200, 10), true);
  assert.equal(isOffRoute(200, 200), false, "a 200 m fix cannot prove a 200 m detour");
  assert.equal(isOffRoute(500, 200), true);
});

test("very imprecise fixes are flagged as approximate", () => {
  assert.equal(isApproximateFix(30), false);
  assert.equal(isApproximateFix(400), true);
});
