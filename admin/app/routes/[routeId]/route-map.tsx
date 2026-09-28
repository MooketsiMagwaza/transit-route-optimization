"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "@/lib/maplibre-setup";
import { GeoJSONSourceSpecification } from "maplibre-gl";
import { Node } from "@/lib/api-client";
import { createMapStyle } from "@/lib/map-config";

export function RouteMap({ nodes, color }: { nodes: Node[]; color: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    const coordinates = [...nodes]
      .sort((left, right) => left.orderNum - right.orderNum)
      .map((node) => [node.long, node.lat] as [number, number]);
    const routeData: GeoJSONSourceSpecification["data"] = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates },
        },
        ...nodes.map((node) => ({
          type: "Feature" as const,
          properties: { name: node.name, order: node.orderNum },
          geometry: { type: "Point" as const, coordinates: [node.long, node.lat] },
        })),
      ],
    };

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: createMapStyle(),
      center: coordinates[0],
      zoom: 12,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.on("load", () => {
      map.addSource("route", { type: "geojson", data: routeData });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        filter: ["==", ["geometry-type"], "LineString"],
        paint: { "line-color": color, "line-width": 5, "line-opacity": 0.85 },
      });

      map.on("mouseenter", "route-stops", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "route-stops", () => { map.getCanvas().style.cursor = ""; });
      map.on("click", "route-stops", (event) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        const coordinates = feature.geometry.coordinates as [number, number];
        new maplibregl.Popup({ offset: 12 })
          .setLngLat(coordinates)
          .setText(`${String(feature.properties?.name ?? "Stop")} · Stop ${String(feature.properties?.order ?? "")}`)
          .addTo(map);
      });
      map.addLayer({
        id: "route-stops",
        type: "circle",
        source: "route",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 6,
          "circle-color": "#ffffff",
          "circle-stroke-color": color,
          "circle-stroke-width": 3,
        },
      });

      if (coordinates.length > 1) {
        const bounds = coordinates.reduce(
          (current, coordinate) => current.extend(coordinate),
          new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
        );
        map.fitBounds(bounds, { padding: 48, maxZoom: 15 });
      }
    });

    return () => map.remove();
  }, [nodes, color]);

  if (nodes.length === 0) return null;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 28 }}>
      <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
        <div className="card-title">Route Map</div>
        <div className="card-subtitle">Live stop sequence rendered with MapLibre</div>
      </div>
      <div ref={containerRef} style={{ height: 360, width: "100%" }} aria-label="Map of route stops" />
    </div>
  );
}
