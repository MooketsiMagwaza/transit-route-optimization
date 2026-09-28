// @ts-check
/**
 * Keeps React state and a MapLibre map in step without losing data.
 *
 * Sources and layers can only be added once the style is ready, and data can only be applied
 * after that. Two obvious ways to gate this are wrong, and both silently drop route lines:
 *
 *  - `map.isStyleLoaded()` turns false whenever any tile is loading, including moments after a
 *    pan or zoom, so an update attempted then is skipped.
 *  - `map.once("load", update)` registers a callback that captures the props of the render that
 *    created it. If newer data has arrived by the time `load` fires (it waits for tiles, so it
 *    is slow on a slow tile server), the stale callback runs last and overwrites the map with
 *    the old, usually empty, data. `load` also fires only once, so a retry hooked to it never runs.
 *
 * `bindMapData` instead runs `setup` once when the style is parsed, then `apply` (which must read
 * the latest state from a ref) immediately and again on every `update()` after that. Updates
 * requested before the style is ready are not lost: the first `apply` uses the latest state.
 */

/**
 * @typedef {{ once(event: "style.load", listener: () => void): unknown }} StyleEmitter
 * @param {StyleEmitter} map
 * @param {() => void} setup Adds sources, layers, and listeners; runs once.
 * @param {() => void} apply Pushes the latest state to the map; reads state from a ref.
 * @returns {{ update(): void, isReady(): boolean }}
 */
export function bindMapData(map, setup, apply) {
  let ready = false;
  map.once("style.load", () => {
    setup();
    ready = true;
    apply();
  });
  return {
    update() {
      if (ready) apply();
    },
    isReady() {
      return ready;
    },
  };
}
