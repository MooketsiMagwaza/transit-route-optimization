"use client";

/** Operations overview, health monitoring, and the layered mapped-route workflow. */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminOverview,
  AdminSystemMetrics,
  apiClient,
  ApiHealth,
  DashboardData,
  HealthStatus,
} from "@/lib/api-client";
import { DraftStop, RouteBuilderMap } from "@/components/route-builder-map";

const AUTO_REFRESH_MS = 10000;
const ROUTE_COLORS = ["#111111", "#7d3cff", "#94b82f", "#4f6d7a", "#a44a3f", "#477a55"];

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function relativeTime(date: Date | null): string {
  if (!date) return "Waiting for data";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "Updated just now";
  if (seconds < 60) return `Updated ${seconds}s ago`;
  return `Updated ${Math.floor(seconds / 60)}m ago`;
}

function formatBytes(value: number | null): string {
  if (value == null) return "Awaiting data";
  if (value < 1024) return `${Math.round(value)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let scaled = value / 1024;
  let unit = 0;
  while (scaled >= 1024 && unit < units.length - 1) {
    scaled /= 1024;
    unit += 1;
  }
  return `${scaled.toFixed(scaled >= 100 ? 0 : 1)} ${units[unit]}`;
}

function formatPercent(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "Awaiting data" : `${value.toFixed(2)}%`;
}

function HealthItem({ label, status, detail }: { label: string; status: HealthStatus; detail?: string }) {
  const healthy = status === "healthy";
  return <div className="ops-health-item"><i className={healthy ? "healthy" : "degraded"} /><span><strong>{label}</strong><small>{detail || "Responding"}</small></span><em>{healthy ? "Operational" : "Degraded"}</em></div>;
}

export function OperationsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [platformOverview, setPlatformOverview] = useState<AdminOverview | null>(null);
  const [system, setSystem] = useState<AdminSystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [healthError, setHealthError] = useState("");
  const [page, setPage] = useState(1);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [routeDescription, setRouteDescription] = useState("");
  const [draftStops, setDraftStops] = useState<DraftStop[]>([]);
  const [creatingRoute, setCreatingRoute] = useState(false);
  const [routeNotice, setRouteNotice] = useState("");

  const loadDashboard = useCallback(async (manual = false, background = false) => {
    if (manual) setRefreshing(true);
    else if (!background) setLoading(true);
    setError("");
    try {
      setData(await apiClient.dashboard.dbView(page, 10));
      setLastUpdated(new Date());
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, "Could not load network data"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  const loadHealth = useCallback(async () => {
    setHealthError("");
    try { setHealth(await apiClient.health.check()); }
    catch (loadError: unknown) { setHealthError(errorMessage(loadError, "Health check unavailable")); }
  }, []);

  const loadOperations = useCallback(async () => {
    try {
      const [overview, metrics] = await Promise.all([
        apiClient.admin.overview(),
        apiClient.admin.system(),
      ]);
      setPlatformOverview(overview);
      setSystem(metrics);
    } catch {
      setSystem(null);
    }
  }, []);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);
  useEffect(() => { void loadHealth(); }, [loadHealth]);
  useEffect(() => { void loadOperations(); }, [loadOperations]);
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      void loadDashboard(false, true);
      void loadHealth();
      void loadOperations();
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [autoRefresh, loadDashboard, loadHealth, loadOperations]);
  useEffect(() => {
    if (!builderOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { setBuilderOpen(false); setRouteNotice(""); } };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [builderOpen]);

  const routeNames = useMemo(() => new Map((data?.routes ?? []).map((route) => [route.id, route.name])), [data]);
  const routeCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const node of data?.nodes ?? []) counts.set(node.routeId, (counts.get(node.routeId) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [data]);
  const totalRoutes = data?.totals?.routes ?? data?.routes.length ?? 0;
  const totalStops = data?.totals?.nodes ?? data?.nodes.length ?? 0;
  const averageStops = totalRoutes ? (totalStops / totalRoutes).toFixed(1) : "0";
  const maxVisibleStops = Math.max(1, ...routeCounts.map(([, count]) => count));

  function closeBuilder() {
    setBuilderOpen(false);
    setRouteNotice("");
  }

  const addDraftStop = useCallback((coordinate: { lat: number; long: number }) => {
    setDraftStops((current) => [...current, { clientId: crypto.randomUUID(), name: `Stop ${current.length + 1}`, lat: coordinate.lat, long: coordinate.long }]);
  }, []);

  async function createRoute(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draftStops.length < 2) { setRouteNotice("Add at least two stops on the map."); return; }
    setCreatingRoute(true); setRouteNotice("");
    try {
      const created = await apiClient.routes.createMapped({
        name: routeName.trim(),
        description: routeDescription.trim() || undefined,
        stops: draftStops.map((stop, index) => ({ name: stop.name.trim() || `Stop ${index + 1}`, lat: stop.lat, long: stop.long, orderNum: index + 1 })),
      });
      setBuilderOpen(false); setRouteName(""); setRouteDescription(""); setDraftStops([]);
      setRouteNotice(`“${created.route.name}” was added with ${created.stops.length} stops.`);
      setPage(1); await loadDashboard(true);
    } catch (createError: unknown) { setRouteNotice(errorMessage(createError, "Could not save the mapped route")); }
    finally { setCreatingRoute(false); }
  }

  return <div className="page-container ops-dashboard">
    <header className="ops-dashboard-head">
      <div><span className="page-eyebrow">Gaborone network control</span><h1>Good afternoon.</h1><p>A clear view of route coverage, stop data, and the services keeping the network online.</p></div>
      <div className="ops-dashboard-actions"><Link href="/routes" className="btn btn-secondary">Browse routes</Link><button className="btn btn-primary" onClick={() => { setRouteNotice(""); setBuilderOpen(true); }}>Map a new route <span>＋</span></button></div>
    </header>

    <section className="ops-control-strip" aria-label="Dashboard refresh controls">
      <div className="ops-live-copy"><i className={health?.status === "healthy" ? "healthy" : "checking"} /><span><strong>{health?.status === "healthy" ? "Network services online" : "Checking network services"}</strong><small>{relativeTime(lastUpdated)}</small></span></div>
      <label className="ops-refresh-toggle"><input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} /><span /> Auto-refresh</label>
      <button className="btn btn-secondary btn-sm" disabled={refreshing} onClick={() => { void loadDashboard(true); void loadHealth(); void loadOperations(); }}>{refreshing ? "Refreshing…" : "Refresh now"}</button>
    </section>

    {error && <div className="alert alert-error ops-alert"><span><b>Data unavailable.</b> {error}</span><button className="btn btn-secondary btn-sm" onClick={() => void loadDashboard(true)}>Try again</button></div>}
    {routeNotice && !builderOpen && <div className="alert alert-success ops-alert"><span>{routeNotice}</span><button onClick={() => setRouteNotice("")} aria-label="Dismiss route notice">×</button></div>}

    <section className="ops-system-pulse" aria-label="Platform resource usage">
      <header>
        <div><span className="panel-kicker">Live platform pulse</span><h2>Capacity and reliability</h2></div>
        <div className="ops-system-links"><Link href="/observability">All alerts</Link><a href={platformOverview?.grafanaUrl ?? "http://localhost:3004"} target="_blank" rel="noreferrer">Open Grafana ↗</a></div>
      </header>
      <div className="ops-system-grid">
        <article><span>API memory</span><strong>{formatBytes(system?.apiMemoryBytes ?? null)}</strong><small>Resident RAM in use</small></article>
        <article><span>CPU load</span><strong>{system?.apiCpuCores == null ? "Awaiting data" : `${(system.apiCpuCores * 100).toFixed(1)}%`}</strong><small>Five-minute process rate</small></article>
        <article><span>DB cache memory</span><strong>{formatBytes(system?.databaseMemoryBytes ?? null)}</strong><small>Allocated shared buffers</small></article>
        <article><span>DB connections</span><strong>{system?.databaseConnections == null ? "—" : Math.round(system.databaseConnections)}</strong><small>Open application sessions</small></article>
        <article><span>Request p95</span><strong>{system?.requestP95Seconds == null ? "Awaiting data" : `${Math.round(system.requestP95Seconds * 1000)} ms`}</strong><small>Five-minute latency</small></article>
        <article><span>Error rate</span><strong>{formatPercent(system?.errorRatePercent ?? null)}</strong><small>HTTP 5xx responses</small></article>
        <article><span>Database storage</span><strong>{formatBytes(system?.databaseSizeBytes ?? null)}</strong><small>PostgreSQL data consumed</small></article>
        <article className={platformOverview?.firingAlerts ? "is-alerting" : "is-healthy"}><span>Active alerts</span><strong>{platformOverview?.firingAlerts ?? 0}</strong><small>{system?.prometheusReachable ? "Prometheus connected" : "Prometheus reconnecting"}</small></article>
      </div>
      <footer><span><i className={system?.apiUp ? "healthy" : "checking"} /> API {system?.apiUp ? "up" : "pending"}</span><span><i className={system?.databaseUp ? "healthy" : "checking"} /> Database {system?.databaseUp ? "up" : "pending"}</span><span>{system?.apiOpenFds == null ? "File descriptors pending" : `${Math.round(system.apiOpenFds)} open file descriptors`}</span><small>Collected {system ? new Date(system.collectedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "when telemetry connects"}</small></footer>
    </section>

    {loading ? <section className="ops-metric-grid" aria-label="Loading network totals">{[0, 1, 2, 3].map((item) => <div className="ops-metric skeleton-block" key={item} />)}</section> : <section className="ops-metric-grid" aria-label="Network totals">
      <article className="ops-metric"><span>Routes</span><strong>{totalRoutes}</strong><p>Published corridors</p></article>
      <article className="ops-metric"><span>Stops</span><strong>{totalStops}</strong><p>Mapped network points</p></article>
      <article className="ops-metric"><span>Density</span><strong>{averageStops}</strong><p>Average stops per route</p></article>
      <article className="ops-metric ops-metric-dark"><span>Platform</span><strong>{health?.status === "healthy" ? "Live" : "Check"}</strong><p>PostGIS network status</p></article>
    </section>}

    <section className="ops-overview-grid">
      <article className="ops-panel ops-coverage-panel">
        <header><div><span className="panel-kicker">Network shape</span><h2>Stops by route</h2></div><small>Current data window</small></header>
        <div className="ops-route-bars">
          {routeCounts.length ? routeCounts.map(([routeId, count], index) => <div className="ops-route-bar" key={routeId}><div><strong>{routeNames.get(routeId) ?? `Route ${routeId}`}</strong><span>{count} visible stop{count === 1 ? "" : "s"}</span></div><i><b style={{ width: `${Math.max(12, count / maxVisibleStops * 100)}%`, background: ROUTE_COLORS[index % ROUTE_COLORS.length] }} /></i></div>) : <p className="ops-empty">Stop distribution will appear when route data is available.</p>}
        </div>
        <footer><span>Showing the current 10-stop data window</span><Link href="/routes">Open route directory →</Link></footer>
      </article>

      <article className="ops-panel ops-health-panel">
        <header><div><span className="panel-kicker">Infrastructure</span><h2>Service health</h2></div>{health && <span className={`badge ${health.status === "healthy" ? "badge-green" : "badge-amber"}`}>{health.status}</span>}</header>
        {healthError ? <div className="alert alert-error">{healthError}</div> : health ? <div className="ops-health-list">
          <HealthItem label="API" status={health.services.api.status} detail={`${Math.floor(health.uptimeSeconds / 60)} min uptime`} />
          <HealthItem label="PostgreSQL" status={health.services.database.status} detail={health.services.database.latencyMs == null ? undefined : `${health.services.database.latencyMs} ms response`} />
          <HealthItem label="PostGIS" status={health.services.postgis.status} detail={health.services.postgis.version?.split(" ")[0]} />
          {health.services.pgrouting && <HealthItem label="pgRouting" status={health.services.pgrouting.status} detail={health.services.pgrouting.version ?? undefined} />}
        </div> : <div className="loading-row"><span className="spinner spinner-sm" /> Checking services…</div>}
      </article>
    </section>

    <section className="ops-data-grid">
      <article className="ops-panel ops-recent-routes">
        <header><div><span className="panel-kicker">Route directory</span><h2>Recent corridors</h2></div><span>{data?.routes.length ?? 0} shown</span></header>
        <div>{data?.routes.slice(0, 6).map((route, index) => <Link href={`/routes/${route.id}`} key={route.id}><i style={{ background: ROUTE_COLORS[index % ROUTE_COLORS.length] }} /><span><strong>{route.name}</strong><small>{route.description || "No description yet"}</small></span><em>#{route.id}</em><b>→</b></Link>)}</div>
      </article>
      <article className="ops-panel ops-stop-snapshot">
        <header><div><span className="panel-kicker">Stop data</span><h2>Latest snapshot</h2></div><span>Page {page}</span></header>
        <div className="ops-stop-list">{data?.nodes.slice(0, 7).map((node) => <div key={node.id}><span>{String(node.orderNum).padStart(2, "0")}</span><p><strong>{node.name}</strong><small>{routeNames.get(node.routeId) ?? `Route ${node.routeId}`}</small></p><em>{node.lat.toFixed(3)}, {node.long.toFixed(3)}</em></div>)}</div>
        <footer><button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><button className="btn btn-secondary btn-sm" disabled={(data?.nodes.length ?? 0) < 10} onClick={() => setPage((current) => current + 1)}>Next page</button></footer>
      </article>
    </section>

    {builderOpen && <div className="ops-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeBuilder(); }}>
      <section className="ops-route-modal" role="dialog" aria-modal="true" aria-labelledby="route-builder-title">
        <header><div><span className="panel-kicker">New corridor</span><h2 id="route-builder-title">Map a route</h2><p>Name the corridor, then place stops in travel order. The preview stays inside the supported Gaborone service area.</p></div><button onClick={closeBuilder} aria-label="Close route builder">×</button></header>
        {routeNotice && <div className="alert alert-error">{routeNotice}</div>}
        <form onSubmit={createRoute}>
          <div className="ops-route-fields"><label><span>Route name</span><input className="form-input" value={routeName} onChange={(event) => setRouteName(event.target.value)} placeholder="e.g. Broadhurst to Main Mall" required maxLength={120} /></label><label><span>Description</span><input className="form-input" value={routeDescription} onChange={(event) => setRouteDescription(event.target.value)} placeholder="Service area or purpose" maxLength={500} /></label></div>
          <div className="route-builder-layout"><RouteBuilderMap stops={draftStops} onAddStop={addDraftStop} /><aside className="route-builder-panel"><div className="route-builder-toolbar"><div><strong>Stop sequence</strong><small>{draftStops.length} mapped</small></div><button type="button" className="btn btn-secondary btn-sm" disabled={!draftStops.length} onClick={() => setDraftStops((current) => current.slice(0, -1))}>Undo</button></div><div className="draft-stop-list">{draftStops.length ? draftStops.map((stop, index) => <div className="draft-stop-row" key={stop.clientId}><span className="draft-stop-index">{index + 1}</span><input className="draft-stop-name" aria-label={`Name for stop ${index + 1}`} value={stop.name} onChange={(event) => setDraftStops((current) => current.map((item) => item.clientId === stop.clientId ? { ...item, name: event.target.value } : item))} /><button className="draft-stop-remove" type="button" aria-label={`Remove stop ${index + 1}`} onClick={() => setDraftStops((current) => current.filter((item) => item.clientId !== stop.clientId))}>×</button></div>) : <div className="route-builder-empty"><span>＋</span>Click the map to place the first stop.</div>}</div><button className="btn btn-primary btn-full" disabled={creatingRoute || !routeName.trim() || draftStops.length < 2}>{creatingRoute ? "Saving route…" : `Save route${draftStops.length >= 2 ? ` · ${draftStops.length} stops` : ""}`}</button></aside></div>
        </form>
      </section>
    </div>}
  </div>;
}
