"use client";
// PLACE AT: app/routes/[routeId]/page.tsx
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiClient, Route, Node, RouteOptimizationResult } from "@/lib/api-client";
import { RouteMap } from "./route-map";

const ROUTE_COLORS = ["#111111", "#7d3cff", "#94b82f", "#656560", "#4f6d7a", "#a44a3f", "#5d3a9b", "#477a55"];
const getRouteColor = (id: number) => ROUTE_COLORS[id % ROUTE_COLORS.length];

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

interface EditState {
  name: string;
  lat: string;
  long: string;
  orderNum: string;
}

export default function RouteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = Number(params.routeId);

  const [route, setRoute]           = useState<Route | null>(null);
  const [nodes, setNodes]           = useState<Node[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [loadingNodes, setLoadingNodes] = useState(true);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");

  // Add stop form
  const [nodeName, setNodeName]     = useState("");
  const [lat, setLat]               = useState("");
  const [long, setLong]             = useState("");
  const [orderNum, setOrderNum]     = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [editState, setEditState]   = useState<EditState>({ name: "", lat: "", long: "", orderNum: "" });
  const [saving, setSaving]         = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimization, setOptimization] = useState<RouteOptimizationResult | null>(null);
  const [editingRoute, setEditingRoute] = useState(false);
  const [routeDraft, setRouteDraft] = useState({ name: "", description: "" });
  const [savingRoute, setSavingRoute] = useState(false);
  const [confirmRouteDelete, setConfirmRouteDelete] = useState(false);

  const loadRoute = useCallback(async () => {
    try { setRoute(await apiClient.routes.get(routeId)); }
    catch { setError("Route not found."); }
    finally { setLoadingRoute(false); }
  }, [routeId]);

  const loadNodes = useCallback(async () => {
    try { setNodes(await apiClient.nodes.list(routeId)); }
    catch { setError("Failed to load stops."); }
    finally { setLoadingNodes(false); }
  }, [routeId]);

  useEffect(() => { loadRoute(); loadNodes(); }, [loadRoute, loadNodes]);

  function flashSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 4000);
  }

  // ── Add stop ──────────────────────────────────────────────────────────────
  async function handleAddNode(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      await apiClient.nodes.create(routeId, {
        name: nodeName.trim(),
        lat: parseFloat(lat),
        long: parseFloat(long),
        orderNum: parseInt(orderNum),
      });
      flashSuccess("Stop added!");
      setNodeName(""); setLat(""); setLong(""); setOrderNum("");
      await loadNodes();
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Failed to add stop."));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Start editing ─────────────────────────────────────────────────────────
  function startEdit(node: Node) {
    setEditingId(node.id);
    setConfirmDeleteId(null);
    setEditState({
      name: node.name,
      lat: String(node.lat),
      long: String(node.long),
      orderNum: String(node.orderNum),
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  // ── Save edit ─────────────────────────────────────────────────────────────
  async function handleSaveEdit(nodeId: number) {
    try {
      setSaving(true);
      setError("");
      await apiClient.nodes.update(routeId, nodeId, {
        name: editState.name.trim(),
        lat: parseFloat(editState.lat),
        long: parseFloat(editState.long),
        orderNum: parseInt(editState.orderNum),
      });
      flashSuccess("Stop updated!");
      setEditingId(null);
      await loadNodes();
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Failed to update stop."));
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(nodeId: number) {
    try {
      setDeletingId(nodeId);
      setError("");
      await apiClient.nodes.delete(routeId, nodeId);
      flashSuccess("Stop deleted.");
      setConfirmDeleteId(null);
      await loadNodes();
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Failed to delete stop."));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleOptimize(apply: boolean) {
    try {
      setOptimizing(true);
      setError("");
      const result = await apiClient.routes.optimize(routeId, apply);
      setOptimization(result);
      if (apply) {
        flashSuccess("Optimized stop order applied.");
        await loadNodes();
      }
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Failed to optimize this route."));
    } finally {
      setOptimizing(false);
    }
  }

  function startRouteEdit() {
    if (!route) return;
    setRouteDraft({ name: route.name, description: route.description ?? "" });
    setEditingRoute(true);
    setConfirmRouteDelete(false);
  }

  async function handleRouteUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSavingRoute(true);
      setError("");
      const updated = await apiClient.routes.update(routeId, {
        name: routeDraft.name.trim(),
        description: routeDraft.description.trim() || null,
      });
      setRoute(updated);
      setEditingRoute(false);
      flashSuccess("Route details updated.");
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Failed to update this route."));
    } finally {
      setSavingRoute(false);
    }
  }

  async function handleRouteDelete() {
    try {
      setSavingRoute(true);
      setError("");
      await apiClient.routes.delete(routeId);
      router.push("/routes");
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Failed to delete this route."));
      setSavingRoute(false);
    }
  }

  const color = getRouteColor(routeId);

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link href="/routes">Routes</Link>
        <span className="breadcrumb-sep">›</span>
        <span>{loadingRoute ? "…" : (route?.name ?? "Unknown")}</span>
      </div>

      {/* Header */}
      <div className="page-header" style={{ borderLeft: `4px solid ${color}`, paddingLeft: 16, display: "flex", justifyContent: "space-between", gap: 20 }}>
        <div>
          <span className="page-eyebrow" style={{ background: color + "18", color }}>
            Route #{routeId}
          </span>
          <h1 className="page-title">{loadingRoute ? "Loading…" : (route?.name ?? "Not Found")}</h1>
          {route?.description && <p className="page-subtitle">{route.description}</p>}
        </div>
        {route && (
          <button className="btn btn-secondary btn-sm" onClick={startRouteEdit} style={{ alignSelf: "flex-start" }}>
            Edit route
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-mark">!</span>
          {error}
        </div>
      )}

      {/* Stats */}
      {!loadingRoute && route && (
        <div className="grid-3" style={{ marginBottom: 28 }}>
          <div className="stat-card">
            <div className="stat-icon blue">🆔</div>
            <div className="stat-value">#{route.id}</div>
            <div className="stat-label">Route ID</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">ST</div>
            <div className="stat-value">{loadingNodes ? "…" : nodes.length}</div>
            <div className="stat-label">Total Stops</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber">DT</div>
            <div className="stat-value" style={{ fontSize: "1.15rem" }}>
              {new Date(route.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
            <div className="stat-label">Created</div>
          </div>
        </div>
      )}

      {editingRoute && route && (
        <div className="card" style={{ marginBottom: 28 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Route Settings</div>
              <div className="card-subtitle">Update metadata or remove this corridor</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditingRoute(false)}>Close</button>
          </div>
          <form onSubmit={handleRouteUpdate}>
            <div className="input-group">
              <div className="form-group">
                <label className="form-label" htmlFor="route-edit-name">Route name</label>
                <input
                  id="route-edit-name"
                  className="form-input"
                  value={routeDraft.name}
                  onChange={(event) => setRouteDraft((draft) => ({ ...draft, name: event.target.value }))}
                  maxLength={120}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="route-edit-description">Description</label>
                <input
                  id="route-edit-description"
                  className="form-input"
                  value={routeDraft.description}
                  onChange={(event) => setRouteDraft((draft) => ({ ...draft, description: event.target.value }))}
                  maxLength={500}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                {!confirmRouteDelete ? (
                  <button type="button" className="btn btn-secondary btn-sm" style={{ color: "#b91c1c" }} onClick={() => setConfirmRouteDelete(true)}>
                    Delete route
                  </button>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.8rem", color: "#b91c1c" }}>Delete route and every stop?</span>
                    <button type="button" className="btn btn-sm" style={{ background: "#ef4444", color: "white" }} onClick={handleRouteDelete} disabled={savingRoute}>
                      Confirm delete
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmRouteDelete(false)}>Cancel</button>
                  </div>
                )}
              </div>
              <button className="btn btn-primary" type="submit" disabled={savingRoute || !routeDraft.name.trim()}>
                {savingRoute ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {!loadingNodes && nodes.length >= 2 && (
        <div className="card" style={{ marginBottom: 28, borderLeft: "3px solid var(--purple)" }}>
          <div className="card-header" style={{ marginBottom: optimization ? 18 : 0 }}>
            <div>
              <div className="card-title">Optimize Stop Order</div>
              <div className="card-subtitle">Use OR-Tools to minimize distance while keeping the first and last stops fixed</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-secondary btn-sm" disabled={optimizing} onClick={() => handleOptimize(false)}>
                Preview
              </button>
              <button className="btn btn-primary btn-sm" disabled={optimizing} onClick={() => handleOptimize(true)}>
                {optimizing ? "Optimizing…" : "Optimize & Apply"}
              </button>
            </div>
          </div>

          {optimization && (
            <div className="grid-3">
              <div>
                <div className="form-label">Original distance</div>
                <div className="td-primary">{(optimization.originalDistanceMeters / 1000).toFixed(2)} km</div>
              </div>
              <div>
                <div className="form-label">Optimized distance</div>
                <div className="td-primary">{(optimization.optimizedDistanceMeters / 1000).toFixed(2)} km</div>
              </div>
              <div>
                <div className="form-label">Estimated saving</div>
                <div className="td-primary" style={{ color: "#15803d" }}>{optimization.savingsPercent.toFixed(1)}%</div>
              </div>
            </div>
          )}
        </div>
      )}

      {!loadingNodes && <RouteMap nodes={nodes} color={color} />}

      <div className="grid-2" style={{ alignItems: "start" }}>

        {/* ── Stop List ── */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Stops</div>
              <div className="card-subtitle">Ordered stop sequence for this route</div>
            </div>
            {!loadingNodes && (
              <span className="badge" style={{ background: color + "18", color }}>
                {nodes.length} stops
              </span>
            )}
          </div>

          {loadingNodes && (
            <div className="loading-row">
              <div className="spinner" /> Loading stops…
            </div>
          )}

          {!loadingNodes && nodes.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">ST</div>
              <div className="empty-state-title">No stops yet</div>
              <div className="empty-state-desc">Add the first stop to this route using the form</div>
            </div>
          )}

          {success && (
            <div className="alert alert-success" style={{ marginBottom: 12 }}>
              <span className="alert-mark">OK</span>
              {success}
            </div>
          )}

          <div className="stop-list">
            {nodes.map((n, i) => {
              const isFirst   = i === 0;
              const isLast    = i === nodes.length - 1;
              const isEditing = editingId === n.id;
              const isDeleting = deletingId === n.id;
              const isConfirmingDelete = confirmDeleteId === n.id;

              return (
                <div key={n.id} className="stop-item" style={{ flexDirection: "column", gap: 0, padding: 0 }}>
                  {/* Top row: connector + content + actions */}
                  <div style={{ display: "flex", alignItems: "flex-start", padding: "12px 14px", gap: 0 }}>
                    {/* Connector */}
                    <div className="stop-connector">
                      <div
                        className={`stop-dot ${isFirst ? "first" : isLast ? "last" : "middle"}`}
                        style={!isFirst && !isLast ? { background: color, borderColor: color } : {}}
                      />
                      {!isLast && <div className="stop-line" />}
                    </div>

                    {/* Body */}
                    <div className="stop-body" style={{ flex: 1 }}>
                      {isEditing ? (
                        /* ── Inline edit form ── */
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <input
                            className="form-input"
                            style={{ fontSize: "0.82rem", padding: "5px 9px" }}
                            placeholder="Stop name"
                            value={editState.name}
                            onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
                          />
                          <div style={{ display: "flex", gap: 6 }}>
                            <input
                              className="form-input"
                              style={{ fontSize: "0.78rem", padding: "5px 9px", flex: 1 }}
                              type="number"
                              step="any"
                              placeholder="Latitude"
                              value={editState.lat}
                              onChange={(e) => setEditState((s) => ({ ...s, lat: e.target.value }))}
                            />
                            <input
                              className="form-input"
                              style={{ fontSize: "0.78rem", padding: "5px 9px", flex: 1 }}
                              type="number"
                              step="any"
                              placeholder="Longitude"
                              value={editState.long}
                              onChange={(e) => setEditState((s) => ({ ...s, long: e.target.value }))}
                            />
                            <input
                              className="form-input"
                              style={{ fontSize: "0.78rem", padding: "5px 9px", width: 64 }}
                              type="number"
                              min="1"
                              placeholder="Order"
                              value={editState.orderNum}
                              onChange={(e) => setEditState((s) => ({ ...s, orderNum: e.target.value }))}
                            />
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                            <button
                              className="btn btn-primary"
                              style={{ fontSize: "0.78rem", padding: "5px 14px" }}
                              disabled={saving || !editState.name.trim()}
                              onClick={() => handleSaveEdit(n.id)}
                            >
                              {saving ? "Saving…" : "Save"}
                            </button>
                            <button
                              className="btn"
                              style={{ fontSize: "0.78rem", padding: "5px 14px", background: "var(--surface-1)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                              onClick={cancelEdit}
                              disabled={saving}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div className="stop-name">{n.name}</div>
                            {isFirst && <span className="badge badge-green" style={{ fontSize: "0.65rem" }}>Start</span>}
                            {isLast  && <span className="badge badge-red"   style={{ fontSize: "0.65rem" }}>End</span>}
                          </div>
                          <div className="stop-coords">{n.lat.toFixed(5)}, {n.long.toFixed(5)}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>{n.label}</div>
                        </>
                      )}
                    </div>

                    {/* Right side: order badge + actions */}
                    {!isEditing && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8, flexShrink: 0 }}>
                        <span className="badge badge-gray">#{n.orderNum}</span>
                        <button
                          title="Edit stop"
                          onClick={() => startEdit(n)}
                          style={{
                            background: "none",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            padding: "3px 7px",
                            cursor: "pointer",
                            color: "var(--text-muted)",
                            fontSize: "0.78rem",
                            lineHeight: 1,
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-1)"; (e.currentTarget as HTMLButtonElement).style.color = color; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
                        >
                          Edit
                        </button>
                        <button
                          title="Delete stop"
                          disabled={isDeleting}
                          onClick={() => setConfirmDeleteId(isConfirmingDelete ? null : n.id)}
                          style={{
                            background: isConfirmingDelete ? "#fee2e2" : "none",
                            border: `1px solid ${isConfirmingDelete ? "#fca5a5" : "var(--border)"}`,
                            borderRadius: "var(--radius-sm)",
                            padding: "3px 7px",
                            cursor: "pointer",
                            color: isConfirmingDelete ? "#ef4444" : "var(--text-muted)",
                            fontSize: "0.78rem",
                            lineHeight: 1,
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => { if (!isConfirmingDelete) { (e.currentTarget as HTMLButtonElement).style.background = "#fee2e2"; (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#fca5a5"; } }}
                          onMouseLeave={(e) => { if (!isConfirmingDelete) { (e.currentTarget as HTMLButtonElement).style.background = "none"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; } }}
                        >
                          {isDeleting ? "…" : "Delete"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Delete confirmation banner */}
                  {isConfirmingDelete && !isEditing && (
                    <div style={{
                      margin: "0 14px 12px 14px",
                      background: "#fef2f2",
                      border: "1px solid #fca5a5",
                      borderRadius: "var(--radius-sm)",
                      padding: "9px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}>
                      <span style={{ fontSize: "0.8rem", color: "#b91c1c", fontWeight: 500 }}>
                        Delete <strong>{n.name}</strong>? This cannot be undone.
                      </span>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          className="btn"
                          style={{ fontSize: "0.75rem", padding: "4px 10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
                          disabled={isDeleting}
                          onClick={() => handleDelete(n.id)}
                        >
                          {isDeleting ? "Deleting…" : "Yes, delete"}
                        </button>
                        <button
                          className="btn"
                          style={{ fontSize: "0.75rem", padding: "4px 10px", background: "var(--surface-1)", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Add Stop Form ── */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: 20 }}>
            <div>
              <div className="card-title">Add a Stop</div>
              <div className="card-subtitle">Append a new node to this route</div>
            </div>
            <span className="card-index" aria-hidden="true">Add</span>
          </div>

          <form onSubmit={handleAddNode}>
            <div className="form-group">
              <label className="form-label">Stop Name *</label>
              <input className="form-input" type="text" placeholder="e.g. Central Station"
                value={nodeName} onChange={(e) => setNodeName(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">Coordinates *</label>
              <div className="input-group">
                <div>
                  <input className="form-input" type="number" step="any" placeholder="Latitude"
                    value={lat} onChange={(e) => setLat(e.target.value)} required />
                  <div className="form-hint">e.g. 51.5074</div>
                </div>
                <div>
                  <input className="form-input" type="number" step="any" placeholder="Longitude"
                    value={long} onChange={(e) => setLong(e.target.value)} required />
                  <div className="form-hint">e.g. -0.1278</div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Stop Order *</label>
              <input className="form-input" type="number" min="1" placeholder="e.g. 3"
                value={orderNum} onChange={(e) => setOrderNum(e.target.value)} required />
              <div className="form-hint">Position in the route sequence (1 = first stop)</div>
            </div>

            {/* Label preview */}
            {orderNum && (
              <div style={{ background: "var(--surface-0)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 16,
                display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Auto label:</span>
                <span className="td-mono" style={{ fontSize: "0.82rem", color, fontWeight: 600 }}>
                  ROUTE{routeId}-STOP{orderNum}
                </span>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
              {submitting
                ? <><div className="spinner spinner-sm" style={{ borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.3)" }} /> Adding…</>
                : "Add Stop"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
