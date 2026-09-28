// Regression tests for the bug that left the rider map without route lines.
// Runs with `npm test` (node:test, no dependencies).

import assert from "node:assert/strict";
import test from "node:test";
import { bindMapData } from "../lib/map-sync.js";

function fakeMap() {
  const listeners = new Map();
  return {
    once(event, listener) { listeners.set(event, listener); },
    fire(event) { listeners.get(event)?.(); listeners.delete(event); },
  };
}

test("data that arrives before the style is ready is applied once, with the latest state", () => {
  const map = fakeMap();
  const log = [];
  let latest = "empty";
  const binding = bindMapData(map, () => log.push("setup"), () => log.push(latest));

  latest = "routes-loaded";
  binding.update();
  assert.deepEqual(log, [], "nothing can be applied before the style exists");
  assert.equal(binding.isReady(), false);

  map.fire("style.load");
  assert.deepEqual(log, ["setup", "routes-loaded"], "the first apply must use the newest data, not the data from mount");
  assert.equal(binding.isReady(), true);
});

test("a state captured at mount can never overwrite newer data", () => {
  const map = fakeMap();
  const applied = [];
  const stateRef = { current: { routes: [] } };
  const binding = bindMapData(map, () => {}, () => applied.push(stateRef.current.routes.length));

  // Mount: no routes yet. Data then arrives while tiles are still loading.
  binding.update();
  stateRef.current = { routes: [1, 2, 3, 4, 5, 6, 7, 8, 9] };
  binding.update();
  map.fire("style.load");
  binding.update();

  assert.deepEqual(applied, [9, 9], "every apply after ready sees nine routes; the empty mount state is gone");
});

test("later changes apply immediately and in order, even while tiles are loading", () => {
  const map = fakeMap();
  const seen = [];
  let position = "a";
  const binding = bindMapData(map, () => {}, () => seen.push(position));
  map.fire("style.load");

  for (const next of ["b", "c", "d"]) { position = next; binding.update(); }

  assert.deepEqual(seen, ["a", "b", "c", "d"]);
});

test("setup runs exactly once", () => {
  const map = fakeMap();
  let setups = 0;
  const binding = bindMapData(map, () => { setups += 1; }, () => {});
  map.fire("style.load");
  map.fire("style.load");
  binding.update();
  binding.update();
  assert.equal(setups, 1);
});
