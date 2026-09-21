"""SQLAlchemy models for routes, accounts, credentials, usage, and community data."""

from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import JSON, DateTime, Float, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Route(Base):
    __tablename__ = "Route"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    nodes: Mapped[list["Node"]] = relationship(
        back_populates="route", cascade="all, delete-orphan", passive_deletes=True
    )


class Node(Base):
    __tablename__ = "Node"
    __table_args__ = (
        Index("ix_node_route_order", "routeId", "orderNum"),
        Index("ix_node_geom_gist", "geom", postgresql_using="gist"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    route_id: Mapped[int] = mapped_column(
        "routeId", ForeignKey("Route.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    long: Mapped[float] = mapped_column(Float, nullable=False)
    order_num: Mapped[int] = mapped_column("orderNum", Integer, nullable=False)
    geom: Mapped[object | None] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False), nullable=True
    )

    route: Mapped[Route] = relationship(back_populates="nodes")


class DeveloperAccount(Base):
    __tablename__ = "DeveloperAccount"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(254), nullable=False, unique=True, index=True)
    display_name: Mapped[str] = mapped_column("displayName", String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column("passwordHash", String(512), nullable=False)
    role: Mapped[str] = mapped_column(String(24), nullable=False, default="developer", index=True)
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    sessions: Mapped[list["DeveloperSession"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )
    api_keys: Mapped[list["ApiKey"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )
    community_posts: Mapped[list["CommunityPost"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )


class DeveloperSession(Base):
    __tablename__ = "DeveloperSession"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(
        "accountId", ForeignKey("DeveloperAccount.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column("tokenHash", String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(
        "expiresAt", DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    account: Mapped[DeveloperAccount] = relationship(back_populates="sessions")


class ApiKey(Base):
    __tablename__ = "ApiKey"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(
        "accountId", ForeignKey("DeveloperAccount.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    prefix: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    secret_hash: Mapped[str] = mapped_column("secretHash", String(64), nullable=False, unique=True)
    monthly_quota: Mapped[int] = mapped_column(
        "monthlyQuota", Integer, nullable=False, default=10000
    )
    hourly_limit: Mapped[int] = mapped_column("hourlyLimit", Integer, nullable=False, default=100)
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column("revokedAt", DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(
        "expiresAt", DateTime(timezone=True), nullable=False
    )
    last_used_at: Mapped[datetime | None] = mapped_column("lastUsedAt", DateTime(timezone=True))
    rotated_from_id: Mapped[int | None] = mapped_column(
        "rotatedFromId", ForeignKey("ApiKey.id", ondelete="SET NULL"), index=True
    )
    scopes: Mapped[str] = mapped_column(
        String(200), nullable=False, default="routes:read", server_default="routes:read"
    )

    account: Mapped[DeveloperAccount] = relationship(back_populates="api_keys")

    @property
    def scope_list(self) -> list[str]:
        """Space-separated scopes such as ``routes:read``; empty means no access."""

        return self.scopes.split()
    usage_events: Mapped[list["ApiUsage"]] = relationship(
        back_populates="api_key", cascade="all, delete-orphan"
    )


class ApiUsage(Base):
    __tablename__ = "ApiUsage"
    __table_args__ = (
        Index("ix_api_usage_key_time", "apiKeyId", "occurredAt"),
        Index("ix_api_usage_occurred_at", "occurredAt"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    api_key_id: Mapped[int] = mapped_column(
        "apiKeyId", ForeignKey("ApiKey.id", ondelete="CASCADE"), nullable=False
    )
    method: Mapped[str] = mapped_column(String(10), nullable=False)
    path: Mapped[str] = mapped_column(String(300), nullable=False)
    # 0 marks a request that was admitted but has not been finalised (for example a crash).
    status_code: Mapped[int] = mapped_column("statusCode", Integer, nullable=False, default=0)
    latency_ms: Mapped[int | None] = mapped_column("latencyMs", Integer)
    request_id: Mapped[str | None] = mapped_column("requestId", String(64))
    occurred_at: Mapped[datetime] = mapped_column(
        "occurredAt", DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    api_key: Mapped[ApiKey] = relationship(back_populates="usage_events")


class RouteContribution(Base):
    __tablename__ = "RouteContribution"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int | None] = mapped_column(
        "accountId", ForeignKey("DeveloperAccount.id", ondelete="SET NULL"), index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    contributor_alias: Mapped[str | None] = mapped_column("contributorAlias", String(120))
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending_review")
    waypoints: Mapped[list] = mapped_column(JSON, nullable=False)
    geometry: Mapped[list] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class PasswordResetToken(Base):
    """One-use, hashed recovery token; the raw token is never persisted."""

    __tablename__ = "PasswordResetToken"
    __table_args__ = (Index("ix_password_reset_account_time", "accountId", "expiresAt"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(
        "accountId", ForeignKey("DeveloperAccount.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column("tokenHash", String(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        "expiresAt", DateTime(timezone=True), nullable=False
    )
    used_at: Mapped[datetime | None] = mapped_column("usedAt", DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class CommunityPost(Base):
    """A plain-text rider tip or discussion attached optionally to a route."""

    __tablename__ = "CommunityPost"
    __table_args__ = (
        Index("ix_community_post_route_time", "routeId", "createdAt"),
        Index("ix_community_post_status_time", "status", "createdAt"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(
        "accountId", ForeignKey("DeveloperAccount.id", ondelete="CASCADE"), nullable=False
    )
    route_id: Mapped[int | None] = mapped_column(
        "routeId", ForeignKey("Route.id", ondelete="SET NULL"), index=True
    )
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default="tip")
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="published")
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    account: Mapped[DeveloperAccount] = relationship(back_populates="community_posts")


class GrafanaNotification(Base):
    """Durable alert notification delivered by the provisioned Grafana webhook."""

    __tablename__ = "GrafanaNotification"
    __table_args__ = (Index("ix_grafana_notification_state_time", "state", "createdAt"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fingerprint: Mapped[str | None] = mapped_column(String(160), index=True)
    state: Mapped[str] = mapped_column(String(30), nullable=False, default="firing")
    severity: Mapped[str] = mapped_column(String(30), nullable=False, default="warning")
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    message: Mapped[str | None] = mapped_column(Text)
    dashboard_url: Mapped[str | None] = mapped_column("dashboardUrl", String(500))
    payload: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        "createdAt", DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class MaintenanceRun(Base):
    """Idempotency and audit record for scheduled platform maintenance."""

    __tablename__ = "MaintenanceRun"
    __table_args__ = (Index("ix_maintenance_job_time", "jobName", "startedAt"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_name: Mapped[str] = mapped_column("jobName", String(80), nullable=False)
    run_id: Mapped[str] = mapped_column("runId", String(120), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="running")
    rows_affected: Mapped[int] = mapped_column("rowsAffected", Integer, nullable=False, default=0)
    detail: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    started_at: Mapped[datetime] = mapped_column(
        "startedAt", DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    finished_at: Mapped[datetime | None] = mapped_column("finishedAt", DateTime(timezone=True))
