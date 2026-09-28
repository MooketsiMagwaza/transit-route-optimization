"use client";

/** Place-based origin/destination planner with GPS origin and road-aware results. */

import { useRef, useState } from "react";
import Link from "next/link";
import { NearbyRoutesMap } from "@/components/nearby-routes-map";
import { ClayIcon } from "@/components/tsela-icon";
import { apiClient, NearbyRoute, Node, PathfindNoRoute, PathfindResult, RouteGeometry } from "@/lib/api-client";
import { routeColor } from "@/lib/map-config";
import { rememberRouteIds } from "@/lib/recent-routes";

type MapPoint = { lat: number; long: number };
type JourneyStage = "origin" | "destination" | "results";

const RADIUS_OPTIONS = [500, 1000, 2000];

function isNoRoute(result: PathfindResult | PathfindNoRoute): result is PathfindNoRoute {
  return "message" in result;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function PathfindPage() {
  const [stage, setStage] = useState<JourneyStage>("origin");
  const [selection, setSelection] = useState<MapPoint | null>(null);
  const [destination, setDestination] = useState<MapPoint | null>(null);
  const [origin, setOrigin] = useState<MapPoint | null>(null);
  const [originLabel, setOriginLabel] = useState("");
  const [destinationLabel, setDestinationLabel] = useState("");
  const [nearbyRoutes, setNearbyRoutes] = useState<NearbyRoute[]>([]);
  const [routeNodes, setRouteNodes] = useState<Record<number, Node[]>>({});
  const [routeGeometries, setRouteGeometries] = useState<Record<number, RouteGeometry>>({});
  const [radiusMeters, setRadiusMeters] = useState(1000);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState("");
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [journeyError, setJourneyError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [result, setResult] = useState<PathfindResult | PathfindNoRoute | null>(null);
  const requestRef = useRef(0);

  async function findNearby(point: MapPoint, radius = radiusMeters) {
    const requestId = ++requestRef.current;
    setNearbyLoading(true);
    setNearbyError("");
    try {
      const response = await apiClient.routes.nearby(point.lat, point.long, radius);
      const details = await Promise.all(response.routes.map(async (match) => {
        const [nodes, geometry] = await Promise.all([apiClient.nodes.list(match.route.id), apiClient.routes.geometry(match.route.id)]);
        return { routeId: match.route.id, nodes, geometry };
      }));
      if (requestId !== requestRef.current) return;
      setNearbyRoutes(response.routes);
      setRouteNodes(Object.fromEntries(details.map(({ routeId, nodes }) => [routeId, nodes])));
      setRouteGeometries(Object.fromEntries(details.map(({ routeId, geometry }) => [routeId, geometry])));
    } catch (error: unknown) {
      if (requestId !== requestRef.current) return;
      setNearbyRoutes([]);
      setRouteNodes({});
      setRouteGeometries({});
      setNearbyError(errorMessage(error, "We could not search this area"));
    } finally {
      if (requestId === requestRef.current) setNearbyLoading(false);
    }
  }

  function handlePin(point: MapPoint) {
    if (stage === "results") return;
    setSelection(point);
    setLocationError("");
    void findNearby(point);
  }

  function chooseRadius(radius: number) {
    setRadiusMeters(radius);
    if (selection) void findNearby(selection, radius);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationError("This browser cannot provide your location. Tap the map instead.");
      return;
    }
    setLocationLoading(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = { lat: position.coords.latitude, long: position.coords.longitude };
        setSelection(point);
        setOriginLabel("My current location");
        setLocationLoading(false);
        void findNearby(point);
      },
      () => {
        setLocationLoading(false);
        setLocationError("Location was unavailable. You can still tap your starting point on the map.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  async function planJourney(chosenOrigin: MapPoint, chosenDestination: MapPoint) {
    setJourneyLoading(true);
    setJourneyError("");
    try {
      const journey = await apiClient.pathfind.find({ origin: chosenOrigin, destination: chosenDestination });
      setResult(journey);
      if (!isNoRoute(journey)) rememberRouteIds([...new Set(journey.path.map((node) => node.routeId))]);
      setStage("results");
      setSelection(null);
    } catch (error: unknown) {
      setJourneyError(errorMessage(error, "We could not plan this journey"));
    } finally {
      setJourneyLoading(false);
    }
  }

  function confirmPlace() {
    if (!selection) return;
    const nearestName = nearbyRoutes[0]?.nearestStop.name;
    if (stage === "origin") {
      const chosenOrigin = selection;
      setOrigin(chosenOrigin);
      setOriginLabel((current) => current || (nearestName ? `Near ${nearestName}` : "Selected starting point"));
      if (destination) {
        void planJourney(chosenOrigin, destination);
      } else {
        setStage("destination");
        setSelection(null);
        setNearbyRoutes([]);
        setRouteNodes({});
        setRouteGeometries({});
      }
      return;
    }
    const chosenDestination = selection;
    setDestination(chosenDestination);
    setDestinationLabel(nearestName ? `Near ${nearestName}` : "Selected destination");
    if (origin) void planJourney(origin, chosenDestination);
  }

  function editPlace(nextStage: "origin" | "destination") {
    setResult(null);
    setJourneyError("");
    setStage(nextStage);
    const point = nextStage === "origin" ? origin : destination;
    setSelection(point);
    if (point) void findNearby(point);
  }

  function startOver() {
    requestRef.current += 1;
    setStage("origin"); setSelection(null); setDestination(null); setOrigin(null);
    setOriginLabel(""); setDestinationLabel(""); setNearbyRoutes([]); setRouteNodes({});
    setRouteGeometries({}); setNearbyError(""); setJourneyError(""); setLocationError(""); setResult(null);
  }

  const nearestName = nearbyRoutes[0]?.nearestStop.name;
  const heading = stage === "origin" ? "Where are you now?" : stage === "destination" ? "Where are you going?" : "Your combi journey";
  const mapPrompt = stage === "origin" ? "Set your starting point" : stage === "destination" ? "Set your destination" : "Journey selected";

  return (
    <div className="rider-journey-page">
      <header className="rider-journey-header">
        <div><span className="page-eyebrow">{stage === "results" ? "Route result" : `${stage === "origin" ? "1" : "2"} of 2`}</span><h1>{heading}</h1><p>{stage === "origin" ? "Use your location or tap the map. You can change it at any time." : stage === "destination" ? "Tap where you want to go, then compare practical combi options." : "Check the boarding point, ordered stops, and where to ask to stop."}</p></div>
        {(origin || destination) && <button className="btn btn-secondary" type="button" onClick={startOver}>Clear trip</button>}
      </header>

      <section className="discovery-workspace" aria-label="Journey planner">
        <div className="discovery-map-panel"><NearbyRoutesMap selection={selection} origin={origin} destination={destination} nearbyRoutes={nearbyRoutes} routeNodes={routeNodes} routeGeometries={routeGeometries} radiusMeters={radiusMeters} prompt={mapPrompt} onPin={handlePin} /></div>
        <aside className="discovery-results">
          <div className="trip-place-stack">
            <button type="button" className={stage === "origin" ? "active" : ""} onClick={() => editPlace("origin")}><i className="origin-dot"/><span>From<strong>{originLabel || (stage === "origin" && selection ? "Starting point selected" : "Set starting point")}</strong></span><b>{origin ? "Change" : "Set"}</b></button>
            <button type="button" className={stage === "destination" ? "active" : ""} onClick={() => editPlace("destination")} disabled={!origin}><i className="destination-dot"/><span>To<strong>{destinationLabel || (stage === "destination" && selection ? "Destination selected" : "Set destination")}</strong></span><b>{destination ? "Change" : "Set"}</b></button>
          </div>

          {stage !== "results" && <>
            <div className="discovery-results-header"><div><span className="panel-kicker">{stage === "origin" ? "Starting point" : "Destination"}</span><h2>{selection ? (nearestName ? `Near ${nearestName}` : "Place selected") : "Choose a place"}</h2></div><span className="route-count-pill">{nearbyRoutes.length}</span></div>
            {stage === "origin" && <button className="gps-button" type="button" onClick={useMyLocation} disabled={locationLoading}><ClayIcon name="pin" size={24} />{locationLoading ? "Finding your location…" : "Use my current location"}</button>}
            {locationError && <div className="alert alert-error">{locationError}</div>}
            <div className="radius-picker" aria-label="Search area"><span>Search area</span><div>{RADIUS_OPTIONS.map((radius) => <button type="button" className={radiusMeters === radius ? "active" : ""} onClick={() => chooseRadius(radius)} key={radius}>{radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}</button>)}</div></div>
            <div className="nearby-route-list">
              {!selection && <div className="discovery-empty">Tap anywhere on the map to choose this place.</div>}
              {nearbyLoading && <div className="nearby-skeleton" aria-label="Searching nearby routes"><span/><span/><span/></div>}
              {nearbyError && <div className="alert alert-error">{nearbyError}</div>}
              {selection && !nearbyLoading && !nearbyError && nearbyRoutes.length === 0 && <div className="discovery-empty">No mapped corridor is this close. Expand the search area and try again.</div>}
              {!nearbyLoading && nearbyRoutes.map((match) => <div className="nearby-route-card" key={match.route.id}><span className="nearby-route-line" style={{ background: routeColor(match.route.id) }} /><div><strong>{match.route.name}</strong><span>Board near {match.nearestStop.name} · about {match.distanceMeters} m away</span></div></div>)}
            </div>
            <button className="btn btn-dark btn-full" type="button" disabled={!selection || nearbyLoading || journeyLoading} onClick={confirmPlace}>{journeyLoading ? "Calculating…" : stage === "origin" ? "Confirm starting point" : "Find combi options"}</button>
            {journeyLoading && <div className="calculation-progress"><span/><p>Comparing walking, boarding, and transfer options…</p></div>}
            {journeyError && <div className="alert alert-error journey-error">{journeyError}</div>}
          </>}

          {stage === "results" && result && <div className="journey-result-panel">{isNoRoute(result) ? <div className="result-empty"><span>Try another way</span><h2>No mapped combi journey yet</h2><p>{result.message}</p></div> : <><span className="panel-kicker">Recommended journey</span><div className="journey-result-time"><strong>{result.totalTimeMinutes}</strong><span>min estimate</span></div><div className="journey-summary-row"><div><strong>{result.transfers}</strong><span>{result.transfers === 1 ? "transfer" : "transfers"}</span></div><div><strong>{Math.round(result.walkingDistanceMeters / 10) * 10} m</strong><span>walking</span></div><div><strong>{result.path.length}</strong><span>mapped stops</span></div></div><div className="plain-instruction"><span>Hop on</span><strong>Near {result.path[0]?.name}</strong><span>Ask to stop</span><strong>Near {result.path[result.path.length - 1]?.name}</strong></div><div className="compact-stop-list">{result.path.map((node, index) => <div key={node.id}><i className={index === 0 ? "first" : index === result.path.length - 1 ? "last" : ""} /><span>{node.name}</span></div>)}</div></>}</div>}
        </aside>
      </section>
      <div className="rider-trust-note"><span>About the lines</span><p>Road-following previews are routing estimates. Community contributions and field-recorded GPS traces are reviewed before becoming published routes.</p><Link href="/routes">Explore all routes →</Link></div>
    </div>
  );
}
