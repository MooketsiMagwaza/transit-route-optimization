"""Internal engineering and operations handbook, served only to administrators.

The Markdown lives in the repository ``docs`` directory and is the single source of truth.
Only files named in :data:`PAGES` can be read; a caller-supplied slug is looked up in that
allowlist and never joined to a path, so traversal is impossible by construction.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from app.config import get_settings

MAX_PAGE_BYTES = 512_000


@dataclass(frozen=True)
class HandbookPage:
    slug: str
    file: str
    title: str
    group: str
    summary: str


PAGES: tuple[HandbookPage, ...] = (
    HandbookPage(
        "work-orders",
        "WORK_ORDER.md",
        "Work orders",
        "Delivery",
        "Execution state, acceptance criteria, and the resume procedure.",
    ),
    HandbookPage(
        "work-order-audit",
        "WORK_ORDER_AUDIT.md",
        "Work-order audit",
        "Delivery",
        "Maps every product request to a work order and its evidence.",
    ),
    HandbookPage(
        "launch-checklist",
        "LAUNCH_CHECKLIST.md",
        "Launch checklist",
        "Delivery",
        "Evidence required before the platform is called production-ready.",
    ),
    HandbookPage(
        "product-vision",
        "PRODUCT_VISION.md",
        "Product vision",
        "Delivery",
        "The five product surfaces and the rider, field, and community model.",
    ),
    HandbookPage(
        "production-architecture",
        "PRODUCTION_ARCHITECTURE.md",
        "Production architecture",
        "Architecture",
        "Deployment topology, data flows, availability, and honest readiness.",
    ),
    HandbookPage(
        "system-design-playbook",
        "SYSTEM_DESIGN_PLAYBOOK.md",
        "System design playbook",
        "Architecture",
        "Scaling triggers, jobs, reliability patterns, and tracing.",
    ),
    HandbookPage(
        "data-model",
        "DATA_MODEL.md",
        "Data model",
        "Architecture",
        "Entities, relationships, stable identity, timestamps, and deletion.",
    ),
    HandbookPage(
        "backend",
        "BACKEND.md",
        "Backend",
        "Architecture",
        "FastAPI, persistence, migrations, pathfinding, and optimisation.",
    ),
    HandbookPage(
        "frontend",
        "FRONTEND.md",
        "Frontend and UI",
        "Architecture",
        "Pages, interaction patterns, visual system, and client data flow.",
    ),
    HandbookPage(
        "api-gateway",
        "API_GATEWAY.md",
        "API gateway",
        "Architecture",
        "Public URLs, ingress rules, payloads, and status behaviour.",
    ),
    HandbookPage(
        "auth-decision",
        "AUTH_DECISION.md",
        "Authentication decision",
        "Identity and security",
        "Supabase, Better Auth, and Google trade-offs.",
    ),
    HandbookPage(
        "production-auth",
        "PRODUCTION_AUTH.md",
        "Production authentication",
        "Identity and security",
        "Supabase Auth, Google OAuth, JWT validation, and migration.",
    ),
    HandbookPage(
        "security-architecture",
        "SECURITY_ARCHITECTURE.md",
        "Security architecture",
        "Identity and security",
        "SSRF, JSON boundaries, roles, cost caps, and automated checks.",
    ),
    HandbookPage(
        "backup-and-recovery",
        "BACKUP_AND_DISASTER_RECOVERY.md",
        "Backup and recovery",
        "Operations",
        "Replicas, WAL, daily archives, PITR, and restore drills.",
    ),
    HandbookPage(
        "object-storage",
        "OBJECT_STORAGE.md",
        "Object storage",
        "Operations",
        "S3-compatible uploads, signed URLs, validation, and retention.",
    ),
    HandbookPage(
        "observability",
        "OBSERVABILITY_AND_AUTH.md",
        "Observability",
        "Operations",
        "Prometheus, Grafana, Tempo, alerts, and tracing.",
    ),
    HandbookPage(
        "integrations",
        "INTEGRATIONS_AND_WORK_MANAGEMENT.md",
        "Integrations and work management",
        "Operations",
        "Grafana notifications and OpenProject as a self-hosted Jira alternative.",
    ),
    HandbookPage(
        "cost-and-capacity",
        "COST_AND_CAPACITY.md",
        "Cost and capacity",
        "Operations",
        "Hourly limits and the measurement model.",
    ),
    HandbookPage(
        "route-lifecycle",
        "ROUTE_LIFECYCLE.md",
        "Route lifecycle",
        "Product data",
        "How a route moves from contribution to published.",
    ),
    HandbookPage(
        "service-area",
        "SERVICE_AREA.md",
        "Service area",
        "Product data",
        "Contribution bounds, enforcement, and the polygon migration note.",
    ),
    HandbookPage(
        "seed-data",
        "SEED_DATA.md",
        "Gaborone starter data",
        "Product data",
        "Seeded corridors, coordinates, provenance, and accuracy limits.",
    ),
    HandbookPage(
        "ux-standards",
        "UX_STANDARDS.md",
        "UX standards",
        "Design",
        "Adaptive hierarchy, loading, offline, motion, accessibility, and consent.",
    ),
    HandbookPage(
        "brand", "BRAND.md", "Brand direction", "Design", "Tsela naming and the visual system."
    ),
    HandbookPage(
        "user-guide",
        "USER_GUIDE.md",
        "Application user guide",
        "Guides",
        "Rider, operator, map, and health workflows.",
    ),
    HandbookPage(
        "demo-credentials",
        "DEMO_CREDENTIALS.md",
        "Demo credentials",
        "Guides",
        "Local URLs, the demo account, and the first API call.",
    ),
)

_BY_SLUG = {page.slug: page for page in PAGES}


def handbook_root() -> Path | None:
    """Resolve the handbook directory: ``HANDBOOK_DIR`` first, then the repository docs."""

    configured = get_settings().handbook_dir.strip()
    candidate = Path(configured) if configured else Path(__file__).resolve().parents[2] / "docs"
    return candidate if candidate.is_dir() else None


def list_pages() -> list[HandbookPage]:
    """Return manifest pages whose source file exists, in reading order."""

    root = handbook_root()
    if root is None:
        return []
    return [page for page in PAGES if (root / page.file).is_file()]


def read_page(slug: str) -> tuple[HandbookPage, str, datetime] | None:
    """Return ``(page, markdown, modified)`` for an allowlisted slug, else ``None``."""

    page = _BY_SLUG.get(slug)
    root = handbook_root()
    if page is None or root is None:
        return None
    path = (root / page.file).resolve()
    if path.parent != root.resolve() or not path.is_file():
        return None
    if path.stat().st_size > MAX_PAGE_BYTES:
        return None
    modified = datetime.fromtimestamp(path.stat().st_mtime, tz=UTC)
    return page, path.read_text(encoding="utf-8"), modified
