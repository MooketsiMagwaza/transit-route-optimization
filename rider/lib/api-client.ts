// lib/api-client.ts
// ─────────────────────────────────────────────
// Frontend HTTP utilities. Named api-client.ts to avoid
// conflicting with the existing backend lib/api.ts.
//
// FastAPI service URL. Override this value for hosted environments.
// ─────────────────────────────────────────────
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
export const apiBase = BASE;

async function request<T>(path: string, options?: RequestInit, token?: string | null): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...options,
  });
  if (typeof window !== "undefined" && res.headers.get("x-tsela-served-from") === "cache") {
    window.dispatchEvent(new CustomEvent("tsela:stale", { detail: { cachedAt: res.headers.get("x-tsela-cached-at") } }));
  }
  if (!res.ok) {
    const payload: unknown = await res.json().catch(() => null);
    const errorMessage =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : null;
    const detailMessage =
      typeof payload === "object" &&
      payload !== null &&
      "detail" in payload &&
      typeof payload.detail === "string"
        ? payload.detail
        : null;
    throw new Error(errorMessage ?? detailMessage ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface Route {
  id: number;
  publicId?: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt?: string;
  source?: string;
  verificationStatus?: "unverified" | "field_verified" | "stale";
  verifiedAt?: string | null;
}

export interface Node {
  id: number;
  routeId: number;
  label: string;
  name: string;
  lat: number;
  long: number;
  orderNum: number;
}

export interface PathfindResult {
  path: Node[];
  totalTimeMinutes: number;
  breakdown: { walking: number; bus: number; waiting: number };
  transfers: number;
  walkingDistanceMeters: number;
}

export interface PathfindNoRoute {
  message: string;
}

export interface RouteOptimizationResult {
  routeId: number;
  orderedNodeIds: number[];
  originalDistanceMeters: number;
  optimizedDistanceMeters: number;
  savingsPercent: number;
  applied: boolean;
}

export interface NearbyRoute {
  route: Route;
  nearestStop: Node;
  distanceMeters: number;
}

export interface NearbyRoutesResult {
  location: { lat: number; long: number };
  radiusMeters: number;
  routes: NearbyRoute[];
}

export interface RouteGeometry {
  routeId: number;
  coordinates: [number, number][];
  distanceMeters: number | null;
  durationMinutes: number | null;
  geometrySource: "osrm" | "stop_sequence";
  isRoadAligned: boolean;
  warning: string | null;
}

export interface NetworkRoute {
  route: Route;
  stops: Node[];
  geometry: RouteGeometry;
}

export interface ContributionPreview {
  coordinates: [number, number][];
  distanceMeters: number;
  durationMinutes: number;
  geometrySource: "osrm";
}

export interface RouteContribution {
  id: number;
  name: string;
  status: "pending_review";
  createdAt: string;
}

export interface DashboardData {
  routes: Route[];
  nodes: Node[];
  totals?: { routes: number; nodes: number };
}

export type HealthStatus = "healthy" | "degraded";

export interface ApiHealth {
  status: HealthStatus;
  checkedAt: string;
  uptimeSeconds: number;
  services: {
    api: { status: HealthStatus };
    database: { status: HealthStatus; latencyMs: number | null };
    postgis: { status: HealthStatus; version: string | null };
    pgrouting?: { status: HealthStatus; version: string | null };
  };
}

// ── API methods ──────────────────────────────────────────────────────────────
export const apiClient = {
  routes: {
    list: () => request<Route[]>("/api/routes"),
    network: () => request<NetworkRoute[]>("/api/routes/network"),
    get: (id: number) => request<Route>(`/api/routes/${id}`),
    create: (body: { name: string; description?: string }) =>
      request<Route>("/api/routes", { method: "POST", body: JSON.stringify(body) }),
    createMapped: (body: {
      name: string;
      description?: string;
      stops: { name: string; lat: number; long: number; orderNum: number }[];
    }) =>
      request<{ route: Route; stops: Node[] }>("/api/routes/map", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Partial<{ name: string; description: string | null }>) =>
      request<Route>(`/api/routes/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    delete: (id: number) =>
      request<{ message: string }>(`/api/routes/${id}`, { method: "DELETE" }),
    optimize: (id: number, apply = false) =>
      request<RouteOptimizationResult>(`/api/routes/${id}/optimize`, {
        method: "POST",
        body: JSON.stringify({ apply }),
      }),
    nearby: (lat: number, long: number, radiusMeters = 750) =>
      request<NearbyRoutesResult>(
        `/api/routes/nearby?lat=${encodeURIComponent(lat)}&long=${encodeURIComponent(long)}&radiusMeters=${encodeURIComponent(radiusMeters)}`,
        { cache: "no-store" }
      ),
    geometry: (routeId: number) =>
      request<RouteGeometry>(`/api/routes/${routeId}/geometry`),
  },
  nodes: {
    list: (routeId: number) => request<Node[]>(`/api/routes/${routeId}/nodes`),
    get: (routeId: number, nodeId: number) =>
      request<Node>(`/api/routes/${routeId}/nodes/${nodeId}`),
    create: (
      routeId: number,
      body: { lat: number; long: number; name: string; orderNum: number }
    ) =>
      request<{ message: string }>(`/api/routes/${routeId}/nodes`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (
      routeId: number,
      nodeId: number,
      body: Partial<{ lat: number; long: number; name: string; orderNum: number }>
    ) =>
      request<{ message: string }>(`/api/routes/${routeId}/nodes/${nodeId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (routeId: number, nodeId: number) =>
      request<{ message: string }>(`/api/routes/${routeId}/nodes/${nodeId}`, {
        method: "DELETE",
      }),
  },
  pathfind: {
    find: (body: {
      origin: { lat: number; long: number };
      destination: { lat: number; long: number };
    }) =>
      request<PathfindResult | PathfindNoRoute>("/api/pathfind", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  dashboard: {
    // Fixed: was "/dashboard/db" (missing /api prefix)
    dbView: (page = 1, limit = 10) =>
      request<DashboardData>(`/api/dashboard/db?page=${page}&limit=${limit}`),
  },
  community: {
    preview: (waypoints: { lat: number; long: number }[], token?: string | null) =>
      request<ContributionPreview>("/api/community/routes/preview", {
        method: "POST",
        body: JSON.stringify({ waypoints }),
      }, token),
    contribute: (body: {
      name: string;
      notes?: string;
      contributorAlias?: string;
      waypoints: { lat: number; long: number }[];
    }, token?: string | null) => request<RouteContribution>("/api/community/routes", {
      method: "POST",
      body: JSON.stringify(body),
    }, token),
  },
  health: {
    check: () => request<ApiHealth>("/api/health", { cache: "no-store" }),
  },
};

// ── Flat alias ───────────────────────────────────────────────────────────────
// Allows components to `import { api } from "@/lib/apiClient"` without
// needing to rename every import across the codebase.
export const api = {
  getRoutes: () => apiClient.routes.list(),
  createRoute: (name: string) => apiClient.routes.create({ name }),
  getRouteNodes: (routeId: number) => apiClient.nodes.list(routeId),
  createNode: (
    routeId: number,
    data: { name: string; lat: number; long: number; orderNum: number }
  ) => apiClient.nodes.create(routeId, data),
  updateNode: (
    routeId: number,
    nodeId: number,
    data: { name: string; lat: number; long: number; orderNum: number }
  ) => apiClient.nodes.update(routeId, nodeId, data),
  deleteNode: (routeId: number, nodeId: number) =>
    apiClient.nodes.delete(routeId, nodeId),
};
