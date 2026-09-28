"""Published route, stop, batched network, geometry, and optimization endpoints."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2 import Geography
from sqlalchemy import cast, func, or_, select, update
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import DeveloperAccount, Node, Route
from app.routers.admin import require_admin
from app.schemas import (
    Coordinate,
    MappedRouteCreate,
    MappedRouteResponse,
    NearbyRouteRead,
    NearbyRoutesResponse,
    NetworkRouteRead,
    NodeCreate,
    NodeMutationResponse,
    NodeRead,
    NodeUpdate,
    RouteCreate,
    RouteGeometryResponse,
    RouteOptimizationRequest,
    RouteOptimizationResponse,
    RouteRead,
    RouteUpdate,
)
from app.services.audit import record_event
from app.services.optimizer import optimize_node_order
from app.services.road_geometry import RoadGeometryError, fetch_road_geometry

router = APIRouter(prefix="/api/routes", tags=["Routes"])
settings = get_settings()


def get_route_or_404(session: Session, route_id: int) -> Route:
    route = session.get(Route, route_id)
    if route is None:
        raise HTTPException(status_code=404, detail="Route not found")
    return route


def get_node_or_404(session: Session, route_id: int, node_id: int) -> Node:
    node = session.scalar(select(Node).where(Node.id == node_id, Node.route_id == route_id))
    if node is None:
        raise HTTPException(status_code=404, detail="Stop not found")
    return node


def update_geometry(node: Node) -> None:
    node.geom = func.ST_SetSRID(func.ST_MakePoint(node.long, node.lat), 4326)


def refresh_labels(session: Session, route_id: int) -> None:
    nodes = session.scalars(
        select(Node).where(Node.route_id == route_id).order_by(Node.order_num, Node.id)
    )
    for node in nodes:
        node.label = f"ROUTE{route_id}-STOP{node.order_num}"


def geometry_for_coordinates(
    route_id: int, coordinates: tuple[tuple[float, float], ...]
) -> RouteGeometryResponse:
    if len(coordinates) < 2:
        return RouteGeometryResponse(
            route_id=route_id,
            coordinates=list(coordinates),
            geometry_source="stop_sequence",
            is_road_aligned=False,
            warning="At least two stops are required for a road-aligned preview.",
        )
    try:
        geometry, distance_meters, duration_minutes = fetch_road_geometry(
            settings.road_router_url,
            coordinates,
            settings.road_router_timeout_seconds,
            tuple(settings.road_router_allowed_host_list),
            settings.road_router_max_response_bytes,
        )
        return RouteGeometryResponse(
            route_id=route_id,
            coordinates=list(geometry),
            distance_meters=distance_meters,
            duration_minutes=duration_minutes,
            geometry_source="osrm",
            is_road_aligned=True,
            warning="Road-aligned preview; field-recorded corridor verification is still required.",
        )
    except RoadGeometryError:
        return RouteGeometryResponse(
            route_id=route_id,
            coordinates=list(coordinates),
            geometry_source="stop_sequence",
            is_road_aligned=False,
            warning="Road routing is unavailable; showing the stop sequence as a fallback.",
        )


@router.get("", response_model=list[RouteRead])
def list_routes(
    search: str | None = Query(default=None, max_length=120),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    session: Session = Depends(get_db),
) -> list[Route]:
    query = select(Route)
    if search:
        term = f"%{search.strip()}%"
        query = query.where(or_(Route.name.ilike(term), Route.description.ilike(term)))
    query = query.order_by(Route.created_at.desc()).offset(offset).limit(limit)
    return list(session.scalars(query))


@router.post("", response_model=RouteRead, status_code=status.HTTP_201_CREATED)
def create_route(
    payload: RouteCreate,
    _: DeveloperAccount = Depends(require_admin),
    session: Session = Depends(get_db),
) -> Route:
    route = Route(name=payload.name, description=payload.description)
    session.add(route)
    session.commit()
    session.refresh(route)
    return route


@router.post(
    "/map",
    response_model=MappedRouteResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Routes", "Stops"],
)
def create_mapped_route(
    payload: MappedRouteCreate,
    _: DeveloperAccount = Depends(require_admin),
    session: Session = Depends(get_db),
) -> MappedRouteResponse:
    route = Route(name=payload.name, description=payload.description)
    session.add(route)
    session.flush()

    nodes: list[Node] = []
    for order_num, stop in enumerate(payload.stops, start=1):
        node = Node(
            route_id=route.id,
            label=f"ROUTE{route.id}-STOP{order_num}",
            name=stop.name,
            lat=stop.lat,
            long=stop.long,
            order_num=order_num,
        )
        update_geometry(node)
        session.add(node)
        nodes.append(node)

    session.commit()
    session.refresh(route)
    for node in nodes:
        session.refresh(node)
    return MappedRouteResponse(
        route=RouteRead.model_validate(route),
        stops=[NodeRead.model_validate(node) for node in nodes],
    )


@router.get("/nearby", response_model=NearbyRoutesResponse, tags=["Discovery"])
def nearby_routes(
    lat: float = Query(ge=-90, le=90),
    long: float = Query(ge=-180, le=180),
    radius_meters: int = Query(default=750, alias="radiusMeters", ge=50, le=5000),
    session: Session = Depends(get_db),
) -> NearbyRoutesResponse:
    point = func.ST_SetSRID(func.ST_MakePoint(long, lat), 4326)
    node_geography = cast(Node.geom, Geography)
    point_geography = cast(point, Geography)
    distance = func.ST_Distance(node_geography, point_geography)
    rows = session.execute(
        select(Route, Node, distance.label("distance_meters"))
        .join(Node, Node.route_id == Route.id)
        .where(
            Node.geom.is_not(None),
            func.ST_DWithin(node_geography, point_geography, radius_meters),
        )
        .order_by(distance, Route.id)
    )

    nearest_by_route: dict[int, NearbyRouteRead] = {}
    for route, node, node_distance in rows:
        if route.id not in nearest_by_route:
            nearest_by_route[route.id] = NearbyRouteRead(
                route=RouteRead.model_validate(route),
                nearest_stop=NodeRead.model_validate(node),
                distance_meters=round(node_distance),
            )

    return NearbyRoutesResponse(
        location=Coordinate(lat=lat, long=long),
        radius_meters=radius_meters,
        routes=list(nearest_by_route.values()),
    )


@router.get("/network", response_model=list[NetworkRouteRead], tags=["Discovery"])
def route_network(session: Session = Depends(get_db)) -> list[NetworkRouteRead]:
    """Load the complete rider map with two database queries and parallel cached geometry calls."""

    routes = list(session.scalars(select(Route).order_by(Route.created_at.desc())))
    nodes = list(session.scalars(select(Node).order_by(Node.route_id, Node.order_num, Node.id)))
    nodes_by_route: dict[int, list[Node]] = {route.id: [] for route in routes}
    for node in nodes:
        nodes_by_route.setdefault(node.route_id, []).append(node)
    coordinate_sets = {
        route.id: tuple((node.long, node.lat) for node in nodes_by_route.get(route.id, []))
        for route in routes
    }
    route_ids = [route.id for route in routes]
    with ThreadPoolExecutor(max_workers=min(6, max(1, len(routes)))) as executor:
        geometries = dict(
            zip(
                route_ids,
                executor.map(
                    lambda route_id: geometry_for_coordinates(route_id, coordinate_sets[route_id]),
                    route_ids,
                ),
                strict=True,
            )
        )
    return [
        NetworkRouteRead(
            route=RouteRead.model_validate(route),
            stops=[NodeRead.model_validate(node) for node in nodes_by_route.get(route.id, [])],
            geometry=geometries[route.id],
        )
        for route in routes
    ]


@router.get("/{route_id}", response_model=RouteRead)
def get_route(route_id: int, session: Session = Depends(get_db)) -> Route:
    return get_route_or_404(session, route_id)


@router.get("/{route_id}/geometry", response_model=RouteGeometryResponse, tags=["Discovery"])
def get_route_geometry(route_id: int, session: Session = Depends(get_db)) -> RouteGeometryResponse:
    get_route_or_404(session, route_id)
    nodes = list(
        session.scalars(
            select(Node).where(Node.route_id == route_id).order_by(Node.order_num, Node.id)
        )
    )
    coordinates = tuple((node.long, node.lat) for node in nodes)
    if len(coordinates) < 2:
        raise HTTPException(status_code=422, detail="At least two stops are required")
    return geometry_for_coordinates(route_id, coordinates)


@router.patch("/{route_id}", response_model=RouteRead)
def update_route(
    route_id: int,
    payload: RouteUpdate,
    _: DeveloperAccount = Depends(require_admin),
    session: Session = Depends(get_db),
) -> Route:
    route = get_route_or_404(session, route_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(route, field, value)
    session.commit()
    session.refresh(route)
    return route


@router.delete("/{route_id}")
def delete_route(
    route_id: int,
    admin: DeveloperAccount = Depends(require_admin),
    session: Session = Depends(get_db),
) -> dict[str, str]:
    """Soft delete: the route vanishes from every read but an admin can restore it."""

    route = get_route_or_404(session, route_id)
    route.deleted_at = datetime.now(UTC)
    record_event(session, admin, "route.delete", "route", route.id, name=route.name)
    session.commit()
    return {"message": "Route deleted successfully"}


@router.get("/{route_id}/nodes", response_model=list[NodeRead], tags=["Stops"])
def list_nodes(route_id: int, session: Session = Depends(get_db)) -> list[Node]:
    get_route_or_404(session, route_id)
    return list(
        session.scalars(
            select(Node).where(Node.route_id == route_id).order_by(Node.order_num, Node.id)
        )
    )


@router.post(
    "/{route_id}/nodes",
    response_model=NodeMutationResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Stops"],
)
def create_node(
    route_id: int,
    payload: NodeCreate,
    _: DeveloperAccount = Depends(require_admin),
    session: Session = Depends(get_db),
) -> NodeMutationResponse:
    get_route_or_404(session, route_id)
    session.execute(
        update(Node)
        .where(Node.route_id == route_id, Node.order_num >= payload.order_num)
        .values(order_num=Node.order_num + 1)
    )
    node = Node(
        route_id=route_id,
        label=f"ROUTE{route_id}-STOP{payload.order_num}",
        name=payload.name.strip(),
        lat=payload.lat,
        long=payload.long,
        order_num=payload.order_num,
    )
    update_geometry(node)
    session.add(node)
    session.flush()
    refresh_labels(session, route_id)
    session.commit()
    session.refresh(node)
    return NodeMutationResponse(
        message="Node created successfully", node=NodeRead.model_validate(node)
    )


@router.get("/{route_id}/nodes/{node_id}", response_model=NodeRead, tags=["Stops"])
def get_node(route_id: int, node_id: int, session: Session = Depends(get_db)) -> Node:
    return get_node_or_404(session, route_id, node_id)


@router.patch("/{route_id}/nodes/{node_id}", response_model=NodeMutationResponse, tags=["Stops"])
def update_node(
    route_id: int,
    node_id: int,
    payload: NodeUpdate,
    _: DeveloperAccount = Depends(require_admin),
    session: Session = Depends(get_db),
) -> NodeMutationResponse:
    node = get_node_or_404(session, route_id, node_id)
    values = payload.model_dump(exclude_unset=True)
    requested_order = values.pop("order_num", node.order_num)

    if requested_order < node.order_num:
        session.execute(
            update(Node)
            .where(
                Node.route_id == route_id,
                Node.id != node_id,
                Node.order_num >= requested_order,
                Node.order_num < node.order_num,
            )
            .values(order_num=Node.order_num + 1)
        )
    elif requested_order > node.order_num:
        session.execute(
            update(Node)
            .where(
                Node.route_id == route_id,
                Node.id != node_id,
                Node.order_num <= requested_order,
                Node.order_num > node.order_num,
            )
            .values(order_num=Node.order_num - 1)
        )

    node.order_num = requested_order
    for field, value in values.items():
        setattr(node, field, value)
    if "lat" in values or "long" in values:
        update_geometry(node)
    session.flush()
    refresh_labels(session, route_id)
    session.commit()
    session.refresh(node)
    return NodeMutationResponse(
        message="Node updated successfully", node=NodeRead.model_validate(node)
    )


@router.delete("/{route_id}/nodes/{node_id}", tags=["Stops"])
def delete_node(
    route_id: int,
    node_id: int,
    _: DeveloperAccount = Depends(require_admin),
    session: Session = Depends(get_db),
) -> dict[str, str]:
    node = get_node_or_404(session, route_id, node_id)
    deleted_order = node.order_num
    session.delete(node)
    session.flush()
    session.execute(
        update(Node)
        .where(Node.route_id == route_id, Node.order_num > deleted_order)
        .values(order_num=Node.order_num - 1)
    )
    refresh_labels(session, route_id)
    session.commit()
    return {"message": "Node deleted successfully"}


@router.post(
    "/{route_id}/optimize", response_model=RouteOptimizationResponse, tags=["Optimization"]
)
def optimize_route(
    route_id: int,
    payload: RouteOptimizationRequest,
    _: DeveloperAccount = Depends(require_admin),
    session: Session = Depends(get_db),
) -> RouteOptimizationResponse:
    get_route_or_404(session, route_id)
    nodes = list(
        session.scalars(
            select(Node).where(Node.route_id == route_id).order_by(Node.order_num, Node.id)
        )
    )
    if len(nodes) < 2:
        raise HTTPException(status_code=422, detail="At least two stops are required")

    optimized, original_distance, optimized_distance = optimize_node_order(
        nodes, payload.time_limit_seconds
    )
    if payload.apply:
        for order_num, node in enumerate(optimized, start=1):
            node.order_num = order_num
        session.flush()
        refresh_labels(session, route_id)
        session.commit()

    savings = (
        round((original_distance - optimized_distance) / original_distance * 100, 2)
        if original_distance
        else 0
    )
    return RouteOptimizationResponse(
        route_id=route_id,
        ordered_node_ids=[node.id for node in optimized],
        original_distance_meters=original_distance,
        optimized_distance_meters=optimized_distance,
        savings_percent=savings,
        applied=payload.apply,
    )
