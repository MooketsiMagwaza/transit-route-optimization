/** Shared MapLibre basemap style, center, and deterministic route colors. */

import type { StyleSpecification } from "maplibre-gl";

export const GABORONE_CENTER: [number, number] = [25.9231, -24.6533];

export const CONTRIBUTION_BOUNDS = {
  west: 25.55,
  south: -24.9,
  east: 26.2,
  north: -24.35,
} as const;

export function isInsideContributionBounds(point: { lat: number; long: number }): boolean {
  return point.long >= CONTRIBUTION_BOUNDS.west && point.long <= CONTRIBUTION_BOUNDS.east
    && point.lat >= CONTRIBUTION_BOUNDS.south && point.lat <= CONTRIBUTION_BOUNDS.north;
}

// Distinct hues (not shades of grey) so neighbouring routes can be told apart on the muted basemap.
// The route list shows the same colour beside each name, so colour is never the only cue.
export const ROUTE_COLORS = [
  "#111111",
  "#7d3cff",
  "#e4572e",
  "#0b8f8c",
  "#e0a100",
  "#2f6bff",
  "#d81e5b",
  "#3f8f1f",
];

export function routeColor(routeId: number): string {
  return ROUTE_COLORS[Math.abs(routeId) % ROUTE_COLORS.length];
}

export function createMapStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: "osm",
        type: "raster",
        source: "osm",
        paint: {
          "raster-saturation": -0.85,
          "raster-contrast": -0.08,
          "raster-brightness-max": 0.96,
        },
      },
    ],
  };
}
