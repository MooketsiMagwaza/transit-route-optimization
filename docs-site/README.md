# Developer documentation

The Next.js developer portal on port 3003 is the **public API guide**: a Fumadocs site for external developers. A valid developer session is required to open it. FastAPI's Swagger, ReDoc, and OpenAPI HTTP routes are disabled by default.

It contains only supported public contracts:

- five guides: getting started, authentication, errors and retries, rate limits and quotas, and versioning with a changelog;
- one page per `/v1` endpoint, generated from `content/api-catalog.json`. Each page states access, scope, quota cost, and idempotency; every parameter with constraints and defaults; cURL and server-side JavaScript examples; the response with a field table and the shared headers; every error status with retry guidance; and pagination, caching, timeout, and freshness notes;
- a **Try it** panel that sends a real read-only request through `/api/sandbox` using a dedicated low-privilege key that exists only in the server's environment (`DOCS_SANDBOX_API_KEY`). It rebuilds the request from the catalog, allows only `GET`, allowlists parameters, rate limits per session, and redacts the key;
- the developer console for keys, usage, data export, and account deletion.

Engineering and operations material is not here. It lives in the administrator-only handbook in the operations app, which the API serves only to administrators.

Adding an endpoint: implement the route, add its entry to `content/api-catalog.json`, and run both test suites. `npm test` checks the entry against the page contract; `pytest api/tests/test_public_contract_docs.py` compares the catalog with the real OpenAPI document and fails on any drift. The page, navigation, and search index are generated from the same file.

## Design

Fumadocs supplies the sidebar, mobile drawer, search, table of contents, breadcrumbs, code blocks, copy controls, and theme switching. Tsela is applied through design tokens for both themes (`app/globals.css`) and a few restrained components: warm off-white surfaces, black structure, cobalt actions, lime accents, rounded corners, and crisp borders. There is no scroll choreography and motion is limited to short state changes that respect reduced-motion settings.

The demo account (`demo@tsela.local`) is local Compose only, controlled by `NEXT_PUBLIC_DEMO_MODE`; leave it `false` in production. The session lives in an HttpOnly cookie and developer API calls go through same-origin route handlers. Sign-in uses the local demo flow unless `NEXT_PUBLIC_AUTH_URL` points at the identity provider.

```bash
npm ci
npm run dev
npm test
npm run lint
npm run build
```

See [../docs/API_GATEWAY.md](../docs/API_GATEWAY.md) and [../docs/WORK_ORDER.md](../docs/WORK_ORDER.md).
