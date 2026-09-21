"""Credential-protected public API with indexed lookups and bounded request volume."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ApiKey, Route
from app.routers.routes import get_route_geometry
from app.schemas import RouteGeometryResponse, RouteRead
from app.services.api_access import SCOPE_ROUTES_READ, require_scope

router = APIRouter(prefix="/v1", tags=["Public API v1"])

# Every response documented for a public operation. The documentation catalog in
# docs-site/content/api-catalog.json is checked against these by the contract test.
COMMON_ERRORS = {
    401: {"description": "Missing, invalid, expired, or revoked API key."},
    403: {"description": "The API key lacks the required scope."},
    429: {"description": "Hourly limit, monthly quota, or invalid-credential limit exceeded."},
}


@router.get(
    "/routes",
    response_model=list[RouteRead],
    operation_id="v1ListRoutes",
    summary="List routes",
    responses=COMMON_ERRORS,
)
def v1_routes(
    search: str | None = Query(default=None, max_length=120),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    _: ApiKey = Depends(require_scope(SCOPE_ROUTES_READ)),
    session: Session = Depends(get_db),
) -> list:
    query = select(Route)
    if search:
        term = f"%{search.strip()}%"
        query = query.where(or_(Route.name.ilike(term), Route.description.ilike(term)))
    query = query.order_by(Route.created_at.desc(), Route.id.desc()).offset(offset).limit(limit)
    return list(session.scalars(query))


@router.get(
    "/routes/{route_id}/geometry",
    response_model=RouteGeometryResponse,
    operation_id="v1GetRouteGeometry",
    summary="Get route geometry",
    responses={**COMMON_ERRORS, 404: {"description": "The route does not exist."}},
)
def v1_route_geometry(
    route_id: int,
    _: ApiKey = Depends(require_scope(SCOPE_ROUTES_READ)),
    session: Session = Depends(get_db),
) -> RouteGeometryResponse:
    return get_route_geometry(route_id, session)
