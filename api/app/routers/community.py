"""Authenticated community route drawing, tips, and discussion endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import Field, field_validator
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.models import (
    CommunityPost,
    ContentReport,
    DeveloperAccount,
    Route,
    RouteContribution,
)
from app.routers.developer import get_current_account
from app.schemas import (
    ApiModel,
    CommunityPostCreate,
    CommunityPostRead,
    ContributionPreviewRequest,
    ContributionPreviewResponse,
    RouteContributionCreate,
    RouteContributionRead,
)
from app.services import throttle
from app.services.audit import record_event
from app.services.road_geometry import RoadGeometryError, fetch_road_geometry
from app.routers.moderation import known_routes
from app.schemas import normalize_plain_text
from app.services.contribution_review import Point, review_contribution
from app.services.service_area import all_inside_contribution_area

router = APIRouter(prefix="/api/community", tags=["Community"])


def require_contribution_area(waypoints: list) -> None:
    """Reject out-of-area work before spending a road-router request."""

    if not all_inside_contribution_area(waypoints):
        raise HTTPException(
            status_code=422,
            detail="Route points must stay inside the Greater Gaborone service area",
        )


def road_preview(
    waypoints: list, settings: Settings
) -> tuple[tuple[tuple[float, float], ...], int, int]:
    coordinates = tuple((point.long, point.lat) for point in waypoints)
    try:
        return fetch_road_geometry(
            settings.road_router_url,
            coordinates,
            settings.road_router_timeout_seconds,
            tuple(settings.road_router_allowed_host_list),
            settings.road_router_max_response_bytes,
        )
    except RoadGeometryError as error:
        raise HTTPException(
            status_code=422, detail="No road-following preview was found"
        ) from error


@router.post("/routes/preview", response_model=ContributionPreviewResponse)
def preview_route(
    payload: ContributionPreviewRequest,
    settings: Settings = Depends(get_settings),
    _: DeveloperAccount = Depends(get_current_account),
) -> ContributionPreviewResponse:
    require_contribution_area(payload.waypoints)
    geometry, distance, duration = road_preview(payload.waypoints, settings)
    return ContributionPreviewResponse(
        coordinates=list(geometry),
        distance_meters=distance,
        duration_minutes=duration,
        geometry_source="osrm",
    )


@router.post("/routes", response_model=RouteContributionRead, status_code=status.HTTP_201_CREATED)
def contribute_route(
    payload: RouteContributionCreate,
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    account: DeveloperAccount = Depends(get_current_account),
) -> RouteContribution:
    throttle.enforce(session, "contribute", str(account.id), limit=10, window_seconds=86_400)
    require_contribution_area(payload.waypoints)
    points = [Point(item.lat, item.long) for item in payload.waypoints]
    review = review_contribution(payload.name, points, known_routes(session))
    if review.blocking:
        raise HTTPException(status_code=422, detail="; ".join(review.blocking))
    geometry, _, _ = road_preview(payload.waypoints, settings)
    contribution = RouteContribution(
        account_id=account.id,
        name=payload.name.strip(),
        notes=payload.notes.strip() if payload.notes else None,
        contributor_alias=(
            payload.contributor_alias.strip() if payload.contributor_alias else account.display_name
        ),
        waypoints=[point.model_dump() for point in payload.waypoints],
        geometry=[list(point) for point in geometry],
        validation=review.as_json(),
        status="pending_review",
    )
    session.add(contribution)
    session.commit()
    session.refresh(contribution)
    return contribution


class ReportCreate(ApiModel):
    target_type: str = Field(validation_alias="targetType", pattern="^(post|contribution)$")
    target_id: int = Field(validation_alias="targetId", ge=1)
    reason: str = Field(pattern="^(spam|abuse|inaccurate|other)$")
    note: str | None = Field(default=None, max_length=500)

    @field_validator("note")
    @classmethod
    def clean_note(cls, value: str | None) -> str | None:
        return normalize_plain_text(value) or None if value else None


def post_read(post: CommunityPost) -> CommunityPostRead:
    return CommunityPostRead(
        id=post.id,
        route_id=post.route_id,
        kind=post.kind,
        title=post.title,
        body=post.body,
        author_name=post.account.display_name,
        created_at=post.created_at,
    )


@router.get("/posts", response_model=list[CommunityPostRead])
def list_posts(
    query: str = Query(default="", max_length=80),
    route_id: int | None = Query(default=None, alias="routeId"),
    account: DeveloperAccount = Depends(get_current_account),
    session: Session = Depends(get_db),
) -> list[CommunityPostRead]:
    """Search plain-text posts with parameterized SQLAlchemy expressions."""

    del account
    statement = select(CommunityPost).where(CommunityPost.status == "published")
    if route_id is not None:
        statement = statement.where(CommunityPost.route_id == route_id)
    term = query.strip()
    if term:
        escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        statement = statement.where(
            or_(
                CommunityPost.title.ilike(f"%{escaped}%", escape="\\"),
                CommunityPost.body.ilike(f"%{escaped}%", escape="\\"),
            )
        )
    posts = session.scalars(statement.order_by(CommunityPost.created_at.desc()).limit(100))
    return [post_read(post) for post in posts]


@router.post("/posts", response_model=CommunityPostRead, status_code=status.HTTP_201_CREATED)
def create_post(
    payload: CommunityPostCreate,
    account: DeveloperAccount = Depends(get_current_account),
    session: Session = Depends(get_db),
) -> CommunityPostRead:
    throttle.enforce(session, "post", str(account.id), limit=20, window_seconds=3600)
    if payload.route_id is not None and session.get(Route, payload.route_id) is None:
        raise HTTPException(status_code=404, detail="Route not found")
    post = CommunityPost(
        account_id=account.id,
        route_id=payload.route_id,
        kind=payload.kind,
        title=payload.title,
        body=payload.body,
        status="published",
    )
    session.add(post)
    session.commit()
    session.refresh(post)
    return post_read(post)


@router.post("/reports", status_code=status.HTTP_202_ACCEPTED)
def report_content(
    payload: ReportCreate,
    account: DeveloperAccount = Depends(get_current_account),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict[str, bool]:
    """Report a post or contribution. Repeat reports by one person are counted once."""

    throttle.enforce(session, "report", str(account.id), limit=20, window_seconds=3600)
    if payload.target_type == "post":
        target = session.get(CommunityPost, payload.target_id)
        visible = target is not None and target.status == "published"
    else:
        target = session.get(RouteContribution, payload.target_id)
        visible = target is not None and target.status == "pending_review"
    if not visible:
        raise HTTPException(status_code=404, detail="That content is not available to report")
    session.add(
        ContentReport(
            reporter_id=account.id,
            target_type=payload.target_type,
            target_id=payload.target_id,
            reason=payload.reason,
            note=payload.note,
        )
    )
    try:
        session.flush()
    except IntegrityError:
        session.rollback()
        return {"accepted": True}  # already reported by this person; do not reveal anything
    distinct = session.scalar(
        select(func.count(func.distinct(ContentReport.reporter_id))).where(
            ContentReport.target_type == payload.target_type,
            ContentReport.target_id == payload.target_id,
            ContentReport.status == "open",
        )
    )
    if (
        payload.target_type == "post"
        and target.status == "published"
        and (distinct or 0) >= settings.auto_hide_report_threshold
    ):
        # Hide first, review second: a coordinated abuse wave should not stay visible.
        target.status = "hidden"
        target.hidden_reason = "Hidden automatically after repeated reports"
        record_event(session, None, "post.auto_hide", "post", target.id, reporters=distinct)
    session.commit()
    return {"accepted": True}
