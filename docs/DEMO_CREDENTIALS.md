# Demo credentials & endpoints (local Compose only)

Everything below is `compose.yaml`'s local dev stack only. Demo mode is
disabled by default outside it (see `docs/AUTH_DECISION.md`). Start the
stack first:

```bash
docker compose up -d --build
```

## Demo account

| Field | Value |
| --- | --- |
| Email | `demo@tsela.local` |
| Password | `TselaDemo2026!` |

Sign in at the developer portal (http://localhost:3003) to access the protected
Fumadocs reference and developer console. The same local demo account is seeded
with the `admin` role and can be used on the separate operations sign-in page at
http://localhost:3001/login. The API checks that role on every admin request;
hiding navigation is never treated as authorization.

## URLs

| Surface | URL | Port |
| --- | --- | --- |
| Marketing homepage | http://localhost:3000 | 3000 |
| Operations dashboard (`admin`) | http://localhost:3001 | 3001 |
| Rider app | http://localhost:3002 | 3002 |
| Developer portal / docs (`docs-site`, Fumadocs) | http://localhost:3003 | 3003 |
| API (`api`, FastAPI) | http://localhost:8000 | 8000 |
| Grafana | http://localhost:3004 | 3004 |
| Prometheus | http://localhost:9090 | 9090 |

## Optional local profiles

```bash
docker compose --profile identity up -d      # self-hosted Supabase Auth and a local mail inbox
docker compose --profile recovery up -d      # standby, object store, encrypted backups
```

- Mailpit (the inbox that receives confirmation and recovery email) is at http://localhost:8025.
- The object store console is at http://localhost:9001 (`MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`, defaults in `compose.yaml`, local only).
- Put `AUTH_PUBLIC_URL=http://localhost:9999` in a git-ignored `.env` and rebuild the web images to make sign-in use the provider. Without it the apps keep the local demo sign-in.
- Grant an operator: `docker compose exec api python -m app.cli grant-role you@example.com admin`.
- The developer portal's sandbox uses `DOCS_SANDBOX_API_KEY`, defaulting to a published local value that production refuses.

## Grafana local login

| Field | Value |
| --- | --- |
| Username | `admin` |
| Password | `GRAFANA_ADMIN_PASSWORD`, defaulting to `admin` for local Compose only |

Start it with `docker compose --profile observability up -d`. Anonymous access and public sign-up are disabled. Set a non-default `GRAFANA_ADMIN_PASSWORD` before using any shared environment; production credentials belong in a secret manager, not this file.

## API

`http://localhost:8000` directly (no gateway in front of it in dev). Auth is
an `X-API-Key` header — create a key from the developer portal's console
once signed in (`http://localhost:3003`, "Create an API key"), or use the
demo account to try it without one. Full endpoint-by-endpoint reference,
including request/response examples, is the developer portal itself — it's
a real Fumadocs reference site (dedicated page per endpoint), not a single
long page.

A first request once you have a key:

```bash
curl -H "X-API-Key: $TSELA_API_KEY" "http://localhost:8000/v1/routes"
```

## Scope

These values are convenience credentials for the local Compose stack. They are not valid production credentials and must never be copied into a deployed environment.
