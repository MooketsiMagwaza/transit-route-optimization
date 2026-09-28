# TransitOS API gateway

## Protected v1 request

Create a key in the developer console, store it in an environment variable, and send it in a header:

```bash
curl -H "X-API-Key: $TSELA_API_KEY" http://localhost:8000/v1/routes
```

Do not use a query-string credential. URLs are frequently stored by browsers, proxies, access logs, and analytics tools. Missing keys are rejected before a database lookup. Valid keys default to 100 requests per rolling hour plus their monthly quota; `429` responses include `Retry-After`.

Repeated invalid credentials are bounded in process during local development. Production must enforce the same policy in a shared gateway or Redis so it works across replicas.

This guide describes only the public HTTP boundary of TransitOS: where clients connect, which operations are exposed, and the JSON contracts they use. Backend implementation details are in [BACKEND.md](BACKEND.md).

## Entry points

| Surface | Local URL | Use |
| --- | --- | --- |
| Marketing | `http://localhost:3000` | Public mission and platform overview |
| Operations dashboard | `http://localhost:3001` | Route entry, maintenance, optimization, and health UI |
| Rider app | `http://localhost:3002` | Public route finder and rider guide |
| Developer portal | `http://localhost:3003` | Public sign-in/registration; endpoint docs require a live developer session |
| REST API | `http://localhost:8000` | JSON API base URL |

The developer portal's Fumadocs reference and console are protected. FastAPI's generated `/api/docs`, `/api/redoc`, and `/api/openapi` HTTP routes are disabled by default. Enable `API_DOCS_ENABLED=true` only in an isolated development environment; do not expose this bypass on public deployments.

The browser client reads the API base URL from `NEXT_PUBLIC_API_BASE`. The default is `http://localhost:8000`.

## Gateway conventions

- Request and response bodies use JSON and `Content-Type: application/json`.
- Public JSON properties use camelCase, such as `routeId`, `orderNum`, and `createdAt`.
- IDs are positive database-generated integers.
- Coordinates use decimal latitude and longitude in WGS 84 (`EPSG:4326`).
- FastAPI returns validation failures as HTTP `422` with a `detail` array.
- Missing routes or stops return HTTP `404` with a `detail` string.
- Existing `/api` endpoints remain open for the local product clients. `/v1` requires `X-API-Key`, enforces a per-key monthly quota, and records request usage. A production deployment still needs TLS, edge rate limiting, secure cookies, audit retention rules, and abuse monitoring.
- Local CORS permits the four web surfaces on ports 3000 through 3003; configure `CORS_ORIGINS` for other frontends.

## Operations

| Method | Path | Success | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | `200` | Check API, PostgreSQL, PostGIS, and pgRouting health |
| `GET` | `/api/routes` | `200` | List routes; supports `search`, `offset`, and `limit` |
| `GET` | `/api/routes/nearby` | `200` | Find routes with a stop near a pinned coordinate |
| `POST` | `/api/routes` | `201` | Create a route |
| `POST` | `/api/routes/map` | `201` | Atomically create a route and its mapped stop sequence |
| `GET` | `/api/routes/{routeId}` | `200` | Read one route |
| `GET` | `/api/routes/{routeId}/geometry` | `200` | Return a road-aligned route preview with fallback metadata |
| `PATCH` | `/api/routes/{routeId}` | `200` | Update route metadata |
| `DELETE` | `/api/routes/{routeId}` | `200` | Delete a route and its stops |
| `GET` | `/api/routes/{routeId}/nodes` | `200` | List stops in route order |
| `POST` | `/api/routes/{routeId}/nodes` | `201` | Insert a stop and shift later stops |
| `GET` | `/api/routes/{routeId}/nodes/{nodeId}` | `200` | Read one stop |
| `PATCH` | `/api/routes/{routeId}/nodes/{nodeId}` | `200` | Edit or reorder a stop |
| `DELETE` | `/api/routes/{routeId}/nodes/{nodeId}` | `200` | Delete a stop and compact the order |
| `POST` | `/api/routes/{routeId}/optimize` | `200` | Preview or apply an optimized stop order |
| `POST` | `/api/pathfind` | `200` | Find a transfer-aware journey between coordinates |
| `GET` | `/api/dashboard` | `200` | Read paginated dashboard records and totals |
| `POST` | `/api/community/routes/preview` | `200` | Route community waypoints along roads |
| `POST` | `/api/community/routes` | `201` | Store a road-following proposal as `pending_review` |
| `POST` | `/api/developer/register` | `201` | Create a developer account and session |
| `POST` | `/api/developer/login` | `200` | Authenticate a developer account |
| `POST` | `/api/developer/logout` | `204` | Revoke the current developer session |
| `GET/POST` | `/api/developer/keys` | `200/201` | List key metadata or issue a one-time key |
| `GET` | `/api/developer/usage` | `200` | Read monthly quota and endpoint usage |
| `GET` | `/v1/routes` | `200` | Key-protected published route list |
| `GET` | `/v1/routes/{routeId}/geometry` | `200` | Key-protected road geometry |

