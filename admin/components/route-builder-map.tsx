"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "@/lib/maplibre-setup";
import { GeoJSONSource } from "maplibre-gl";
import { createMapStyle, GABORONE_CENTER } from "@/lib/map-config";

export interface DraftStop {
  clientId: string;
  name: string;
  lat: number;
  long: number;
}

function draftData(stops: DraftStop[]): GeoJSON.FeatureCollection {
  const ordered = stops.map((stop) => [stop.long, stop.lat] as [number, number]);
  return {
    type: "FeatureCollection",
    features: [
      ...(ordered.length > 1
        ? [
            {
              type: "Feature" as const,
              properties: { kind: "line" },
              geometry: { type: "LineString" as const, coordinates: ordered },
            },
          ]
        : []),
      ...stops.map((stop, index) => ({
        type: "Feature" as const,
        properties: { kind: "stop", name: stop.name, order: index + 1 },
        geometry: { type: "Point" as const, coordinates: [stop.long, stop.lat] },
      })),
    ],
  };
}

export function RouteBuilderMap({
  stops,
  onAddStop,
}: {
  stops: DraftStop[];
  onAddStop: (coordinate: { lat: number; long: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const stopsRef = useRef(stops);
  const onAddStopRef = useRef(onAddStop);

  useEffect(() => {
    stopsRef.current = stops;
  }, [stops]);

  useEffect(() => {
    onAddStopRef.current = onAddStop;
  }, [onAddStop]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const map = new maplibregl.Map({
      container,
      style: createMapStyle(),
      center: GABORONE_CENTER,
      zoom: 11.25,
    });
    mapRef.current = map;
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.getCanvas().style.cursor = "crosshair";
    map.on("click", (event) => {
      onAddStopRef.current({
        lat: Number(event.lngLat.lat.toFixed(6)),
        long: Number(event.lngLat.lng.toFixed(6)),
      });
    });
    map.on("load", () => {
      map.addSource("draft-route", { type: "geojson", data: draftData(stopsRef.current) });
      map.addLayer({
        id: "draft-route-line",
        type: "line",
        source: "draft-route",
        filter: ["==", ["get", "kind"], "line"],
        paint: {
          "line-color": "#111111",
          "line-width": 5,
          "line-dasharray": [1.25, 1.25],
        },
      });
      map.addLayer({
        id: "draft-route-stops",
        type: "circle",
        source: "draft-route",
        filter: ["==", ["get", "kind"], "stop"],
        paint: {
          "circle-radius": 8,
          "circle-color": "#c9ff4a",
          "circle-stroke-color": "#111111",
          "circle-stroke-width": 3,
        },
      });
    });

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => {
      const source = map.getSource("draft-route") as GeoJSONSource | undefined;
      source?.setData(draftData(stops));
    };
    if (map.isStyleLoaded()) update();
    else map.once("load", update);
  }, [stops]);

  return (
    <div className="map-frame map-frame-builder">
      <div className="map-hint">
        <span className="map-hint-dot" />
        Click the map to add stops in travel order
      </div>
      <div ref={containerRef} className="map-canvas" aria-label="Draw a route through Gaborone" />
    </div>
  );
}
