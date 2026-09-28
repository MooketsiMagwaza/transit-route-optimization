# Tsela

![Tsela marketing homepage showing the route-first product experience](docs/assets/screenshots/marketing-home.jpg)

A Gaborone-first platform for finding your way around an informal transit network that, until now, only lived in people's heads. Tsela turns the combi routes locals already know into a searchable map: pick a place, get real road-following directions, see where to board and where to ask the driver to stop.

**Tsela** is the working public brand (pending domain, local-language, and trademark checks). The repository's older TransitOS name remains only in a few internal documents while they are migrated. Under the hood this is a five-surface platform — marketing site, rider app, operations dashboard, developer API, and an authenticated docs portal — backed by FastAPI and a PostGIS-routed PostgreSQL database.

## Why this exists

Gaborone's combis run understood, repeatable corridors, but that knowledge is local and informal. Ask "which combi gets me near the mall, and where do I get off?" and there's usually no map to answer it — just word of mouth. Tsela makes that shared local knowledge visible and searchable: a rider picks an origin and destination and gets real combi options with a road-following route; a field operator can record a corridor by walking or riding it; community reports add current fare and crowding context; and the same API is open to anyone who wants to build on top of it.

It's also a working example of building a small platform properly: separate deployable surfaces instead of one tangled app, an API that's actually documented (not just annotated), sessions that get verified server-side rather than trusted on cookie presence, and honest docs about what's production-ready versus scaffolded.

## Product gallery

These are real 1440×960 captures from the authenticated local Compose stack on 19 September 2026—not mockups. The [capture manifest](docs/assets/screenshots/manifest.json) records every included route and final URL. Run `node scripts/capture-readme-gallery.cjs` while the stack is healthy to refresh the gallery. Developer-documentation images stay excluded until the split and reskin have had a design review; run the capture with `INCLUDE_DOCS=true` afterwards.

### Rider experience

| Home | Plan a trip |
| --- | --- |
| ![Rider home with profile, trip entry, bookmarks, and recent routes](docs/assets/screenshots/rider-home.jpg) | ![Map-first trip planner](docs/assets/screenshots/rider-plan.jpg) |

<details>
<summary><strong>All 10 rider pages</strong></summary>

| Pathfinder | Explore routes |
| --- | --- |
| ![Journey pathfinder](docs/assets/screenshots/rider-pathfinder.jpg) | ![Searchable route map](docs/assets/screenshots/rider-routes.jpg) |

| Live route | Community |
| --- | --- |
| ![GPS-assisted live route guidance](docs/assets/screenshots/rider-live-route.jpg) | ![Authenticated community board](docs/assets/screenshots/rider-community.jpg) |

| Guide | Account login |
| --- | --- |
| ![Rider guide](docs/assets/screenshots/rider-guide.jpg) | ![Rider account login](docs/assets/screenshots/rider-login.jpg) |

| Account recovery | Password reset |
| --- | --- |
| ![Rider account recovery](docs/assets/screenshots/rider-recover.jpg) | ![Rider password reset](docs/assets/screenshots/rider-reset.jpg) |

</details>

### Operations dashboard

| Platform home | Observability and alerts |
| --- | --- |
| ![Operations dashboard with CPU, memory, database, latency, and alert health](docs/assets/screenshots/admin-dashboard.jpg) | ![Prometheus and Grafana observability view](docs/assets/screenshots/admin-observability.jpg) |

<details>
<summary><strong>All 6 operations pages</strong></summary>

| Restricted sign-in | Routes |
| --- | --- |
| ![Administrator sign-in](docs/assets/screenshots/admin-login.jpg) | ![Route operations list](docs/assets/screenshots/admin-routes.jpg) |

| Route editor | Accounts |
| --- | --- |
| ![Road-aligned route editor](docs/assets/screenshots/admin-route-detail.jpg) | ![Account and access visibility](docs/assets/screenshots/admin-accounts.jpg) |

</details>

### Marketing, trust, and build blog

| Product | Developers |
| --- | --- |
| ![Tsela product services](docs/assets/screenshots/marketing-services.jpg) | ![Tsela developer platform](docs/assets/screenshots/marketing-developers.jpg) |

<details>
<summary><strong>All 12 marketing pages</strong></summary>

| About | Brand assets |
| --- | --- |
| ![About Tsela](docs/assets/screenshots/marketing-company.jpg) | ![Tsela brand and downloadable icon page](docs/assets/screenshots/marketing-brand.jpg) |

