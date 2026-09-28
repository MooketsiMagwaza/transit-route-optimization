"use client";

/** Searchable network browser with isolated route inspection and bookmarks. */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TrustNotice } from "@/components/trust-notice";
import { TselaIcon } from "@/components/tsela-icon";
import { AllRoutesMap } from "@/components/all-routes-map";
import { apiClient, Node, Route, RouteGeometry } from "@/lib/api-client";
import { routeColor } from "@/lib/map-config";
import { readBookmarkedRouteIds, readRecentRouteIds, rememberRouteIds, toggleBookmarkedRoute } from "@/lib/recent-routes";

function RouteListSkeleton() {
  return <div className="route-list-skeleton" aria-label="Loading routes">{[1, 2, 3, 4].map((item) => <span key={item} />)}</div>;
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [nodesByRoute, setNodesByRoute] = useState<Record<number, Node[]>>({});
  const [geometries, setGeometries] = useState<Record<number, RouteGeometry>>({});
  const [query, setQuery] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [recentRouteIds, setRecentRouteIds] = useState<number[]>([]);
  const [bookmarkedRouteIds, setBookmarkedRouteIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [insetLeft, setInsetLeft] = useState(0);

  // On wide screens the route list floats over the map, so keep that strip clear when fitting routes.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setInsetLeft(query.matches ? 440 : 0);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => { setRecentRouteIds(readRecentRouteIds()); setBookmarkedRouteIds(readBookmarkedRouteIds()); }, []);
  useEffect(() => {
    let cancelled = false;
    async function loadNetwork() {
      try {
        const details = await apiClient.routes.network();
        if (cancelled) return;
        const routeList = details.map(({ route }) => route);
        setRoutes(routeList);
        setNodesByRoute(Object.fromEntries(details.map(({ route, stops }) => [route.id, stops])));
        setGeometries(Object.fromEntries(details.map(({ route, geometry }) => [route.id, geometry])));
        const requestedRouteId = Number(new URLSearchParams(window.location.search).get("route"));
        if (Number.isInteger(requestedRouteId) && routeList.some((route) => route.id === requestedRouteId)) {
          setSelectedRouteId(requestedRouteId);
          setRecentRouteIds(rememberRouteIds([requestedRouteId]));
        }
      } catch (loadError: unknown) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load routes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadNetwork();
    return () => { cancelled = true; };
  }, []);

  const visibleRoutes = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return routes;
    return routes.filter((route) => route.name.toLocaleLowerCase().includes(term)
      || (nodesByRoute[route.id] ?? []).some((stop) => stop.name.toLocaleLowerCase().includes(term)));
  }, [routes, nodesByRoute, query]);
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? null;
  const selectedStops = selectedRoute ? nodesByRoute[selectedRoute.id] ?? [] : [];
  const recentRoutes = recentRouteIds.map((id) => routes.find((route) => route.id === id)).filter((route): route is Route => Boolean(route));

  function selectRoute(routeId: number) {
    setSelectedRouteId(routeId);
    setRecentRouteIds(rememberRouteIds([routeId]));
  }

  return (
    <div className="network-page">
      <section className="network-browser">
        <aside className="network-sidebar">
          {selectedRoute ? (
            <div className="focused-route-panel">
              <button className="route-back" type="button" onClick={() => setSelectedRouteId(null)}>← Show every route</button>
              <span className="page-eyebrow">Route inspection</span>
              <h1>{selectedRoute.name}</h1>
              <p className="focused-route-meta">
                {geometries[selectedRoute.id]?.distanceMeters ? `${(geometries[selectedRoute.id].distanceMeters! / 1000).toFixed(1)} km · ` : ""}
                {selectedStops.length} known stops · {geometries[selectedRoute.id]?.isRoadAligned ? "road-aligned preview" : "stop preview"}
              </p>
              <TrustNotice route={selectedRoute} />
              <div className="route-endpoints">
                <div><span>Starts near</span><strong>{selectedStops[0]?.name ?? "Not recorded"}</strong></div>
                <div><span>Ends near</span><strong>{selectedStops[selectedStops.length - 1]?.name ?? "Not recorded"}</strong></div>
              </div>
              <div className="focused-stop-list">
                {selectedStops.map((stop, index) => (
                  <div key={stop.id}><i style={{ background: routeColor(selectedRoute.id) }} /><span>{String(index + 1).padStart(2, "0")}</span><strong>{stop.name}</strong></div>
                ))}
              </div>
              <div className="focused-route-actions"><button type="button" onClick={() => setBookmarkedRouteIds(toggleBookmarkedRoute(selectedRoute.id))}>{bookmarkedRouteIds.includes(selectedRoute.id) ? "★ Saved" : "☆ Save route"}</button><Link href={`/live/${selectedRoute.id}`}>Track this route →</Link></div>
              <Link className="focused-plan-link" href="/plan">Plan a trip with this route <span>→</span></Link>
            </div>
          ) : (
            <>
              <div className="network-title-row"><div><span className="page-eyebrow">Gaborone network</span><h1>Explore every route</h1></div><span className="route-count-pill">{visibleRoutes.length}</span></div>
              <label className="route-search"><span aria-hidden="true"><TselaIcon name="search" size={20} /></span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a route, area or stop" aria-label="Search routes and stops" /></label>
              <p className="network-help">Search any mapped route or stop. Choose one route to remove the rest and inspect its complete stop sequence.</p>
              {!query && recentRoutes.length > 0 && <div className="recent-route-row"><span>Recently viewed</span>{recentRoutes.map((route) => <button key={route.id} onClick={() => selectRoute(route.id)}>{route.name}</button>)}</div>}
              <div className="network-route-list">
                {loading && <RouteListSkeleton />}
                {error && <div className="alert alert-error">{error}</div>}
                {!loading && !error && visibleRoutes.length === 0 && <div className="discovery-empty">No route or stop matches “{query}”. Community additions can be proposed from the Community dock.</div>}
                {visibleRoutes.map((route) => <button type="button" className="network-route-card" onClick={() => selectRoute(route.id)} key={route.id}><span className="network-route-swatch" style={{ background: routeColor(route.id) }} /><span className="network-route-copy"><strong>{route.name}</strong><small>{(nodesByRoute[route.id] ?? []).map((stop) => stop.name).join(" · ")}</small></span><span aria-hidden="true">→</span></button>)}
              </div>
            </>
          )}
        </aside>
        <div className="network-map-panel">
          <div className="network-map-note"><span /> {selectedRoute ? "Only this route is visible · start and end are highlighted" : "Choose a route to isolate it"}</div>
          <AllRoutesMap routes={visibleRoutes} nodesByRoute={nodesByRoute} geometries={geometries} selectedRouteId={selectedRouteId} onSelect={selectRoute} insetLeft={insetLeft} />
        </div>
      </section>
    </div>
  );
}
