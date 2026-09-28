# Conversation-to-work-order audit

- **Audit date:** 2026-09-19
- **Scope:** every Tsela/transit-route request in the working conversation
- **Source of execution state:** [`WORK_ORDER.md`](WORK_ORDER.md)
- **Result:** every product request is now mapped to a work order; six areas that were previously implicit are recorded as WO-16 through WO-21

This document is an inventory, not a claim that the product is finished. A local
screen, manifest, test, or configuration proves only that boundary. Production
claims still require the evidence named by the relevant work order and
[`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md).

## Reconciliation summary

### Complete for the current local foundation

- **WO-01:** the developer-portal repair slice established an authenticated
  Fumadocs shell and removed internal preview endpoints from the public contract.
  The final internal/public documentation split remains WO-15.
- **WO-02:** the admin surface has its sidebar, home metrics, account, route and
  observability views.
- **WO-03:** local Prometheus, Grafana and Tempo provisioning, dashboards,
  credentials and admin notification ingestion exist.
- **WO-04:** the tracked runtime/container hardening baseline and current
  high/critical repository scan are clean.
- **WO-05:** the stale Dependabot queue and remote bot branches were cleared and
  update grouping was bounded.

These are not evidence that production identity, alert delivery, storage,
backup recovery, field route data, or multi-host Kubernetes are ready.

### Blocked by owner-provided production inputs

- **WO-06 (Google only):** the provider integration, token verification, account mapping, and operator MFA are implemented. Google sign-in still needs a Google OAuth client with exact callback URLs, and production needs an SMTP provider and a public auth domain. Local demo authentication must not be relabeled as production authentication.

### Implemented on the integration branch, awaiting real-infrastructure proof

WO-07 to WO-18 and WO-21 now have code and, where possible, tests (2026-09-28 baseline: 103 API tests). The detail, including what has and has not been run against Docker, is in [`WORK_ORDER.md`](WORK_ORDER.md). Treat "implemented" as "written and unit-tested", not "operating".

### Added since this audit

- **WO-22:** one design system across the four apps (see the register).
- Findings from verification that changed the plan: Prometheus rules were never delivered to anyone, route writes were unauthenticated, and rider maps could lose their route lines.

## Request coverage matrix

| Conversation requirement | Work order | Current evidence and remaining boundary |
| --- | --- | --- |
| Road-following route geometry rather than straight lines | WO-09 | An SSRF-hardened OSRM geometry client and cached display geometry exist; every published route still needs provenance and field verification. |
| Place-first origin/destination selection, GPS start, no coordinate-first UI | WO-09, WO-11 | Rider planning surfaces exist; production geocoding, permission UX, accuracy states and low-connectivity tests remain. |
| Search all routes, compare alternatives, focus one route and show every stop | WO-09 | Route search/map/focus foundations exist; service-data completeness and interaction testing remain. |
| Live route tracking, off-route handling and “get off” warnings | WO-09 | Demonstration guidance exists; map matching, direction, background behavior and field tests remain launch gates. |
| Gaborone-area bounds, hubs such as Bus Rank/Otse/Mopane/Pakalane, and verified route coverage | WO-09 | Service-area rejection exists; hub naming, provenance and field-confirmed route inventory remain data work. |
| Community add-route, route discussion/tips and general board tabs | WO-10 | Account-linked posts and route contributions exist; reporting, moderation, trust, duplicate detection and publish approval remain. |
| Manual waypoints that follow each road turn | WO-09, WO-10 | Contribution geometry accepts route shapes; editor validation and moderation evidence remain. |
| Mobile-first bottom dock, desktop hierarchy, home/bookmarks/profile | WO-11, WO-21 | Rider shell, recent routes and bookmarks exist; account sync, installability and field/offline verification remain. |
| Skeletons, local action spinners, progress bars, retry/cancel/background work | WO-11 | Standards are documented and a route-level loading shell exists; every async path still needs an interaction-state audit. |
| Optimistic UI, preloading, cached last state, tab feedback and offline queueing | WO-11, WO-21 | Safe read caching and offline guidance exist; idempotent outbox behavior and reconnect tests remain. |
| API access login, dashboard, quota counts, key refresh/rotation and one-time secret display | WO-06, WO-08 | Local account/key/quota flows exist; production identity, shared limits, full lifecycle accounting and audit export remain. |
| Password recovery, Google login and Supabase decision | WO-06 | One-use local reset foundations and the Supabase decision record exist; actual provider/SMTP/OAuth configuration is blocked on credentials. |
| Fumadocs landing page, authenticated reference/console and one page per endpoint | WO-01, WO-15 | The repair shell is in place; the full handbook split, endpoint contract pages, dark-mode/accessibility pass and drift checks remain. |
| Keep Fumadocs navigation recognizable while matching the rider visual system | WO-15 | A restrained token direction is specified; it remains an explicit design and interaction acceptance pass. |
| Demo credentials and credentialed cURL examples | WO-01, WO-08, WO-15 | Local demo credentials are documented; sandbox-key demos and per-endpoint examples remain part of WO-15. |
| Admin sidebar, real dashboard home, RAM/load/database metrics, accounts and Grafana notifications | WO-02, WO-03 | Local views and webhook ingestion exist; production exporters, contact points, SLOs and real alert drills remain. |
| Prometheus, Grafana, tracing and request correlation | WO-03, WO-08 | Local provisioning, Tempo links, OpenTelemetry hooks and `X-Request-ID` exist; retention, sampling, shared deployment and production contact points remain. |
| Database redundancy, WAL, 04:00 archives, off-host copies and clean-host recovery | WO-07 | Design, example pgBackRest/logical backup material and timers exist; no production restore drill has been claimed. |
| Private S3-compatible uploads, validation, signed URLs, retention and deletion | WO-07, WO-13 | Architecture is documented; real storage credentials, malware/content validation and recovery evidence remain. |
| Self-hosted Jira alternative and alert/work-item flow | WO-03, WO-14 | OpenProject is the documented candidate; production integration and separate backup remain. |
| Cron jobs for cleanup, retention, key expiry, backup verification and security refreshes | WO-16 | Three idempotent maintenance jobs and Kubernetes CronJobs exist; production scheduling, missed-run alerts, backup verification and job SLOs remain. |
| CVE/secret/misconfiguration checks | WO-04, WO-16 | CodeQL, Trivy, dependency audits and weekly CI are configured; triage ownership and production image/SBOM gates remain. |
| API-key/JWT rotation and lifetime tracking | WO-06, WO-08, WO-16 | API-key expiry/lineage/last-use and rotation warnings exist; production JWT/provider rotation and revoke drills remain. |
| End-to-end request tracing through internal systems | WO-03, WO-08 | Request IDs and optional OpenTelemetry exist; sampled production traces and cross-service propagation evidence remain. |
| Separate deployables, Kubernetes, autoscaling and blue/green rollback | WO-12, WO-19 | Surface containers and example Kubernetes resources exist; images are placeholders and no production cluster/rollback drill exists. |
| Read scaling, write batching, queues/workers, retries/backoff, circuit breakers, SSE/WebSockets and CQRS | WO-19 | Decision triggers are documented. None should be added simply to collect architecture patterns; measured pressure and failure tests are required. |
| Server-side secrets, firewalls, minimal permissions and restricted AI execution | WO-04, WO-06, WO-17 | Non-root/runtime/network foundations and policies exist; production secret manager, egress enforcement and any future AI tool boundary remain. |
| SQL injection, XSS and backend validation | WO-04, WO-17 | SQLAlchemy parameterization, typed schemas and text rendering are current foundations; security regression coverage must grow with every new input path. |
| Reject XML/unexpected media types and oversized bodies | WO-17 | JSON-only and body-size request boundaries are implemented and tested; ingress/proxy parity remains. |
| SSRF allowlists, private-network blocking, redirect checks, timeouts and response limits | WO-17 | A shared outbound HTTP policy and OSRM-specific checks exist; production egress policy/proxy validation remains. |
| Rate limits, 100-per-hour defaults, paid-API thresholds and hard cost caps | WO-08, WO-17 | Database-backed local quotas exist; horizontally shared enforcement, measured prices and paid-provider kill switches remain. |
| Stable IDs, created/updated timestamps, recoverable deletion, indexes and one source of truth | WO-18 | Useful indexes and many creation timestamps exist. Several entities still use internal integer IDs, lack `updatedAt`, and use hard cascades; this is now an explicit migration work order. |
| Privacy, terms, cookies, refunds, consent, deletion/export, unsubscribe and SDK/license review | WO-13 | Public policy routes and a cookie banner exist; legal review and operational consent/deletion/export evidence remain. |
| Accessibility alt text, contrast, keyboard navigation and reduced motion | WO-11, WO-15 | Baseline patterns exist; full WCAG AA, keyboard and assistive-technology testing remains. |
| Approachable brand, logo/icon page, SEO, social previews, journal and product-story marketing | WO-20 | Tsela, icon/mark assets, metadata, sitemap, journal and product sections exist; final brand approval and conversion/usability review remain. |
| Avoid a heavy live map on marketing; use a performant route illustration/story | WO-20 | Marketing uses a code-native route illustration and staged journey; performance budgets still need field measurement. |
| Heavy contributor documentation, architecture, file roles, screenshots and open-source files | WO-14 | Root/app READMEs, architecture, contribution, conduct, license, security, screenshots and runbooks exist; they remain living documents. |

## Newly explicit work orders

The following were scattered across architecture notes but did not have their
own execution row before this audit.

### WO-16 — scheduled maintenance and lifecycle automation

Keep jobs idempotent and observable. Production completion requires scheduler
ownership, concurrency rules, retry limits, missed-run alerts, job duration and
row-count metrics, retention evidence and a runbook for safe replay. Add jobs
only for a named lifecycle need; “random cron jobs” are not useful reliability.

### WO-17 — adversarial request and abuse-cost controls

Exercise request boundaries from outside the trusted frontend. Cover malformed
content types, oversized bodies, redirect chains, DNS rebinding/private IPs,
timeouts, response-size ceilings, forged identity, cross-tenant object IDs,
quota races and paid-provider shutdown. Treat CORS as browser policy, never as
API authentication.

### WO-18 — data-governance invariants

Design the migration before changing identifiers. Public resources need opaque,
stable IDs; mutable records need `updatedAt`; recoverable business records need
deletion state and retention policy; queries need tenant predicates and measured
indexes. Derived values must be recomputable from one canonical source.

### WO-19 — evidence-gated async and real-time architecture

Choose the smallest mechanism that matches the workload. A queue requires an
idempotency key, retry/backoff policy, poison-message/dead-letter behavior,
visibility timeout, ownership and recovery test. SSE is preferred for one-way
updates; WebSockets require a real bidirectional need. CQRS, replicas, sharding
and workflow engines require measured triggers.

### WO-20 — marketing, brand and search readiness

Finalize the name, logo, icon and brand ownership; validate metadata, sitemap,
structured data and share images; keep the product journey understandable
without a live map or excessive scroll choreography; and measure the cost of
every media/SDK dependency.

### WO-21 — installable PWA and field-offline behavior

Define what works offline for riders and field contributors, what remains
server-confirmed, how stale data is labelled, how drafts are queued and deduped,
and how reconnect/conflict resolution works. Verify installability, storage
limits, update behavior and low-end-device performance.

## Non-Tsela work completed separately

The GitHub identity migration, profile README, private portfolio-planning
repository and public portfolio site are separate repository work. They do not
belong in Tsela's delivery register and do not change its launch status.

## Safe continuation order

1. **WO-06** when the real Supabase/Google/domain/SMTP inputs are available.
2. Otherwise **WO-09**, because field route trust is the product's core value
   and can progress without production identity credentials.
3. **WO-07** before any claim of durable production data.
4. **WO-15** as a bounded documentation product, not mixed into auth or route
   implementation.
5. **WO-08, WO-16 and WO-17** together before exposing paid or partner traffic.
6. Keep **WO-12** as the final production release gate rather than treating
   example Kubernetes files as a deployment.