| Build blog | Road-aligned routes article |
| --- | --- |
| ![Markdown-backed build blog](docs/assets/screenshots/marketing-journal.jpg) | ![Road-aligned routes development article](docs/assets/screenshots/marketing-journal-road-aligned-routes.jpg) |

| Rider-home article | Privacy policy |
| --- | --- |
| ![Rider home development article](docs/assets/screenshots/marketing-journal-rider-home.jpg) | ![Privacy policy](docs/assets/screenshots/marketing-privacy.jpg) |

| Terms of service | Refund policy |
| --- | --- |
| ![Terms of service](docs/assets/screenshots/marketing-terms.jpg) | ![Refund policy](docs/assets/screenshots/marketing-refunds.jpg) |

| Cookie policy | Marketing home |
| --- | --- |
| ![Cookie policy](docs/assets/screenshots/marketing-cookies.jpg) | ![Marketing home](docs/assets/screenshots/marketing-home.jpg) |

</details>

## Documentation

- [Demo credentials & endpoints](docs/DEMO_CREDENTIALS.md) — every URL, the demo account, first API call
- [Architecture](ARCHITECTURE.md) — system boundaries, request/data flows, and production gaps
- [Documentation index](docs/README.md) — complete reading map
- [Contributing](CONTRIBUTING.md) — setup, route evidence, code standards, and pull-request expectations
- [Code of Conduct](CODE_OF_CONDUCT.md) — community standards for this project
- [Security](SECURITY.md) — existing controls, injection defenses, and launch requirements
- [Security architecture](docs/SECURITY_ARCHITECTURE.md) — SSRF, JSON boundaries, roles, cost caps, and automated checks
- [Data model](docs/DATA_MODEL.md) — entity catalog, relationships, stable identity, timestamps, and deletion policy
- [System design playbook](docs/SYSTEM_DESIGN_PLAYBOOK.md) — scaling triggers, jobs, reliability patterns, and tracing
- [UX standards](docs/UX_STANDARDS.md) — adaptive hierarchy, loading, offline, motion, accessibility, and consent
- [API gateway](docs/API_GATEWAY.md) — public URLs, endpoints, payloads, and status behavior
- [Backend](docs/BACKEND.md) — FastAPI, persistence, migrations, pathfinding, and optimization internals
- [Frontend and UI](docs/FRONTEND.md) — pages, interaction patterns, visual system, and client data flow
- [Application user guide](docs/USER_GUIDE.md) — rider, operator, map, and health workflows
- [Gaborone starter data](docs/SEED_DATA.md) — seeded corridors, coordinates, provenance, and accuracy limits
- [Product vision](docs/PRODUCT_VISION.md) — five product surfaces, rider UX, field capture, community data, USSD, and partner integrations
- [Authentication decision](docs/AUTH_DECISION.md) — Supabase, Better Auth, and Google trade-offs
- [Production architecture](docs/PRODUCTION_ARCHITECTURE.md) — deployment topology, data flows, availability, and honest readiness status
- [Backup and disaster recovery](docs/BACKUP_AND_DISASTER_RECOVERY.md) — replicas, WAL, 04:00 tar archives, PITR, and restore drills
- [Object storage](docs/OBJECT_STORAGE.md) — S3-compatible uploads, signed URLs, validation, and retention
- [Production authentication](docs/PRODUCTION_AUTH.md) — self-hosted Supabase Auth, Google OAuth, JWT, and migration path
- [Operations integrations](docs/INTEGRATIONS_AND_WORK_MANAGEMENT.md) — Grafana notifications and OpenProject as a self-hosted Jira alternative
- [Launch checklist](docs/LAUNCH_CHECKLIST.md) — the evidence required before this can be called production-ready
- [Work-order register](docs/WORK_ORDER.md) — current execution state, acceptance criteria, rest point, and resume procedure
- [Work-order audit](docs/WORK_ORDER_AUDIT.md) — maps the full product conversation to completed, blocked, and outstanding work
- [Route trust and moderation](docs/TRUST_AND_MODERATION.md) — provenance, review pipeline, reports, and the append-only audit trail
- [Privacy operations](docs/PRIVACY_OPERATIONS.md) — data inventory, consent, export, deletion, retention, and third parties
- [Release runbook](docs/RELEASE_RUNBOOK.md) — pinned images, health-gated deploys, rollback, launch records, and drills
- [Brand direction](docs/BRAND.md) — Tsela naming and draft visual system
- [Cost and capacity](docs/COST_AND_CAPACITY.md) — hourly limits and measurement model
- [Community service area](docs/SERVICE_AREA.md) — contribution bounds, enforcement, and polygon migration note

