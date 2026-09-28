"""Route data freshness: a field verification is only trusted for a limited time."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Route

STALE_AFTER = timedelta(days=180)


def mark_stale_routes(session: Session, now: datetime | None = None) -> int:
    """Flag field-verified routes whose last confirmation is older than the freshness window."""

    cutoff = (now or datetime.now(UTC)) - STALE_AFTER
    changed = 0
    for route in session.scalars(
        select(Route).where(
            Route.verification_status == "field_verified", Route.verified_at < cutoff
        )
    ):
        route.verification_status = "stale"
        changed += 1
    return changed