`GET /api/dashboard/db` remains as an undocumented compatibility alias for the web client.

## Route contracts

Create a route:

```http
POST /api/routes
Content-Type: application/json

{
  "name": "North–South Corridor",
  "description": "Central station to the northern district"
}
```

```json
{
  "id": 1,
  "name": "North–South Corridor",
  "description": "Central station to the northern district",
  "createdAt": "2026-09-07T13:30:19.553Z"
}
```

Route names are required, trimmed, and limited to 120 characters. Descriptions are optional and limited to 500 characters. `PATCH` accepts either field; `name` cannot be `null`.

Create a complete map-drawn route in one transaction:

```http
POST /api/routes/map
Content-Type: application/json

{
  "name": "Tlokweng Express",
  "description": "Community corridor",
  "stops": [
    { "name": "Tlokweng", "lat": -24.6674, "long": 25.9720, "orderNum": 1 },
    { "name": "Riverwalk", "lat": -24.6767, "long": 25.9355, "orderNum": 2 }
  ]
}
```

At least two and at most 200 stops are accepted. The array order becomes the stored route order. The response contains the created `route` and `stops`; a failure rolls back the entire transaction.

List filtering:

```http
GET /api/routes?search=north&offset=0&limit=25
```

`limit` defaults to 100 and is capped at 500.

Find routes passing near a map pin:

```http
GET /api/routes/nearby?lat=-24.6767&long=25.9355&radiusMeters=750
```

The radius accepts `50` through `5000` meters and defaults to `750`. Results contain the route, its nearest matching stop, and the pin-to-stop distance in meters.

## Stop contracts

Create a stop:

```http
POST /api/routes/1/nodes
Content-Type: application/json

{
  "name": "Central Station",
  "lat": -26.2041,
  "long": 28.0473,
  "orderNum": 1
}
```

```json
{
  "message": "Node created successfully",
  "node": {
    "id": 12,
    "routeId": 1,
    "label": "ROUTE1-STOP1",
    "name": "Central Station",
    "lat": -26.2041,
    "long": 28.0473,
    "orderNum": 1
  }
}
```

Latitude must be between `-90` and `90`, longitude between `-180` and `180`, and `orderNum` must be at least `1`. Updating `orderNum` shifts the intervening stops and regenerates route stop labels.

## Optimization contract

```http
POST /api/routes/1/optimize
Content-Type: application/json

{
  "apply": false,
  "timeLimitSeconds": 3
}
```

```json
{
  "routeId": 1,
  "orderedNodeIds": [1, 4, 3, 2, 5],
  "originalDistanceMeters": 14890,
  "optimizedDistanceMeters": 11920,
  "savingsPercent": 19.95,
  "applied": false
}
```

`apply: false` previews the result without changing the database. `apply: true` persists it. The time limit accepts `1` through `30` seconds. The first and last stops stay fixed.