## Stack

- **Web:** Next.js, React, and TypeScript
- **API:** FastAPI and Pydantic
- **Database:** PostgreSQL, PostGIS, and pgRouting
- **Data access:** SQLAlchemy, GeoAlchemy2, and Alembic
- **Optimization:** Google OR-Tools
- **Observability:** Prometheus, Grafana, Tempo, OpenTelemetry, and PostgreSQL Exporter
- **Runtime:** Docker Compose locally; Kubernetes production scaffold

### Optional profiles

```bash
docker compose --profile identity up -d    # self-hosted Supabase Auth (GoTrue) and a local mail inbox on :8025
docker compose --profile recovery up -d    # streaming standby, S3-compatible store, encrypted backups
ops/backups/run-drills.sh all              # restore and point-in-time recovery drills, with JSON evidence
```

The primary always archives WAL, and a scheduler container runs the lifecycle jobs (cleanup, retention, key-expiry audit, route freshness, account purge). Prometheus rules are delivered through Grafana into the operations dashboard's alert feed. See the [release runbook](docs/RELEASE_RUNBOOK.md) for production.

The Next.js applications are web clients only. FastAPI owns all HTTP APIs and database access.

## Services

The development stack now exposes the five product surfaces independently:

| Service | URL | Purpose |
| --- | --- | --- |
| Marketing | http://localhost:3000 | Focused homepage plus Services, Developers, and Company routes |
| Operations dashboard | http://localhost:3001 | Administrator-only route operations, account visibility, alerts, and system health |
| Rider app | http://localhost:3002 | Map-first route discovery, journey planning, and rider guide |
| Developer portal | http://localhost:3003 | Public sign-in/registration landing; live session required for API docs and console |
| API | http://localhost:8000 | FastAPI application; redirects to the developer portal |
| PostgreSQL | localhost:6000 | PostGIS and pgRouting database |
| Prometheus | http://localhost:9090 | Metrics storage, service health, and alert evaluation |
| Grafana | http://localhost:3004 | Operational dashboards and alert investigation |
| Mailpit (`identity` profile) | http://localhost:8025 | Local inbox for confirmation and recovery email |
| Object store console (`recovery` profile) | http://localhost:9001 | Private buckets for uploads and encrypted backups |

FastAPI's generated Swagger, ReDoc, and OpenAPI HTTP routes are disabled by default. The protected Fumadocs reference is the developer documentation surface. Enable `API_DOCS_ENABLED=true` only for an isolated development environment where public interactive docs are acceptable.

## Product hierarchy

```text
Marketing
├── Services
├── Developers
├── Build journal (Markdown-backed)
└── Company

Rider
├── Home (profile, bookmarks, recent routes)
├── Plan a trip
├── Explore routes
│   └── Live trip guidance
├── Community (account required)
│   ├── Add a route
│   └── Search, tips, and discussion
└── Guide

Developer
├── Documentation
├── Account / recovery
└── Console (keys, quota, cost estimate)
```

## Run the complete stack

Everything runs in Docker. There is nothing else to install: no Node, no Python, no database.

### What you need

- **Docker Desktop** (Windows, macOS) or **Docker Engine with the Compose plugin** (Linux). On Windows use the WSL 2 backend.
- **Memory:** give Docker at least 6 GB (Docker Desktop, Settings, Resources). The Next.js builds are memory-hungry.
- **Free ports** on your machine: 3000, 3001, 3002, 3003, 3004, 8000, 9090 and 6000. Docker reports `port is already allocated` if one is taken.
- **Internet access** for the first build (base images and packages) and for the map background, which uses OpenStreetMap tiles.

### Start it

```bash
git clone https://github.com/MooketsiMagwaza/transit-route-optimization.git
cd transit-route-optimization
docker compose up -d --build
```

The first run builds five images, which takes several minutes (longer on a slow machine). After that, database migrations and the Gaborone seed run by themselves before the API accepts traffic, which adds about a minute on a fresh database. Later starts take under a minute and need no `--build`.

Check that it is up. Every service should say `healthy` or `Up`:

```bash
docker compose ps
```

Then open these in a browser on the same machine:

| What | Address |
| --- | --- |
| Marketing site | http://localhost:3000 |
| Rider app | http://localhost:3002 |
| Operations dashboard | http://localhost:3001 (sign in with the demo account) |
| Developer portal and API guide | http://localhost:3003 (sign in with the demo account) |
| API health | http://localhost:8000/api/health |
| Grafana | http://localhost:3004 (`admin` / `admin`) |
| Prometheus | http://localhost:9090 |

