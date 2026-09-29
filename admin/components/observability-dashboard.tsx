"use client";

/** Live platform metrics links and durable Grafana notification history. */

import { useCallback, useEffect, useState } from "react";
import { AdminOverview, apiClient, GrafanaNotification } from "@/lib/api-client";

const REFRESH_MS = 15000;

export function ObservabilityDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [notifications, setNotifications] = useState<GrafanaNotification[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [summary, feed] = await Promise.all([
        apiClient.admin.overview(),
        apiClient.admin.notifications(),
      ]);
      setOverview(summary);
      setNotifications(feed);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Observability data is unavailable");
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [load]);

  return <div className="page-container ops-platform-page">
    <header className="ops-platform-hero ops-observability-hero">
      <div><span className="page-eyebrow">Platform observability</span><h1>Signals you can<br />act on.</h1><p>Prometheus collects bounded HTTP metrics. Grafana turns them into dashboards and delivers alert state changes back into this operational feed.</p></div>
      <div className={`ops-hero-stat ${overview?.firingAlerts ? "alerting" : "calm"}`}><span>Firing now</span><strong>{overview?.firingAlerts ?? 0}</strong><small>Grafana notifications</small></div>
    </header>
    {error && <div className="alert alert-error">{error}</div>}

    <section className="ops-observability-metrics">
      <article><span>01 · TRAFFIC</span><strong>{overview?.requests24h ?? "—"}</strong><p>API calls in the last 24 hours</p></article>
      <article><span>02 · ACCESS</span><strong>{overview?.activeApiKeys ?? "—"}</strong><p>Active developer API keys</p></article>
      <a href={overview?.grafanaUrl ?? "http://localhost:3004"} target="_blank" rel="noreferrer"><span>03 · GRAFANA</span><strong>Open ↗</strong><p>Dashboards, rules, and alert history</p><small>Local: admin · password from GRAFANA_ADMIN_PASSWORD</small></a>
      <a href={overview?.prometheusUrl ?? "http://localhost:9090"} target="_blank" rel="noreferrer"><span>04 · PROMETHEUS</span><strong>Query ↗</strong><p>Targets, rules, and raw time series</p></a>
    </section>

    <section className="ops-observability-grid">
      <article className="ops-panel">
        <header><div><span className="panel-kicker">TOP PATHS · 24 HOURS</span><h2>Where requests land</h2></div></header>
        <div className="ops-usage-paths">{overview?.usagePaths.length ? overview.usagePaths.map((item) => <div key={item.path}><code>{item.path}</code><strong>{item.requests}</strong></div>) : <p>No metered API traffic yet.</p>}</div>
      </article>
      <article className="ops-panel">
        <header><div><span className="panel-kicker">Grafana webhook</span><h2>Notification feed</h2></div><small>Auto-refreshes</small></header>
        <div className="ops-notification-feed">{notifications.length ? notifications.map((notice) => <article key={notice.id} className={`severity-${notice.severity}`}>
          <i /><div><span>{notice.state} · {notice.severity}</span><strong>{notice.title}</strong>{notice.message && <p>{notice.message}</p>}<time>{new Intl.DateTimeFormat("en-BW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(notice.createdAt))}</time></div>
        </article>) : <p className="ops-empty">No Grafana notifications have been delivered. That is normal while the stack is healthy.</p>}</div>
      </article>
    </section>
  </div>;
}
