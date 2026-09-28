# Current work orders and continuation handoff

- **Snapshot date:** 2026-09-28
- **Repository baseline:** branch `feat/work-orders-local-completion`, merged into `main` on 2026-09-28 through a pull request (209 files). Before the merge `main` was the 2026-09-19 reconciliation.
- **Merge policy:** make reviewable commits on a feature branch, then squash-merge one tested change into `main`. Never add co-author trailers. This branch deviates from "one work order per branch": it carries WO-06 to WO-21 as one commit per work order so the owner can review or split them; squash by commit rather than as a single change. The owner asked for the branch to be merged as it stood on 2026-09-28; it went in as a rebase merge, so every commit is kept on `main` and each work order can still be reviewed or reverted on its own.

**Product state:** strong local foundation with most of the production controls now written and locally tested; **not approved for production**. Several controls have unit tests but have not yet run against real infrastructure (see [What has and has not been run](#what-has-and-has-not-been-run)).

This is the source of truth for what is finished, what is still active, what is blocked by external decisions, and where to stop safely. The deeper design documents explain each subsystem; this file records execution state.

## What has and has not been run

Run on 2026-09-28, in this order, after the code was written:

| Check | Result |
| --- | --- |
| API: Ruff | Clean |
| API: pytest | **105 tests pass** (was 26). New coverage: docs/API drift, identity and MFA, handbook authorization, throttling, soft delete, write protection, contribution review, uploads signing, scheduler windows, account deletion and purge |
| Developer portal: catalog contract tests, ESLint, production build | Pass (6 tests) |
| Marketing, rider, admin: ESLint and production builds | Pass |
| Rider: geometry and map-sync tests, type-check | Pass (11 tests) |
| Compose file validates for every profile (default, `identity`, `recovery`, `drill`) | Pass |
| Default stack built and launched on Docker; seven new migrations applied to a database that already held data | Pass; WAL archiving confirmed on |
| Live end-to-end smoke test (`scripts/smoke_e2e.py`) | **53 of 53**; removes what it creates, verified by row counts before and after |
| Identity flow against real GoTrue and Mailpit (`scripts/smoke_identity.py`) | **26 of 26**, with operator MFA off and on: sign-up, confirmation email, sign-in, API call, recovery, TOTP and aal2, the MFA gate, logout revocation, deletion |
| Map route lines in the production Docker builds (rider Explore, operations route page) | Drawn; worker file served with `200` from both apps |
| Real-browser page loads (rider, operations, developer portal) against the running stack | No failed requests |
| Portal and operations screens checked visually, light and dark | Reviewed by the implementer; **no design review yet** |

**Not yet run** (each is in [Remaining work](#remaining-work)): the `recovery` profile and both drills, uploads against a real object store, the alert-delivery drill, the capacity baseline, an automated accessibility scan, `scripts/release.sh` and `rollback.sh`, the Trivy and `npm audit` re-scan, and the README gallery regeneration.

## Findings during verification

Real problems found and fixed while running the above, kept here because each one was invisible to the earlier baseline:

1. **Alerts were never delivered.** Prometheus evaluated `alerts.yml` but had no Alertmanager, so only the single Grafana-native rule could reach the admin feed. Prometheus now forwards to Grafana's Alertmanager. *Delivery is configured but not yet proven; the alert drill is what proves it.*
2. **Route and stop write endpoints accepted anonymous requests** on the internal `/api` surface. They now require an administrator, with tests for `401` and `403`.
3. **Map route lines never drew, on the rider and operations sites.** The basemap showed but no route line, stop, or contribution drawing appeared. Root cause: MapLibre 6 finds its web worker with `new URL("./maplibre-gl-worker.mjs", import.meta.url)`. After Next bundles the library that URL points at a hashed chunk and answers 404 with an HTML page, so the worker never starts. Raster tiles need no worker and looked fine; everything drawn from GeoJSON silently vanished. Fix: `scripts/copy-maplibre-worker.mjs` copies the worker into `public/maplibre/` before `dev` and `build`, and `lib/maplibre-setup.ts` calls `setWorkerUrl()`; every map component in both apps imports it. **The same fix covers the operations route map and route builder.** A second, real but smaller bug was found on the way: the rider maps gated updates on `isStyleLoaded()` and one-shot `load` callbacks that captured empty initial props, so newer data could be overwritten. All four rider maps now share one tested helper (`rider/lib/map-sync.js`). Route colours were also too close to the basemap, so the palette is now higher contrast and lines have a white casing. *Verified in the dev server (all seven routes draw); production-build verification is in the next entry of Remaining work.*
4. **The API rejected `127.0.0.1` origins** while the apps call `localhost`, so a page opened via `127.0.0.1` showed "NetworkError" everywhere. The local Compose allow-list now includes both.
5. **My smoke test polluted the local database** with routes, accounts, and posts that then appeared in the rider app. The data was removed. *The smoke test should live in the repository and clean up after itself; see Remaining work.*
6. A raw control-character regex in the sandbox route, a hook-ordering lint error, and non-portable Node test globs were fixed.
7. **The scheduler container reported "unhealthy" while every job succeeded.** It inherited the API image's health check, which probes an HTTP port the scheduler does not serve. It now touches a heartbeat file every tick and Compose checks the file's age.
8. **GoTrue's first failure was confirmed** as `role "postgres" does not exist`, as hypothesised. The bootstrap now creates the Supabase roles (`NOLOGIN`, no privileges) and GoTrue starts and migrates.
9. **A deleted person's still-valid token recreated their account.** Found by the identity flow: deletion cleared the provider ID, so a JWT issued minutes earlier (they last 12 hours) looked like a brand-new sign-in and created a fresh account. Deleting the account had also lost the ID the purge job would need to retry a provider outage. Now the anonymised row keeps the provider ID as a tombstone, the lookup includes deleted rows so the token is refused with `403`, and the purge job asks the provider again before dropping a row (reported as `deferred`). Two tests cover it.
10. **The recovery profile cannot start: the pinned MinIO images no longer exist.** `minio/minio` and `minio/mc` at the pinned tags fail to pull from Docker Hub, and the same tags are not on Quay either (MinIO stopped publishing its community images). Nothing that needs the object store has been run: uploads, off-host backup copies, the restore drills. This needs an owner decision on the replacement (a Chainguard or Bitnami-legacy MinIO build, or another S3-compatible store such as SeaweedFS, Garage, or RustFS); `objects-init` uses `mc admin` commands that are MinIO-specific and would change with the store.
11. **Security scan findings on the pull request.** The backup runner image ran as root (Trivy DS-0002); it now runs as UID 999, matching the database's `postgres` user that owns the WAL archive. CodeQL flagged the release-environment checker for logging a constant whose name contains `SECRET`; it is renamed. CodeQL's `py/weak-sensitive-data-hashing` alert on `hash_token` (HMAC-SHA256 with a server secret over 256-bit random tokens) was already open on `main` and is a false positive for tokens that are not passwords; it should be dismissed as such by the owner rather than changed.

## Work-order register

| ID | Priority | State | Work order | Done when |
| --- | --- | --- | --- | --- |
| WO-01 | P0 | Complete (redesign delivered in WO-15) | Repair the developer portal and documentation information architecture | One professional Fumadocs theme; public access landing only; `/reference/*` and `/console` require a live session; overview stays inside docs; public reference contains only credentialed `/v1` endpoints |
| WO-02 | P0 | Complete locally | Restore the operations dashboard hierarchy | Durable desktop sidebar, compact mobile rail, real home metrics, account and route views, and Grafana notification triage all build and work with the admin boundary |
| WO-03 | P0 | Local stack works; **alert delivery not proven** | Make local observability usable | Grafana is provisioned with the Tsela home dashboard, Prometheus and Tempo links are correct, local credentials are documented, **every alert rule reaches the admin notification feed** (finding 1), and all services are healthy |
| WO-04 | P0 | Complete for current repository scope; re-scan pending | Close runtime and container security findings | Non-root images, read-only Kubernetes filesystems, resource limits, restricted public API ingress, keyed token digests, production secret validation, and high/critical filesystem scan are clean |
| WO-05 | P1 | Complete | Clear dependency automation clutter | Old bot PRs and branches removed; monthly grouped updates; one open update per package area; `web` included in coverage |
| WO-06 | P0 | **Proven against a running GoTrue locally.** Google sign-in still needs owner credentials | Replace local identity with production Supabase Auth plus Google | Issuer, audience, and signature validation, account mapping, MFA for operators, recovery and revocation are tested against a running provider (done: `scripts/smoke_identity.py`); Google works with real OAuth credentials and callback URLs (not done) |
| WO-07 | P0 | **Implemented; drills not yet run** | Provision recoverable production data | WAL archive, standby, encrypted off-host backups, a *passing* clean-server restore and point-in-time recovery drill, private uploads, and retention and deletion jobs, with evidence files |
| WO-08 | P1 | **Complete and verified** (unit and live) | Complete the public API request lifecycle | Shared limits, scopes, idempotency where required, final status/latency/correlation accounting, audit export, version policy, and bounded telemetry dimensions. Measured per-request cost still needs the capacity baseline |
| WO-09 | P1 | **Data and rider side implemented; geometry verification is human work** | Establish route and navigation trust | Provenance and freshness fields, trust labels, off-route and approximate-location warnings, admin verification, and decay to `stale` are in place. Not done: any route being *field verified* (a person riding it), a self-hosted road router, and field tests of live guidance |
| WO-10 | P1 | **Complete and verified locally** | Complete community moderation | Reports, auto-hide, moderation queue, append-only audit trail, duplicate/shape/stop validation, and publish approval work end to end. Not done: an upload control in the rider app |
| WO-11 | P1 | **Baseline only** | Finish product-quality UX | Focus states, reduced motion, touch targets, skip links, and offline states are in. Still needed: an automated accessibility scan, keyboard walkthroughs, slow-network and low-end-device tests, and a design review of hierarchy (see WO-20 and WO-22) |
| WO-12 | P0 before launch | **Implemented, never rehearsed** | Build the production release system | Pinned images, secrets preflight, TLS edge, health-gated deploy with automatic rollback, launch record, restore and alert drills, capacity baseline. Blue/green was deliberately not adopted for a single host; see the [release runbook](RELEASE_RUNBOOK.md) |
| WO-13 | P1 | **Implemented and verified locally; legal review outstanding** | Complete privacy and compliance operations | Consent records, export, deletion with grace period, retention jobs, and a third-party inventory exist. Not done: legal review, operator identity and privacy contact, and replacing the public OpenStreetMap tile server |
| WO-14 | P2 | Ongoing | Contributor and architecture documentation | Keep app READMEs, diagrams, decisions, work orders, screenshots, API examples, recovery procedures and contributor instructions synchronized with behavior |
| WO-15 | P1 | **Complete and verified locally; design review pending** | Split the internal handbook from the public API documentation and reskin Fumadocs | See [WO-15](#wo-15--documentation-boundary-and-reference-redesign) |
| WO-16 | P1 | **Implemented and verified locally; delivery and backup jobs unproven** | Operate scheduled maintenance and lifecycle automation | Idempotent scheduler ran the jobs live and exports last-success and last-failure metrics; alert rules exist. Not proven: that a failed or missed run reaches the admin feed, and the backup-verify job (needs the recovery profile) |
| WO-17 | P0 before URL fetches or paid integrations | **Implemented and verified locally** | Close adversarial request and abuse-cost paths | JSON/body limits, SSRF-safe outbound requests, tenant checks, admin-only writes, and shared database rate limits are tested. Spend caps do not apply yet because there are no paid integrations; add them with the first one |
| WO-18 | P1 | **Implemented and verified locally** | Establish durable data-governance invariants | Public IDs, database-maintained `updatedAt`, recoverable deletion, ownership checks, append-only audit, and an expand-then-contract migration rule exist. Remaining: integer IDs are still in URL paths, and indexes should be checked against real traffic |
| WO-19 | P2, evidence-gated | Decision framework complete; implementation deferred by design | Add asynchronous and real-time architecture only where measured | Nothing to build until a measured trigger exists |
| WO-20 | P1 | **Site rebuilt; home page needs a second pass (owner feedback)** | Finish marketing, brand and search readiness | See [WO-20 and the home page](#wo-20--marketing-and-the-home-page) |
| WO-21 | P1 | **Implemented; not field tested** | Complete installable PWA and field-offline behavior | Icons, manifests, a narrowly scoped service worker, stale-data notice, and an idempotent offline queue exist. Not done: verification in a real browser (install prompt, offline reload), and low-connectivity field tests |
| WO-22 | P1 | **New, planned** | One design system across marketing, rider, operations, and docs | See [WO-22](#wo-22--one-design-system) |

The [conversation-to-work-order audit](WORK_ORDER_AUDIT.md) maps the full product discussion to these entries and records the few items that were previously only implicit.

## WO-15 — documentation boundary and reference redesign

**State: complete and verified locally. Design review of both themes is the only open acceptance item.**

### Goal

Two clearly owned products:

1. **Developer API guide:** an authenticated Fumadocs site for external developers containing only supported public contracts: five guides and one page per `/v1` endpoint.
2. **Internal handbook:** engineering and operations material in the operations app, served only to administrators by the API from an allowlisted manifest.

### Endpoint-page contract (implemented)

Every endpoint page states method, path, purpose, stability, scope, quota cost, and idempotency; every parameter with type, constraints, default, and example; cURL and server-side JavaScript examples; the response with a field table and shared headers; every error status with retry guidance; and pagination, caching, timeout, and freshness notes. A **Try it** panel sends a real read-only request with a dedicated low-privilege key held only in the server environment, rebuilding the request from the catalog, allowing only `GET`, rate limiting per session, and redacting the key. `docs-site/content/api-catalog.json` is the single source; `api/tests/test_public_contract_docs.py` compares it with the generated OpenAPI document.

### Acceptance tests

| Criterion | Status |
| --- | --- |
| External developer accounts cannot open the handbook; administrators can; the API rechecks server-side | **Pass**: `403` for developers and `401` anonymous, tested and confirmed live |
| Internal subjects are absent from the public navigation and search index | **Pass**: enforced by a portal test that scans the guides, and by a handbook test that scans the portal source |
| Every published `/v1` endpoint has exactly one canonical page meeting the contract | **Pass**: contract tests on both sides |
| Undocumented public routes and documented-but-missing routes fail CI | **Pass**: drift test; CI runs it |
| Light and dark themes meet WCAG AA contrast; sidebar, search, table of contents, deep links, keyboard navigation, mobile drawer, and code-copy controls pass interaction tests | **Partly**: tokens were chosen for AA and both themes render correctly; no automated contrast or keyboard test has run yet |
| Screenshots stay out of the root README until design review approves both themes | **Held**: run `INCLUDE_DOCS=true node scripts/capture-readme-gallery.cjs` after review |

## Completed repair slice from `feat/developer-portal-repair`

The merged repair slice was intentionally limited to a coherent set of foundations:

1. **Developer portal:** replace accumulated custom shells with the Fumadocs layout; keep sign-up/sign-in public and make documentation plus console protected; remove internal preview endpoints from the public reference; add search, pagination and limits to the documented route listing.
2. **API boundary:** publish only `/v1` through the production ingress; keep internal `/api` routes out of the public contract; hash session and API-key tokens with HMAC-SHA256 using a deployment secret; reject the local secret in production; explicitly disable secure cookies only for localhost Compose so the production-mode Next.js server remains usable over local HTTP.
3. **Admin and observability:** restore the sidebar, expose local Grafana access guidance, provision a useful home dashboard and repair Tempo service-map linkage.
4. **Runtime hardening:** non-root containers, health checks, Kubernetes security contexts, read-only root filesystems and resource limits.
5. **Dependency hygiene:** upgrade the vulnerable legacy MapLibre package and replace Dependabot PR-per-package noise with grouped monthly updates.

Do not treat that merged foundation as Supabase integration, production database provisioning, field-verified route coverage, or a production Kubernetes installation. Those remain separate work orders with different credentials and failure modes.

## WO-20 — marketing and the home page

**Owner feedback: the home page is the biggest problem.** The site was rebuilt on one calm stylesheet and the structural defects (nested frames, no mobile menu, cramped type, a banner covering half a phone, dead code) are fixed. The home page still does not do its job. This is a critique of what ships, from the screenshots, and a brief for the second pass. Nothing here is implemented yet.

### What is wrong

1. **The hero shows an invented map with invented numbers.** The right-hand panel is a generic drawn street grid captioned "Illustrative example", with "26 min · 1 combi · P8 est.". The strongest thing Tsela has is the real product: a real Gaborone map, real corridors, place-first planning. None of it appears. An invented fare also contradicts the product's own honesty rule that fares and times need local confirmation.
2. **The page promises an action it does not offer.** The promise is "choose where you are and where you're going", yet the hero has no input. The visitor must click through to another app to try it.
3. **One message, four times.** "Plan a trip" appears in the header, the hero, the first gateway card, and the closing banner. "How it works" (four cards) and "Four ways in" (four cards) use the same layout back to back. The result reads as a template: no hierarchy, no rhythm, no moment of emphasis.
4. **It speaks to the wrong audience.** The primary audience is a Gaborone rider. Half the page addresses developers and operators ("Read the API" and "Get an API key" are the same audience; "Explore services" repeats the navigation).
5. **The proof is slogans.** "Road aligned", "Local first", "One clear answer" say nothing checkable. The site has real, checkable facts it never shows: how many routes and stops are mapped, and the trust model (unverified, field verified, stale).
6. **Empty space without purpose.** About 140 px of blank canvas under the hero, and section widths and alignments that shift down the page.
7. **It matches neither reference.** The rider app is bold: thick black outlines, hard offset shadows, a blue offset frame, a lime dock. The marketing site is calmer. It reads as neither the rider's confident identity nor a quiet brochure.

### Brief for the second pass

- **Hero, left:** keep the headline. Add a real "Where to?" field that opens the rider planner with the destination filled in, and a secondary "Use my location".
- **Hero, right:** a real screenshot of the rider app in a phone frame, showing a real route on the real map, captured by a script from the running stack so it never goes stale. No invented fare.
- **Live proof strip:** routes and stops mapped, how many are field verified (today: none, and saying so plainly is on-brand), and when the data last changed, fetched from the API with revalidation.
- **How it works:** one row of three steps (places, compare, ride), each with a real screenshot crop, replacing two text card grids.
- **Trust:** show the actual trust notice component and explain what "field verified" means and how it decays. This is the differentiator against a generic transit app.
- **For builders:** a single compact band with the API's first request and one link to the guide, not two cards.
- **Closing call to action:** smaller, and not a fourth repeat of the hero.
- **Remove:** the "Four ways in" grid and the "Explore services" card; move the blog to the footer and navigation.
- **Constraints:** stays static and fast (no map library on the marketing site), one primary action above the fold, readable at 390 px, reduced-motion respected.

### Acceptance

A first-time visitor can say what Tsela does and take the first step within five seconds (test with five people from Gaborone, not five developers); no invented numbers; the page has one primary action above the fold; largest contentful paint under 2.5 s on simulated slow 4G; every screenshot is generated from the product; contrast passes.

### Open decisions for the owner

- **Direction.** Recommendation below in WO-22: keep the bold identity for expressive moments (marketing hero, rider home) and use a calmer density for reading surfaces. Confirm or overrule.
- **Real screenshots on the marketing site.** They will show real (community-sourced, unverified) routes. Confirm that is acceptable to show publicly.
- **Final name, mark, and icon approval** remain the owner's; the mark is now consistent across favicon, app icons, and the downloadable SVG.

## WO-22 — one design system

**Why it exists.** Evidence from the four apps:

- **No shared source.** Marketing, rider, operations, and docs each maintain their own tokens by hand. Blue is `#445cff` on marketing, `#3a52e8` in the portal, and `#3b6bff` in the rider's base layer. Page canvas is `#f4f2e9` on marketing, `#f5f6fa` in the rider and admin bases, and `#dededb` or `#e9e7df` in later layers.
- **Layered stylesheets.** The rider and operations stylesheets are the same accretion the marketing site had: several generations of `:root` definitions on top of each other (the rider defines `--surface-0` twice and `--radius-sm` twice with different values, the operations app three times), so which value wins depends on file order.
- **Three visual densities are already in use without being named:** expressive (marketing hero, rider home), standard (app screens), and reading (docs, legal, blog, handbook).

**Recommendation.** One tokens file (colour, type scale, radius, shadow, spacing, motion) in `design/`, generated into each app's stylesheet by a script, with a CI check that fails when they drift, exactly as the API catalog test does for the docs. Name the three densities and say where each applies: expressive for first impressions, standard for tasks, reading for long text. Collapse each app's layered stylesheet into one, starting with the rider because riders are the primary users. Move the display type scale, buttons, cards, labels, and the trust and report components into shared definitions so a change is made once.

**Done when:** one tokens source with a passing drift check; each app's stylesheet has a single `:root`; the same button, card, and label look identical on all four surfaces; both themes on the portal and handbook use the same tokens; a design review has approved marketing, rider home, and the portal side by side.

## Remaining work

Ordered by what unblocks what. Each item names the risk I expect, so the next session starts with a hypothesis.

1. ~~Identity in Docker~~ **Done.** GoTrue starts after the role bootstrap fix.
2. ~~Prove the identity flow~~ **Done**, including the `email_verified` assumption (GoTrue does put it in `user_metadata`, so linking an existing local account by verified email works). It found finding 9. Still open: Google, which needs the owner's OAuth client ID, secret, and callback URLs.
3. **Recovery profile and drills.** First replace the MinIO images (finding 10; needs an owner decision). Then start `objects`, `recovery-init`, `db-standby`, and `backup`, confirm the now non-root backup runner can write `/backups` and prune `/wal_archive`, run `ops/backups/run-drills.sh all`, and keep the evidence. Risks: standby replication depends on the mounted `pg_hba.conf`; `pg_restore` may need a role or extension adjustment. Then: uploads against the real store (the first attempt at a hand-written SigV4 signature usually needs one correction, most likely around the signed content-length header), the alert-delivery drill (this also proves finding 1), the capacity baseline, and an automated accessibility scan (axe-core over headless Edge) of every public page in both themes.
4. ~~Tidy and commit~~ **Done.** The map fix, identity fix, scheduler health, and smoke tests are committed separately; the map fix is confirmed in the production Docker builds; the portal already serves its CSS fixes. All of it is on `main`.
5. **Marketing home page and design system** (WO-20, WO-22): agree the direction with the owner, then build the home page second pass first, then the shared tokens.
6. **Then, and only then:** run Trivy and `npm audit`, regenerate the README gallery, and decide with the owner how to merge (see below).

## Adequate rest point

The project is safe to pause when all of the following are true. Ticked items were true on 2026-09-28.

- [x] The API tests pass, Ruff is clean, and portal/admin/marketing/rider lint and production builds pass.
- [x] `docker compose` reports API, database, docs, admin, rider, marketing, scheduler, Grafana, Prometheus and Tempo running or healthy.
- [ ] A clean unauthenticated request to `/reference` and `/console` redirects to `/?next=…#access`. *(behaviour unchanged; re-check after the portal rebuild)*
- [x] An authenticated local demo session opens the overview, endpoint reference, sandbox, and console without changing UI shells.
- [ ] Grafana opens at `http://localhost:3004`, uses the provisioned Tsela dashboard, and **a Prometheus alert reaches the admin feed** (alert drill).
- [ ] The high/critical repository security scan passes or any finding is recorded here with owner and reason.
- [ ] The restore and point-in-time recovery drills have passed and their evidence is kept.
- [x] The work is committed in logical slices and merged to `main` with its history kept. No second person has reviewed it.
- [ ] `main` is pushed, the working tree is clean, and no Dependabot PR or remote bot branch remains open.

At that point, stop all optional local services if machine resources matter:

```bash
docker compose --profile observability stop grafana prometheus tempo postgres-exporter
```

This preserves volumes. Do not use `down -v`; that would remove local data.

## Resume procedure

1. Read this file, [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md), and the design document for the item you are taking.
2. `git switch main`, pull, and confirm the working tree is clean. Take a new branch for the next work order.
3. Start only required services with `docker compose up -d`; add `--profile identity` or `--profile recovery` only for those items.
4. Reproduce the last check that passed before changing code: `pytest api/tests`, the four `npm run lint && npm run build`, and the smoke test.
5. Implement and verify in small commits, update this register and the relevant runbook.
6. Merge only with the owner's say-so.

## Recommended next phase

Start with **Remaining work 1 to 3**: they turn "written and unit-tested" into "run for real", which is where the previous pass found four real defects. Then the home page (WO-20). Blocked on the owner: Google OAuth credentials and callback domains, an SMTP provider, legal review, the operator's identity and privacy contact, and the design direction decision above.

Do not begin Kubernetes orchestration or multi-replica scaling. The single-host release path is written; rehearse it first.

## Launch gate

The application is launchable only when every P0 item above and every required line in [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) is complete or accepted as a dated risk by the owner. Local Compose credentials, self-signed assumptions, example backup configurations and untested cloud manifests are not production evidence. A control that has only been unit-tested is not evidence either: the launch record must cite a drill or a live check.
