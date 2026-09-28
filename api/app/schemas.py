"""Validated API contracts; all community-authored fields are bounded plain text."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


def normalize_plain_text(value: str) -> str:
    """Trim text and remove control bytes without attempting unsafe HTML rendering."""

    return "".join(
        character for character in value.strip() if character >= " " or character in "\n\t"
    )


class RouteCreate(ApiModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Route name cannot be blank")
        return value


class RouteUpdate(ApiModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str | None) -> str | None:
        if value is None:
            raise ValueError("Route name cannot be null")
        value = value.strip()
        if not value:
            raise ValueError("Route name cannot be blank")
        return value


class RouteRead(ApiModel):
    id: int
    public_id: uuid.UUID = Field(serialization_alias="publicId")
    name: str
    description: str | None
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")
    source: str
    verification_status: str = Field(serialization_alias="verificationStatus")
    verified_at: datetime | None = Field(default=None, serialization_alias="verifiedAt")


class NodeCreate(ApiModel):
    name: str = Field(min_length=1, max_length=160)
    lat: float = Field(ge=-90, le=90)
    long: float = Field(ge=-180, le=180)
    order_num: int = Field(validation_alias="orderNum", serialization_alias="orderNum", ge=1)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Stop name cannot be blank")
        return value


class NodeUpdate(ApiModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    lat: float | None = Field(default=None, ge=-90, le=90)
    long: float | None = Field(default=None, ge=-180, le=180)
    order_num: int | None = Field(
        default=None, validation_alias="orderNum", serialization_alias="orderNum", ge=1
    )

    @field_validator("name", "lat", "long", "order_num")
    @classmethod
    def reject_null_updates(cls, value: object) -> object:
        if value is None:
            raise ValueError("Updated fields cannot be null")
        return value


class NodeRead(ApiModel):
    id: int
    route_id: int = Field(serialization_alias="routeId")
    label: str
    name: str
    lat: float
    long: float
    order_num: int = Field(serialization_alias="orderNum")


class MappedRouteCreate(RouteCreate):
    stops: list[NodeCreate] = Field(min_length=2, max_length=200)


class MappedRouteResponse(ApiModel):
    route: RouteRead
    stops: list[NodeRead]


class NodeMutationResponse(ApiModel):
    message: str
    node: NodeRead | None = None


class Coordinate(ApiModel):
    lat: float = Field(ge=-90, le=90)
    long: float = Field(ge=-180, le=180)


class NearbyRouteRead(ApiModel):
    route: RouteRead
    nearest_stop: NodeRead = Field(serialization_alias="nearestStop")
    distance_meters: int = Field(serialization_alias="distanceMeters")


class NearbyRoutesResponse(ApiModel):
    location: Coordinate
    radius_meters: int = Field(serialization_alias="radiusMeters")
    routes: list[NearbyRouteRead]


class RouteGeometryResponse(ApiModel):
    route_id: int = Field(serialization_alias="routeId")
    coordinates: list[tuple[float, float]]
    distance_meters: int | None = Field(default=None, serialization_alias="distanceMeters")
    duration_minutes: int | None = Field(default=None, serialization_alias="durationMinutes")
    geometry_source: str = Field(serialization_alias="geometrySource")
    is_road_aligned: bool = Field(serialization_alias="isRoadAligned")
    warning: str | None = None


class NetworkRouteRead(ApiModel):
    route: RouteRead
    stops: list[NodeRead]
    geometry: RouteGeometryResponse


class PathfindRequest(ApiModel):
    origin: Coordinate
    destination: Coordinate


class TimeBreakdown(ApiModel):
    walking: int
    bus: int
    waiting: int


class PathfindResponse(ApiModel):
    path: list[NodeRead]
    total_time_minutes: int = Field(serialization_alias="totalTimeMinutes")
    breakdown: TimeBreakdown
    transfers: int
    walking_distance_meters: int = Field(serialization_alias="walkingDistanceMeters")


class NoRouteResponse(ApiModel):
    message: str


class RouteOptimizationRequest(ApiModel):
    apply: bool = False
    time_limit_seconds: int = Field(default=3, validation_alias="timeLimitSeconds", ge=1, le=30)


class RouteOptimizationResponse(ApiModel):
    route_id: int = Field(serialization_alias="routeId")
    ordered_node_ids: list[int] = Field(serialization_alias="orderedNodeIds")
    original_distance_meters: int = Field(serialization_alias="originalDistanceMeters")
    optimized_distance_meters: int = Field(serialization_alias="optimizedDistanceMeters")
    savings_percent: float = Field(serialization_alias="savingsPercent")
    applied: bool


class DashboardResponse(ApiModel):
    routes: list[RouteRead]
    nodes: list[NodeRead]
    totals: dict[str, int]


class AdminAccountRead(ApiModel):
    id: int
    email: str
    display_name: str = Field(serialization_alias="displayName")
    created_at: datetime = Field(serialization_alias="createdAt")
    api_key_count: int = Field(serialization_alias="apiKeyCount")
    active_api_key_count: int = Field(serialization_alias="activeApiKeyCount")
    request_count: int = Field(serialization_alias="requestCount")
    last_request_at: datetime | None = Field(serialization_alias="lastRequestAt")


class AdminUsagePathRead(ApiModel):
    path: str
    requests: int


class GrafanaNotificationRead(ApiModel):
    id: int
    state: str
    severity: str
    title: str
    message: str | None
    dashboard_url: str | None = Field(serialization_alias="dashboardUrl")
    created_at: datetime = Field(serialization_alias="createdAt")


class AdminOverviewResponse(ApiModel):
    accounts: int
    active_api_keys: int = Field(serialization_alias="activeApiKeys")
    requests_24h: int = Field(serialization_alias="requests24h")
    firing_alerts: int = Field(serialization_alias="firingAlerts")
    usage_paths: list[AdminUsagePathRead] = Field(serialization_alias="usagePaths")
    grafana_url: str = Field(serialization_alias="grafanaUrl")
    prometheus_url: str = Field(serialization_alias="prometheusUrl")


class AdminSystemMetrics(ApiModel):
    api_up: bool | None = Field(serialization_alias="apiUp")
    api_memory_bytes: float | None = Field(serialization_alias="apiMemoryBytes")
    api_cpu_cores: float | None = Field(serialization_alias="apiCpuCores")
    api_open_fds: float | None = Field(serialization_alias="apiOpenFds")
    request_p95_seconds: float | None = Field(serialization_alias="requestP95Seconds")
    error_rate_percent: float | None = Field(serialization_alias="errorRatePercent")
    database_up: bool | None = Field(serialization_alias="databaseUp")
    database_memory_bytes: float | None = Field(serialization_alias="databaseMemoryBytes")
    database_size_bytes: float | None = Field(serialization_alias="databaseSizeBytes")
    database_connections: float | None = Field(serialization_alias="databaseConnections")
    database_cache_hit_percent: float | None = Field(serialization_alias="databaseCacheHitPercent")
    prometheus_reachable: bool = Field(serialization_alias="prometheusReachable")
    collected_at: datetime = Field(serialization_alias="collectedAt")


class DeveloperRegisterRequest(ApiModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=10, max_length=200)
    display_name: str = Field(
        validation_alias="displayName",
        serialization_alias="displayName",
        min_length=2,
        max_length=120,
    )

    @field_validator("email")
    @classmethod
    def clean_email(cls, value: str) -> str:
        value = value.strip().lower()
        if "@" not in value or value.startswith("@") or value.endswith("@"):
            raise ValueError("Enter a valid email address")
        return value


class DeveloperLoginRequest(ApiModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=1, max_length=200)


class DeveloperAccountRead(ApiModel):
    id: int
    email: str
    display_name: str = Field(serialization_alias="displayName")
    created_at: datetime = Field(serialization_alias="createdAt")


class DeveloperAuthResponse(ApiModel):
    token: str
    account: DeveloperAccountRead


class ApiKeyCreate(ApiModel):
    name: str = Field(min_length=2, max_length=100)


class ApiKeyRead(ApiModel):
    id: int
    name: str
    prefix: str
    monthly_quota: int = Field(serialization_alias="monthlyQuota")
    hourly_limit: int = Field(serialization_alias="hourlyLimit")
    created_at: datetime = Field(serialization_alias="createdAt")
    revoked_at: datetime | None = Field(serialization_alias="revokedAt")
    expires_at: datetime = Field(serialization_alias="expiresAt")
    last_used_at: datetime | None = Field(serialization_alias="lastUsedAt")
    rotated_from_id: int | None = Field(serialization_alias="rotatedFromId")
    scopes: str = "routes:read"


class ApiKeyCreated(ApiKeyRead):
    key: str


class UsageSummary(ApiModel):
    used: int
    quota: int
    remaining: int
    period_start: datetime = Field(serialization_alias="periodStart")
    recent_paths: dict[str, int] = Field(serialization_alias="recentPaths")
    estimated_cost_usd: float | None = Field(serialization_alias="estimatedCostUsd")


class ContributionPreviewRequest(ApiModel):
    waypoints: list[Coordinate] = Field(min_length=2, max_length=40)


class ContributionPreviewResponse(ApiModel):
    coordinates: list[tuple[float, float]]
    distance_meters: int = Field(serialization_alias="distanceMeters")
    duration_minutes: int = Field(serialization_alias="durationMinutes")
    geometry_source: str = Field(serialization_alias="geometrySource")


class RouteContributionCreate(ContributionPreviewRequest):
    name: str = Field(min_length=3, max_length=120)
    notes: str | None = Field(default=None, max_length=1000)
    contributor_alias: str | None = Field(
        default=None,
        validation_alias="contributorAlias",
        serialization_alias="contributorAlias",
        max_length=120,
    )

    @field_validator("name")
    @classmethod
    def clean_contribution_name(cls, value: str) -> str:
        cleaned = normalize_plain_text(value)
        if not cleaned:
            raise ValueError("Route name cannot be blank")
        return cleaned

    @field_validator("notes", "contributor_alias")
    @classmethod
    def clean_optional_contribution_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_plain_text(value) or None


class RouteContributionRead(ApiModel):
    id: int
    name: str
    status: str
    created_at: datetime = Field(serialization_alias="createdAt")


class PasswordRecoveryRequest(ApiModel):
    email: str = Field(min_length=5, max_length=254)

    @field_validator("email")
    @classmethod
    def clean_email(cls, value: str) -> str:
        return value.strip().lower()


class PasswordRecoveryResponse(ApiModel):
    message: str
    debug_token: str | None = Field(default=None, serialization_alias="debugToken")


class PasswordResetRequest(ApiModel):
    token: str = Field(min_length=20, max_length=200)
    password: str = Field(min_length=10, max_length=200)


class CommunityPostCreate(ApiModel):
    route_id: int | None = Field(
        default=None, validation_alias="routeId", serialization_alias="routeId"
    )
    kind: str = Field(default="tip", pattern="^(tip|discussion)$")
    title: str = Field(min_length=3, max_length=120)
    body: str = Field(min_length=3, max_length=1500)

    @field_validator("title", "body")
    @classmethod
    def clean_text(cls, value: str) -> str:
        cleaned = normalize_plain_text(value)
        if not cleaned:
            raise ValueError("Text cannot be blank")
        return cleaned


class CommunityPostRead(ApiModel):
    id: int
    route_id: int | None = Field(serialization_alias="routeId")
    kind: str
    title: str
    body: str
    author_name: str = Field(serialization_alias="authorName")
    created_at: datetime = Field(serialization_alias="createdAt")