The demo account is `demo@tsela.local` with password `TselaDemo2026!`. It exists only in this local Compose stack. See [docs/DEMO_CREDENTIALS.md](docs/DEMO_CREDENTIALS.md).

Every port is bound to `127.0.0.1`, and the apps are built with `localhost` addresses. The stack is meant to be opened on the machine that runs it. Opening it from another device on the network is not supported.

### Stop, restart, reset

```bash
docker compose stop
```

Pauses everything and keeps your data. `docker compose up -d` starts it again.

```bash
docker compose down
```

Removes the containers and keeps the data (database, Grafana, Prometheus).

```bash
docker compose down -v
```

Removes the containers **and all data**, for a completely clean slate. The next `docker compose up -d` builds a fresh database and reseeds it.

After pulling new changes, rebuild with `docker compose up -d --build`.

### Optional: real sign-up and two-factor sign-in

The default stack signs you in with the demo account. To try real sign-up, email confirmation, password recovery and authenticator-app codes through a self-hosted identity provider (Supabase Auth), add the `identity` profile. Confirmation emails land in a local inbox at http://localhost:8025.

```bash
docker compose --profile identity up -d
```

`python scripts/smoke_identity.py` (needs Python 3) walks the whole flow against it (sign-up, email, sign-in, recovery, two-factor, logout, deletion) and cleans up after itself.

### Troubleshooting

| Symptom | What to do |
| --- | --- |
| `port is already allocated` | Something else is using that port. Stop it, or stop the old copy of this stack with `docker compose down`. |
| A service is `unhealthy` or `Restarting` | Look at its log with `docker compose logs <service>` (for example `api`). The first start migrates and seeds the database, and the API is given up to three minutes before it is called unhealthy. |
| `container name ... is already in use` | Container names are fixed, so only one copy of the stack can exist at a time. Run `docker compose down` in the other copy first. |
| The build is very slow, or fails with out-of-memory errors | Raise Docker's memory limit to 6 GB or more and run the command again. |
| Pages load but data does not, or the browser says `NetworkError` | Open the sites through `localhost` (or `127.0.0.1`) on the machine running Docker. The API only accepts those origins. |
| The map background is blank | It uses the public OpenStreetMap tile servers and needs internet access. |
| Start over from nothing | `docker compose down -v`, then `docker compose up -d --build`. |

### Not working yet

- The `recovery` and `drill` profiles (backups, standby database, object storage). Their pinned MinIO images no longer exist; see [docs/WORK_ORDER.md](docs/WORK_ORDER.md). Photo uploads need that object store, so they are unavailable until it is replaced.
- **Apple Silicon Macs are untested.** The database image is `postgis/postgis`. If the `db` container will not start on an M-series Mac, add `platform: linux/amd64` under `db` in `compose.yaml`.

## Local development

Start PostgreSQL:

```bash
docker compose up -d db
```

Start the API with Python 3.12 through 3.14:

```bash
cd api
python -m venv .venv
.venv/Scripts/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
```

Start the marketing site in another terminal:

```bash
cd marketing
npm ci
npm run dev
```

Start the operations dashboard:

```bash
cd admin
npm ci
npm run dev
```

Start the rider application:

```bash
cd rider
npm ci
npm run dev
```

Start the documentation site:

```bash
cd docs-site
npm ci
npm run dev
```

The web client defaults to `http://localhost:8000`. Override it with `NEXT_PUBLIC_API_BASE` when needed.

## Repository layout

```text
api/        FastAPI, SQLAlchemy, Alembic, routing, and OR-Tools
marketing/  Public Next.js marketing site (port 3000)
admin/      Private Next.js operations dashboard (port 3001)
rider/      Public Next.js rider application (port 3002)
docs-site/  Next.js developer portal, authenticated Fumadocs reference, and access console
database/   PostgreSQL/PostGIS/pgRouting image
observability/ Prometheus rules plus provisioned Grafana dashboards and alerts
ops/        Reviewed production-operation examples for backup and recovery
docs/       API gateway, backend, and frontend guides
compose.yaml
```

The former combined client remains in `web/` temporarily as migration reference and is not started by Compose.

## Safety and accuracy boundary

Route geometry follows roads when the routing service succeeds, but a road-following line does not verify current operation. Live-trip guidance is a browser-only distance estimate and must not be treated as safety-critical navigation. Fares, service times, directions, and stop order need recent local confirmation.

## Contributing

Bug reports, route corrections, and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for setup and expectations, and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for how we treat each other while doing it.

## License

MIT — see [LICENSE](LICENSE).