## Pathfinding contract

```http
POST /api/pathfind
Content-Type: application/json

{
  "origin": { "lat": -24.6674, "long": 25.9720 },
  "destination": { "lat": -24.6866, "long": 25.8790 }
}
```

A successful response contains ordered stops, rounded journey time, walking/bus/waiting minutes, transfer count, and walking distance:

```json
{
  "path": [
    {
      "id": 12,
      "routeId": 1,
      "label": "ROUTE1-STOP1",
      "name": "Central Station",
      "lat": -26.2041,
      "long": 28.0473,
      "orderNum": 1
    }
  ],
  "totalTimeMinutes": 31,
  "breakdown": { "walking": 7, "bus": 14, "waiting": 10 },
  "transfers": 1,
  "walkingDistanceMeters": 580
}
```

When no transit journey is reachable within the configured walking range, the API still returns `200`:

```json
{
  "message": "No transit path found within walking range."
}
```

## Dashboard and health contracts

Dashboard pagination uses `page` (default `1`) and `limit` (default `10`, maximum `100`):

```http
GET /api/dashboard?page=1&limit=10
```

The response contains `routes`, `nodes`, and global `totals` for both collections.

Health is deliberately reachable even when the database is unavailable. In that case it returns HTTP `200` with `status: "degraded"`, allowing monitors and the dashboard to display the failing dependency.

## Quick smoke test

```powershell
$api = "http://localhost:8000"
Invoke-RestMethod "$api/api/health"
Invoke-RestMethod "$api/api/routes"
```

## Request lifecycle (implemented)

- **Scopes.** Every API key carries a space-separated scope list. `routes:read` is required by both `/v1` endpoints and is granted to every new key. A key without the scope receives `403`; an unknown scope cannot be required (`require_scope` refuses it at start-up).
- **Shared limits.** Hourly and monthly counts are read from `ApiUsage`, so every API replica enforces the same limits without process-local state. A request is counted only after the key, its scope, and both quotas pass; `401`, `403`, and `429` responses are not counted.
- **Final accounting.** After the response, the admitted row is updated with the final status, latency in milliseconds, and the correlation ID. A row left at status `0` marks a request that was admitted but never finalised (a crash).
- **Headers.** Responses carry `X-Request-ID`, `X-API-Version`, `X-RateLimit-Limit/Remaining/Reset` (rolling hour), and `X-Quota-Limit/Remaining` (calendar month). `Retry-After` on `429` is computed from the real reset time, not a constant.
- **Idempotency.** Every current `/v1` endpoint is a safe `GET`. Idempotency is therefore required only for writes, and the first such write endpoint already exists internally: `POST /api/community/posts` honours an `Idempotency-Key` header and returns the original post for a repeated key. Any future public `POST` must do the same before it ships.
- **Version policy.** The major version is in the path. Within a major version only additions ship (endpoints, optional parameters, response fields). Removing or changing a field, or tightening validation, is a new major version. Preview endpoints may change with 30 days' notice; a deprecated endpoint stays for at least 180 days and returns `Deprecation` and `Sunset` headers. The policy is published on the developer guide's versioning page.
- **Audit export.** `GET /api/admin/usage/export?days=30` (administrators) streams admitted requests as CSV, neutralising spreadsheet formulas in text cells. Secrets are never in it.
- **Bounded telemetry.** Prometheus labels use route templates (`/v1/routes/{route_id}/geometry`), never raw paths, keys, or IDs.
- **Documentation drift.** `docs-site/content/api-catalog.json` is the single source for the endpoint pages. `api/tests/test_public_contract_docs.py` compares it with the generated OpenAPI document and fails CI for an undocumented route, a documented route that does not exist, or a parameter, constraint, field, or error status that differs.
- **Write protection.** Creating, editing, deleting, and optimising routes and stops requires an administrator. Reads stay public.

Cost per request is still an estimate until measured: run `scripts/load-baseline.py` and record the result in [Cost and capacity](COST_AND_CAPACITY.md).
