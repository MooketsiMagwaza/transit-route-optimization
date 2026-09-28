"""Administrator moderation: reports, contribution review and publishing, provenance, audit."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2 import functions as geo
from pydantic import Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    AuditEvent,
    CommunityPost,
    ContentReport,
    DeveloperAccount,
    Node,
    Route,
    RouteContribution,
)
from app.routers.admin import require_admin
from app.schemas import ApiModel
from app.services.audit import record_event
from app.services.contribution_review import KnownRoute, Point, review_contribution

router = APIRouter(prefix="/api/admin/moderation", tags=["Moderation"])


class ReportRead(ApiModel):
    id: int
    target_type: str = Field(serialization_alias="targetType")
    target_id: int = Field(serialization_alias="targetId")
    reason: str
    note: str | None
    status: str
    created_at: datetime = Field(serialization_alias="createdAt")
    target_title: str | None = Field(default=None, serialization_alias="targetTitle")
    target_excerpt: str | None = Field(default=None, serialization_alias="targetExcerpt")
    report_count: int = Field(default=1, serialization_alias="reportCount")


class ContributionReviewRead(ApiModel):
    id: int
    name: str
    notes: str | None
    contributor_alias: str | None = Field(serialization_alias="contributorAlias")
    status: str
    created_at: datetime = Field(serialization_alias="createdAt")
    stop_count: int = Field(serialization_alias="stopCount")
    validation: dict
    review_note: str | None = Field(default=None, serialization_alias="reviewNote")
    published_route_id: int | None = Field(default=None, serialization_alias="publishedRouteId")


class ModerationSummary(ApiModel):
    open_reports: int = Field(serialization_alias="openReports")
    pending_contributions: int = Field(serialization_alias="pendingContributions")
    hidden_posts: int = Field(serialization_alias="hiddenPosts")
    stale_routes: int = Field(serialization_alias="staleRoutes")


class ResolveReport(ApiModel):
    action: str = Field(pattern="^(hide_content|dismiss)$")
    note: str | None = Field(default=None, max_length=500)


class ApproveContribution(ApiModel):
    override_duplicate: bool = Field(
        default=False, validation_alias="overrideDuplicate", serialization_alias="overrideDuplicate"
    )
    note: str | None = Field(default=None, max_length=500)


class RejectContribution(ApiModel):
    reason: str = Field(min_length=3, max_length=500)


class VerifyRoute(ApiModel):
    status: str = Field(pattern="^(field_verified|unverified)$")
    note: str | None = Field(default=None, max_length=500)


class AuditRead(ApiModel):
    id: int
    occurred_at: datetime = Field(serialization_alias="occurredAt")
    actor_id: int | None = Field(serialization_alias="actorId")
    actor_role: str | None = Field(serialization_alias="actorRole")
    action: str
    target_type: str = Field(serialization_alias="targetType")
    target_id: int | None = Field(serialization_alias="targetId")
    detail: dict
    request_id: str | None = Field(serialization_alias="requestId")


def known_routes(session: Session) -> list[KnownRoute]:
    rows = session.execute(
        select(Route.id, Route.name, Node.lat, Node.long)
        .join(Node, Node.route_id == Route.id, isouter=True)
        .order_by(Route.id, Node.order_num)
    ).all()
    routes: dict[int, tuple[str, list[Point]]] = {}
    for route_id, name, lat, long in rows:
        entry = routes.setdefault(route_id, (name, []))
        if lat is not None:
            entry[1].append(Point(lat, long))
    return [KnownRoute(rid, name, tuple(stops)) for rid, (name, stops) in routes.items()]


def review_for(contribution: RouteContribution, session: Session) -> dict:
    points = [Point(item["lat"], item["long"]) for item in contribution.waypoints]
    return review_contribution(contribution.name, points, known_routes(session)).as_json()


def _contribution_read(contribution: RouteContribution) -> ContributionReviewRead:
    return ContributionReviewRead(
        id=contribution.id,
        name=contribution.name,
        notes=contribution.notes,
        contributor_alias=contribution.contributor_alias,
        status=contribution.status,
        created_at=contribution.created_at,
        stop_count=len(contribution.waypoints),
        validation=contribution.validation or {},
        review_note=contribution.review_note,
        published_route_id=contribution.published_route_id,
    )


@router.get("/summary", response_model=ModerationSummary)
def summary(
    _: DeveloperAccount = Depends(require_admin), session: Session = Depends(get_db)
) -> ModerationSummary:
    def count(statement) -> int:
        return session.scalar(statement) or 0

    return ModerationSummary(
        open_reports=count(
            select(func.count(ContentReport.id)).where(ContentReport.status == "open")
        ),
        pending_contributions=count(
            select(func.count(RouteContribution.id)).where(
                RouteContribution.status == "pending_review"
            )
        ),
        hidden_posts=count(
            select(func.count(CommunityPost.id)).where(CommunityPost.status == "hidden")
        ),
        stale_routes=count(
            select(func.count(Route.id)).where(Route.verification_status == "stale")
        ),
    )


@router.get("/reports", response_model=list[ReportRead])
def list_reports(
    state: str = Query(default="open", alias="status", pattern="^(open|actioned|dismissed)$"),
    _: DeveloperAccount = Depends(require_admin),
    session: Session = Depends(get_db),
) -> list[ReportRead]:
    reports = list(
        session.scalars(
            select(ContentReport)
            .where(ContentReport.status == state)
            .order_by(ContentReport.created_at.desc())
            .limit(100)
        )
    )
    counts = {
        (target_type, target_id): total
        for target_type, target_id, total in session.execute(
            select(ContentReport.target_type, ContentReport.target_id, func.count())
            .where(ContentReport.status == state)
            .group_by(ContentReport.target_type, ContentReport.target_id)
        )
    }
    result = []
    for report in reports:
        title = excerpt = None
        if report.target_type == "post":
            post = session.get(CommunityPost, report.target_id)
            if post:
                title, excerpt = post.title, post.body[:200]
        elif report.target_type == "contribution":
            contribution = session.get(RouteContribution, report.target_id)
            if contribution:
                title, excerpt = contribution.name, (contribution.notes or "")[:200]
        result.append(
            ReportRead(
                id=report.id,
                target_type=report.target_type,
                target_id=report.target_id,
                reason=report.reason,
                note=report.note,
                status=report.status,
                created_at=report.created_at,
                target_title=title,
                target_excerpt=excerpt,
                report_count=counts.get((report.target_type, report.target_id), 1),
            )
        )
    return result


@router.post("/reports/{report_id}/resolve", status_code=status.HTTP_204_NO_CONTENT)
def resolve_report(
    report_id: int,
    payload: ResolveReport,
    admin: DeveloperAccount = Depends(require_admin),
    session: Session = Depends(get_db),
) -> None:
    report = session.get(ContentReport, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    now = datetime.now(UTC)
    siblings = list(
        session.scalars(
            select(ContentReport).where(
                ContentReport.target_type == report.target_type,
                ContentReport.target_id == report.target_id,
                ContentReport.status == "open",
            )
        )
    )
    if payload.action == "hide_content":
        if report.target_type == "post":
            post = session.get(CommunityPost, report.target_id)
            if post is not None:
                post.status = "hidden"
                post.hidden_reason = (payload.note or report.reason)[:200]
        elif report.target_type == "contribution":
            contribution = session.get(RouteContribution, report.target_id)
            if contribution is not None and contribution.status == "pending_review":
                contribution.status = "rejected"
                contribution.review_note = payload.note or "Removed after a report"
                contribution.reviewed_at = now
                contribution.reviewed_by_id = admin.id
    for item in siblings:
        item.status = "actioned" if payload.action == "hide_content" else "dismissed"
        item.resolved_at = now
        item.resolved_by_id = admin.id
    record_event(
        session,
        admin,
        f"report.{payload.action}",
        report.target_type,
        report.target_id,
        reports=len(siblings),
        note=payload.note,
    )
    session.commit()


@router.get("/contributions", response_model=list[ContributionReviewRead])
def list_contributions(
    state: str = Query(default="pending_review", alias="status"),
    _: DeveloperAccount = Depends(require_admin),
    session: Session = Depends(get_db),
) -> list[ContributionReviewRead]:
    rows = session.scalars(
        select(RouteContribution)
        .where(RouteContribution.status == state)
        .order_by(RouteContribution.created_at.desc())
        .limit(100)
    )
    return [_contribution_read(row) for row in rows]


@router.post("/contributions/{contribution_id}/approve", response_model=ContributionReviewRead)
def approve_contribution(
    contribution_id: int,
    payload: ApproveContribution,
    admin: DeveloperAccount = Depends(require_admin),
    session: Session = Depends(get_db),
) -> ContributionReviewRead:
    """Publish a contribution as a new route. Re-validates so stale checks cannot slip through."""

    contribution = session.get(RouteContribution, contribution_id)
    if contribution is None:
        raise HTTPException(status_code=404, detail="Contribution not found")
    if contribution.status != "pending_review":
        raise HTTPException(status_code=409, detail="This contribution has already been reviewed")
    review = review_for(contribution, session)
    if review["blocking"]:
        raise HTTPException(status_code=422, detail="; ".join(review["blocking"]))
    if review["duplicates"] and not payload.override_duplicate:
        raise HTTPException(
            status_code=409,
            detail="This looks like an existing route. Confirm with overrideDuplicate to publish.",
        )

    route = Route(
        name=contribution.name,
        description=contribution.notes,
        source="community",
        verification_status="unverified",
    )
    session.add(route)
    session.flush()
    for order_num, point in enumerate(contribution.waypoints, start=1):
        session.add(
            Node(
                route_id=route.id,
                label=f"ROUTE{route.id}-STOP{order_num}",
                name=point.get("name") or f"Stop {order_num}",
                lat=point["lat"],
                long=point["long"],
                order_num=order_num,
                geom=geo.ST_SetSRID(geo.ST_MakePoint(point["long"], point["lat"]), 4326),
            )
        )
    now = datetime.now(UTC)
    contribution.status = "published"
    contribution.validation = review
    contribution.reviewed_at = now
    contribution.reviewed_by_id = admin.id
    contribution.review_note = payload.note
    contribution.published_route_id = route.id
    record_event(
        session,
        admin,
        "contribution.approve",
        "contribution",
        contribution.id,
        routeId=route.id,
        overrodeDuplicate=payload.override_duplicate,
        note=payload.note,
    )
    session.commit()
    return _contribution_read(contribution)


@router.post("/contributions/{contribution_id}/reject", response_model=ContributionReviewRead)
def reject_contribution(
    contribution_id: int,
    payload: RejectContribution,
    admin: DeveloperAccount = Depends(require_admin),
    session: Session = Depends(get_db),
) -> ContributionReviewRead:
    contribution = session.get(RouteContribution, contribution_id)
    if contribution is None:
        raise HTTPException(status_code=404, detail="Contribution not found")
    if contribution.status != "pending_review":
        raise HTTPException(status_code=409, detail="This contribution has already been reviewed")
    contribution.status = "rejected"
    contribution.review_note = payload.reason
    contribution.reviewed_at = datetime.now(UTC)
    contribution.reviewed_by_id = admin.id
    record_event(
        session, admin, "contribution.reject", "contribution", contribution.id, reason=payload.reason
    )
    session.commit()
    return _contribution_read(contribution)


@router.post("/routes/{route_id}/verify", status_code=status.HTTP_204_NO_CONTENT)
def verify_route(
    route_id: int,
    payload: VerifyRoute,
    admin: DeveloperAccount = Depends(require_admin),
    session: Session = Depends(get_db),
) -> None:
    route = session.get(Route, route_id)
    if route is None:
        raise HTTPException(status_code=404, detail="Route not found")
    route.verification_status = payload.status
    route.verified_at = datetime.now(UTC) if payload.status == "field_verified" else None
    route.verified_by_id = admin.id if payload.status == "field_verified" else None
    record_event(
        session, admin, "route.verify", "route", route.id, status=payload.status, note=payload.note
    )
    session.commit()


@router.post("/routes/{route_id}/restore", status_code=status.HTTP_204_NO_CONTENT)
def restore_route(
    route_id: int,
    admin: DeveloperAccount = Depends(require_admin),
    session: Session = Depends(get_db),
) -> None:
    route = session.execute(
        select(Route).where(Route.id == route_id).execution_options(include_deleted=True)
    ).scalar_one_or_none()
    if route is None or route.deleted_at is None:
        raise HTTPException(status_code=404, detail="No deleted route with that ID")
    route.deleted_at = None
    record_event(session, admin, "route.restore", "route", route.id, name=route.name)
    session.commit()


@router.get("/audit", response_model=list[AuditRead])
def audit_log(
    limit: int = Query(default=100, ge=1, le=500),
    _: DeveloperAccount = Depends(require_admin),
    session: Session = Depends(get_db),
) -> list[AuditEvent]:
    return list(
        session.scalars(select(AuditEvent).order_by(AuditEvent.occurred_at.desc()).limit(limit))
    )
