"use client";

/** Click-to-trace community map for ordered stops and road-steering points. */

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "@/lib/maplibre-setup";
import { GeoJSONSource } from "maplibre-gl";
import { bindMapData } from "@/lib/map-sync";
import { CONTRIBUTION_BOUNDS, createMapStyle, GABORONE_CENTER, isInsideContributionBounds } from "@/lib/map-config";

type Point = { lat: number; long: number };

function contributionData(waypoints: Point[], geometry: [number, number][]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  if (geometry.length > 1) features.push({ type: "Feature", properties: { kind: "preview" }, geometry: { type: "LineString", coordinates: geometry } });
  if (waypoints.length > 1 && geometry.length === 0) features.push({ type: "Feature", properties: { kind: "guide" }, geometry: { type: "LineString", coordinates: waypoints.map((point) => [point.long, point.lat]) } });
  waypoints.forEach((point, index) => features.push({ type: "Feature", properties: { kind: "waypoint", index, endpoint: index === 0 ? "start" : index === waypoints.length - 1 ? "end" : "turn" }, geometry: { type: "Point", coordinates: [point.long, point.lat] } }));
  return { type: "FeatureCollection", features };
}

export function ContributionMap({ waypoints, geometry, onAddPoint, onBoundaryError }: { waypoints: Point[]; geometry: [number, number][]; onAddPoint: (point: Point) => void; onBoundaryError: (message: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bindingRef = useRef<{ update(): void } | null>(null);
  const stateRef = useRef({ waypoints, geometry });
  const onAddRef = useRef(onAddPoint);
  const onBoundaryErrorRef = useRef(onBoundaryError);
  useEffect(() => { onAddRef.current = onAddPoint; }, [onAddPoint]);
  useEffect(() => { onBoundaryErrorRef.current = onBoundaryError; }, [onBoundaryError]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({ container: containerRef.current, style: createMapStyle(), center: GABORONE_CENTER, zoom: 11.2, maxBounds: [[CONTRIBUTION_BOUNDS.west, CONTRIBUTION_BOUNDS.south], [CONTRIBUTION_BOUNDS.east, CONTRIBUTION_BOUNDS.north]] });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    const setup = () => {
      map.addSource("contribution-boundary", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[CONTRIBUTION_BOUNDS.west, CONTRIBUTION_BOUNDS.south], [CONTRIBUTION_BOUNDS.east, CONTRIBUTION_BOUNDS.south], [CONTRIBUTION_BOUNDS.east, CONTRIBUTION_BOUNDS.north], [CONTRIBUTION_BOUNDS.west, CONTRIBUTION_BOUNDS.north], [CONTRIBUTION_BOUNDS.west, CONTRIBUTION_BOUNDS.south]]] } } });
      map.addLayer({ id: "contribution-boundary-fill", type: "fill", source: "contribution-boundary", paint: { "fill-color": "#3157ff", "fill-opacity": 0.035 } });
      map.addLayer({ id: "contribution-boundary-line", type: "line", source: "contribution-boundary", paint: { "line-color": "#3157ff", "line-width": 2, "line-dasharray": [3, 2] } });
      map.addSource("contribution", { type: "geojson", data: contributionData([], []) });
      map.addLayer({ id: "contribution-guide", type: "line", source: "contribution", filter: ["==", ["get", "kind"], "guide"], paint: { "line-color": "#111", "line-width": 3, "line-dasharray": [2, 2] } });
      map.addLayer({ id: "contribution-preview-casing", type: "line", source: "contribution", filter: ["==", ["get", "kind"], "preview"], paint: { "line-color": "#fff", "line-width": 8 } });
      map.addLayer({ id: "contribution-preview", type: "line", source: "contribution", filter: ["==", ["get", "kind"], "preview"], paint: { "line-color": "#445cff", "line-width": 4 } });
      map.addLayer({ id: "contribution-points", type: "circle", source: "contribution", filter: ["==", ["get", "kind"], "waypoint"], paint: { "circle-radius": 7, "circle-color": ["match", ["get", "endpoint"], "start", "#c9ff4a", "end", "#ff70b7", "#ff6a35"], "circle-stroke-color": "#111", "circle-stroke-width": 2 } });
    };
    const apply = () => (map.getSource("contribution") as GeoJSONSource | undefined)?.setData(contributionData(stateRef.current.waypoints, stateRef.current.geometry));
    bindingRef.current = bindMapData(map, setup, apply);
    map.on("click", (event) => {
      const point = { lat: event.lngLat.lat, long: event.lngLat.lng };
      if (!isInsideContributionBounds(point)) { onBoundaryErrorRef.current("Keep route points inside the Greater Gaborone service area."); return; }
      onAddRef.current(point);
    });
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(containerRef.current);
    return () => { observer.disconnect(); bindingRef.current = null; map.remove(); };
  }, []);

  useEffect(() => {
    stateRef.current = { waypoints, geometry };
    bindingRef.current?.update();
  }, [waypoints, geometry]);

  return <div className="contribution-map-shell"><div className="map-hint"><span className="map-hint-dot" />Tap stops and turns inside the blue service area</div><div ref={containerRef} className="contribution-map" aria-label="Draw a community route inside Greater Gaborone" /></div>;
}
