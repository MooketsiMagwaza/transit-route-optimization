// lib/api-client.ts
// ─────────────────────────────────────────────
// Frontend HTTP utilities. Named api-client.ts to avoid
// conflicting with the existing backend lib/api.ts.
//
// FastAPI service URL. Override this value for hosted environments.
// ─────────────────────────────────────────────
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window === "undefined" ? null : window.localStorage.getItem("tsela_admin_token");
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options?.headers },
    ...options,
  });
  if (res.status === 401 || res.status === 403) {
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.assign(new URL("/login", window.location.origin).toString());
    }
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
  name: string;
  description?: string | null;
  createdAt: string;
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

export interface AdminOverview {
  accounts: number;
  activeApiKeys: number;
  requests24h: number;
  firingAlerts: number;
  usagePaths: Array<{ path: string; requests: number }>;
  grafanaUrl: string;
  prometheusUrl: string;
}

export interface AdminAccount {
  id: number;
  email: string;
  displayName: string;
  createdAt: string;
  apiKeyCount: number;
  activeApiKeyCount: number;
  requestCount: number;
  lastRequestAt: string | null;
}

export interface GrafanaNotification {
  id: number;
  state: string;
  severity: string;
  title: string;
  message: string | null;
  dashboardUrl: string | null;
  createdAt: string;
}

export interface AdminSystemMetrics {
  apiUp: boolean | null;
  apiMemoryBytes: number | null;
  apiCpuCores: number | null;
  apiOpenFds: number | null;
  requestP95Seconds: number | null;
  errorRatePercent: number | null;
  databaseUp: boolean | null;
  databaseMemoryBytes: number | null;
  databaseSizeBytes: number | null;
  databaseConnections: number | null;
  databaseCacheHitPercent: number | null;
  prometheusReachable: boolean;
  collectedAt: string;
}

export interface HandbookPageSummary {
  slug: string;
  title: string;
  group: string;
  summary: string;
  source: string;
}

export interface HandbookPage extends HandbookPageSummary {
  markdown: string;
  updatedAt: string;
}

// ── API methods ──────────────────────────────────────────────────────────────
export const apiClient = {
  routes: {
    list: () => request<Route[]>("/api/routes"),
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
  health: {
    check: () => request<ApiHealth>("/api/health", { cache: "no-store" }),
  },
  admin: {
    overview: () => request<AdminOverview>("/api/admin/overview", { cache: "no-store" }),
    system: () => request<AdminSystemMetrics>("/api/admin/system", { cache: "no-store" }),
    accounts: () => request<AdminAccount[]>("/api/admin/accounts", { cache: "no-store" }),
    notifications: () => request<GrafanaNotification[]>("/api/admin/notifications", { cache: "no-store" }),
  },
  handbook: {
    index: () => request<HandbookPageSummary[]>("/api/admin/handbook", { cache: "no-store" }),
    page: (slug: string) =>
      request<HandbookPage>(`/api/admin/handbook/${encodeURIComponent(slug)}`, { cache: "no-store" }),
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
