"use client";

/** MapLibre network renderer that isolates one route and exposes ordered stops. */

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "@/lib/maplibre-setup";
import { GeoJSONSource, LngLatBounds } from "maplibre-gl";
import { Node, Route, RouteGeometry } from "@/lib/api-client";
import { bindMapData } from "@/lib/map-sync";
import { createMapStyle, GABORONE_CENTER, routeColor } from "@/lib/map-config";

function networkData(
  routes: Route[],
  nodesByRoute: Record<number, Node[]>,
  geometries: Record<number, RouteGeometry>,
  selectedRouteId: number | null
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const displayedRoutes = selectedRouteId === null
    ? routes
    : routes.filter((route) => route.id === selectedRouteId);
  for (const route of displayedRoutes) {
    const nodes = [...(nodesByRoute[route.id] ?? [])].sort(
      (left, right) => left.orderNum - right.orderNum
    );
    const coordinates = geometries[route.id]?.coordinates
      ?? nodes.map((node) => [node.long, node.lat] as [number, number]);
    if (coordinates.length > 1) {
      features.push({
        type: "Feature",
        properties: {
          kind: "route",
          routeId: route.id,
          routeName: route.name,
          color: routeColor(route.id),
          selected: selectedRouteId === route.id,
        },
        geometry: { type: "LineString", coordinates },
      });
    }
    if (selectedRouteId === null) continue;
    for (const [index, node] of nodes.entries()) {
      features.push({
        type: "Feature",
        properties: {
          kind: "stop",
          routeId: route.id,
          routeName: route.name,
          name: node.name,
          color: routeColor(route.id),
          selected: selectedRouteId === route.id,
          endpoint: index === 0 ? "start" : index === nodes.length - 1 ? "end" : "stop",
        },
        geometry: { type: "Point", coordinates: [node.long, node.lat] },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

export function AllRoutesMap({
  routes,
  nodesByRoute,
  geometries,
  selectedRouteId,
  onSelect,
}: {
  routes: Route[];
  nodesByRoute: Record<number, Node[]>;
  geometries: Record<number, RouteGeometry>;
  selectedRouteId: number | null;
  onSelect: (routeId: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bindingRef = useRef<{ update(): void } | null>(null);
  // Always the newest props. The map callbacks read this, never a captured render.
  const stateRef = useRef({ routes, nodesByRoute, geometries, selectedRouteId });
  const onSelectRef = useRef(onSelect);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: createMapStyle(),
      center: GABORONE_CENTER,
      zoom: 10.8,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    const setup = () => {
      map.addSource("network", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "network-route-casing",
        type: "line",
        source: "network",
        filter: ["==", ["get", "kind"], "route"],
        paint: {
          "line-color": "#ffffff",
          "line-width": ["case", ["get", "selected"], 12, 9],
          "line-opacity": 0.95,
        },
      });
      map.addLayer({
        id: "network-route-lines",
        type: "line",
        source: "network",
        filter: ["==", ["get", "kind"], "route"],
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["get", "selected"], 7, 5],
          "line-opacity": ["case", ["get", "selected"], 1, 0.92],
        },
      });
      map.addLayer({
        id: "network-route-stops",
        type: "circle",
        source: "network",
        filter: ["==", ["get", "kind"], "stop"],
        paint: {
          "circle-radius": ["case", ["get", "selected"], 6, 4],
          "circle-color": [
            "match", ["get", "endpoint"], "start", "#c9ff4a", "end", "#ff70b7", "#ffffff"
          ],
          "circle-stroke-color": ["get", "color"],
          "circle-stroke-width": 3,
        },
      });
      map.on("mouseenter", "network-route-lines", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "network-route-lines", () => { map.getCanvas().style.cursor = ""; });
      map.on("click", "network-route-lines", (event) => {
        const routeId = Number(event.features?.[0]?.properties?.routeId);
        if (Number.isFinite(routeId)) onSelectRef.current(routeId);
      });
    };

    const apply = () => {
      const { routes: shown, nodesByRoute: stops, geometries: lines, selectedRouteId: chosen } = stateRef.current;
      (map.getSource("network") as GeoJSONSource | undefined)?.setData(networkData(shown, stops, lines, chosen));
      const coordinates = chosen !== null
        ? lines[chosen]?.coordinates ?? (stops[chosen] ?? []).map((node) => [node.long, node.lat] as [number, number])
        : shown.flatMap((route) => lines[route.id]?.coordinates ?? []);
      if (coordinates.length > 1) {
        const bounds = coordinates.reduce(
          (current, coordinate) => current.extend(coordinate),
          new LngLatBounds(coordinates[0], coordinates[0])
        );
        map.fitBounds(bounds, chosen !== null
          ? { padding: 70, duration: 500, maxZoom: 13.5 }
          : { padding: 55, duration: 500, maxZoom: 12 });
      }
    };

    bindingRef.current = bindMapData(map, setup, apply);
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(containerRef.current);
    return () => { observer.disconnect(); bindingRef.current = null; map.remove(); };
  }, []);

  useEffect(() => {
    stateRef.current = { routes, nodesByRoute, geometries, selectedRouteId };
    bindingRef.current?.update();
  }, [routes, nodesByRoute, geometries, selectedRouteId]);

  return <div ref={containerRef} className="all-routes-map" aria-label="All Gaborone combi routes" />;
}
