"use client";

/** MapLibre route view that follows the rider marker during an active trip. */

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "@/lib/maplibre-setup";
import { GeoJSONSource, LngLatBounds } from "maplibre-gl";
import { Node, RouteGeometry } from "@/lib/api-client";
import { bindMapData } from "@/lib/map-sync";
import { createMapStyle } from "@/lib/map-config";

type Position = { lat: number; long: number };

function tripData(stops: Node[], geometry: RouteGeometry | null, position: Position | null, targetId: number): GeoJSON.FeatureCollection {
  const coordinates = geometry?.coordinates ?? stops.map((stop) => [stop.long, stop.lat]);
  const features: GeoJSON.Feature[] = coordinates.length > 1 ? [{ type: "Feature", properties: { kind: "route" }, geometry: { type: "LineString", coordinates } }] : [];
  for (const stop of stops) features.push({ type: "Feature", properties: { kind: "stop", target: stop.id === targetId }, geometry: { type: "Point", coordinates: [stop.long, stop.lat] } });
  if (position) features.push({ type: "Feature", properties: { kind: "rider" }, geometry: { type: "Point", coordinates: [position.long, position.lat] } });
  return { type: "FeatureCollection", features };
}

export function LiveTripMap({ stops, geometry, position, targetId }: { stops: Node[]; geometry: RouteGeometry | null; position: Position | null; targetId: number }) {
  const containerRef = useRef<HTMLDivElement>(null); const bindingRef = useRef<{ update(): void } | null>(null); const fittedRef = useRef(false);
  const stateRef = useRef({ stops, geometry, position, targetId });
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({ container: containerRef.current, style: createMapStyle(), center: [25.9231, -24.6533], zoom: 11 }); 
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    const setup = () => {
      map.addSource("trip", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "trip-casing", type: "line", source: "trip", filter: ["==", ["get", "kind"], "route"], paint: { "line-color": "#fff", "line-width": 12 } });
      map.addLayer({ id: "trip-route", type: "line", source: "trip", filter: ["==", ["get", "kind"], "route"], paint: { "line-color": "#445cff", "line-width": 7 } });
      map.addLayer({ id: "trip-stops", type: "circle", source: "trip", filter: ["==", ["get", "kind"], "stop"], paint: { "circle-radius": ["case", ["get", "target"], 10, 5], "circle-color": ["case", ["get", "target"], "#ff70b7", "#fff"], "circle-stroke-color": "#111", "circle-stroke-width": 3 } });
      map.addLayer({ id: "trip-rider", type: "circle", source: "trip", filter: ["==", ["get", "kind"], "rider"], paint: { "circle-radius": 9, "circle-color": "#c9ff4a", "circle-stroke-color": "#111", "circle-stroke-width": 4 } });
    };
    const apply = () => {
      const current = stateRef.current;
      (map.getSource("trip") as GeoJSONSource | undefined)?.setData(tripData(current.stops, current.geometry, current.position, current.targetId));
      if (current.position) { map.easeTo({ center: [current.position.long, current.position.lat], zoom: Math.max(map.getZoom(), 13), duration: 500 }); return; }
      // Fit the whole route once when it first has enough points, then leave the rider's view alone.
      const coords = current.geometry?.coordinates ?? current.stops.map((stop) => [stop.long, stop.lat] as [number, number]);
      if (!fittedRef.current && coords.length > 1) {
        fittedRef.current = true;
        map.fitBounds(coords.reduce((bounds, item) => bounds.extend(item as [number, number]), new LngLatBounds(coords[0] as [number, number], coords[0] as [number, number])), { padding: 65, maxZoom: 14 });
      }
    };
    bindingRef.current = bindMapData(map, setup, apply);
    return () => { bindingRef.current = null; map.remove(); };
  }, []);
  useEffect(() => { stateRef.current = { stops, geometry, position, targetId }; bindingRef.current?.update(); }, [stops, geometry, position, targetId]);
  return <div ref={containerRef} className="live-trip-map" aria-label="Live route and rider position" />;
}
