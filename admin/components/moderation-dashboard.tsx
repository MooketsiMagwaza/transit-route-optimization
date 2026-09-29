"use client";

/** Moderation workspace: contribution review, reports, route freshness, and the audit trail. */

import { useCallback, useEffect, useState } from "react";
import { apiClient, AuditEvent, ContributionReview, ModerationReport, ModerationSummary, Route } from "@/lib/api-client";

type Tab = "contributions" | "reports" | "freshness" | "audit";

const when = (iso: string) => new Intl.DateTimeFormat("en-BW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

function ContributionCard({ item, onChange }: { item: ContributionReview; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const duplicates = item.validation.duplicates ?? [];
  const blocking = item.validation.blocking ?? [];

  async function act(action: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await action(); onChange(); } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "Action failed"); }
    finally { setBusy(false); }
  }

  return <article className="mod-card">
    <header><div><h3>{item.name}</h3><small>by {item.contributorAlias ?? "unknown"} · {item.stopCount} points · {when(item.createdAt)}</small></div><span className={`mod-pill ${item.status}`}>{item.status.replace("_", " ")}</span></header>
    {item.notes && <p>{item.notes}</p>}
    {blocking.length > 0 && <ul className="mod-issues blocking">{blocking.map((text) => <li key={text}>{text}</li>)}</ul>}
    {(item.validation.warnings ?? []).length > 0 && <ul className="mod-issues">{(item.validation.warnings ?? []).map((text) => <li key={text}>{text}</li>)}</ul>}
    {duplicates.length > 0 && <div className="mod-duplicates"><strong>Possible duplicates</strong>{duplicates.map((duplicate) => <span key={duplicate.routeId}>{duplicate.routeName} · {duplicate.reasons.join(", ")} · {Math.round(duplicate.sharedStopShare * 100)}% shared stops</span>)}</div>}
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    {item.status === "pending_review" && <footer>
      <button className="btn btn-primary" disabled={busy || blocking.length > 0} onClick={() => void act(() => apiClient.moderation.approve(item.id, duplicates.length > 0))}>{duplicates.length > 0 ? "Publish anyway" : "Publish route"}</button>
      <button className="btn" disabled={busy} onClick={() => { const reason = window.prompt("Reason for rejecting (shown in the audit trail):"); if (reason && reason.trim().length >= 3) void act(() => apiClient.moderation.reject(item.id, reason.trim())); }}>Reject</button>
    </footer>}
    {item.reviewNote && <small>Review note: {item.reviewNote}</small>}
  </article>;
}

export function ModerationDashboard() {
  const [tab, setTab] = useState<Tab>("contributions");
  const [summary, setSummary] = useState<ModerationSummary | null>(null);
  const [contributions, setContributions] = useState<ContributionReview[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError("");
    try {
      const [nextSummary, nextContributions, nextReports, nextRoutes, nextAudit] = await Promise.all([
        apiClient.moderation.summary(), apiClient.moderation.contributions("pending_review"), apiClient.moderation.reports("open"), apiClient.routes.list(), apiClient.moderation.audit(),
      ]);
      setSummary(nextSummary); setContributions(nextContributions); setReports(nextReports); setRoutes(nextRoutes); setAudit(nextAudit);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Moderation data is unavailable"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function resolve(report: ModerationReport, action: "hide_content" | "dismiss") {
    try { await apiClient.moderation.resolveReport(report.id, action); await load(); } catch (resolveError) { setError(resolveError instanceof Error ? resolveError.message : "Could not resolve the report"); }
  }
  async function verify(route: Route, status: "field_verified" | "unverified") {
    try { await apiClient.moderation.verifyRoute(route.id, status); await load(); } catch (verifyError) { setError(verifyError instanceof Error ? verifyError.message : "Could not update the route"); }
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "contributions", label: "Route submissions", count: summary?.pendingContributions },
    { id: "reports", label: "Reports", count: summary?.openReports },
    { id: "freshness", label: "Route freshness", count: summary?.staleRoutes },
    { id: "audit", label: "Audit trail" },
  ];

  return <div className="page-container ops-platform-page">
    <header className="ops-platform-hero">
      <div><span className="page-eyebrow">Community trust</span><h1>Moderation,<br />with a paper trail.</h1><p>Review what riders submit, act on reports, and keep route data honest. Every decision is written to an append-only audit trail.</p></div>
      <div className="ops-hero-stat"><span>Waiting</span><strong>{(summary?.pendingContributions ?? 0) + (summary?.openReports ?? 0)}</strong><small>submissions and reports</small></div>
    </header>
    <div className="mod-tabs" role="tablist" aria-label="Moderation sections">
      {tabs.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}{item.count ? <b>{item.count}</b> : null}</button>)}
    </div>
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    {loading && <div className="ops-table-skeleton" />}

    {!loading && tab === "contributions" && <section className="mod-list" aria-label="Route submissions">
      {contributions.map((item) => <ContributionCard key={item.id} item={item} onChange={() => void load()} />)}
      {contributions.length === 0 && <p className="ops-empty">No route submissions are waiting.</p>}
    </section>}

    {!loading && tab === "reports" && <section className="mod-list" aria-label="Reports">
      {reports.map((report) => <article className="mod-card" key={report.id}>
        <header><div><h3>{report.targetTitle ?? `${report.targetType} #${report.targetId}`}</h3><small>{report.reason} · {report.reportCount} report{report.reportCount === 1 ? "" : "s"} · {when(report.createdAt)}</small></div></header>
        {report.targetExcerpt && <p>{report.targetExcerpt}</p>}
        {report.note && <small>Reporter note: {report.note}</small>}
        <footer><button className="btn btn-primary" onClick={() => void resolve(report, "hide_content")}>Hide content</button><button className="btn" onClick={() => void resolve(report, "dismiss")}>Dismiss</button></footer>
      </article>)}
      {reports.length === 0 && <p className="ops-empty">No open reports.</p>}
    </section>}

    {!loading && tab === "freshness" && <section className="ops-account-table" aria-label="Route freshness">
      <header><span>Route</span><span>Status</span><span>Last verified</span><span>Action</span></header>
      {routes.map((route) => <article key={route.id}>
        <div><b>{route.name}</b><small>{route.source ?? "community"}</small></div>
        <div><span className={`mod-pill ${route.verificationStatus ?? "unverified"}`}>{(route.verificationStatus ?? "unverified").replace("_", " ")}</span></div>
        <time>{route.verifiedAt ? when(route.verifiedAt) : "Never"}</time>
        <div><button className="btn" onClick={() => void verify(route, route.verificationStatus === "field_verified" ? "unverified" : "field_verified")}>{route.verificationStatus === "field_verified" ? "Clear verification" : "Mark field verified"}</button></div>
      </article>)}
    </section>}

    {!loading && tab === "audit" && <section className="ops-account-table" aria-label="Audit trail">
      <header><span>When</span><span>Action</span><span>Target</span><span>Detail</span></header>
      {audit.map((event) => <article key={event.id}>
        <time>{when(event.occurredAt)}</time><div><b>{event.action}</b><small>actor {event.actorId ?? "system"} · {event.actorRole ?? "n/a"}</small></div>
        <div>{event.targetType} {event.targetId ?? ""}</div><small className="mod-detail">{JSON.stringify(event.detail)}</small>
      </article>)}
      {audit.length === 0 && <p className="ops-empty">No decisions recorded yet.</p>}
    </section>}
  </div>;
}
