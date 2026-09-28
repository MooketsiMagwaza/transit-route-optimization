"""Shared throttle, soft delete, and write protection, exercised on an in-memory database."""

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.main import app
from app.models import AuthAttempt, CommunityPost, Route
from app.routers.developer import get_current_account
from app.services import throttle


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    AuthAttempt.__table__.create(engine)
    Route.__table__.create(engine)
    CommunityPost.__table__.create(engine)
    with Session(engine, expire_on_commit=False) as db:
        yield db


def test_attempts_are_limited_per_identity_with_an_accurate_retry_after(session: Session) -> None:
    for _ in range(3):
        throttle.enforce(session, "login", "1.2.3.4|a@example.test", limit=3, window_seconds=900)

    with pytest.raises(HTTPException) as caught:
        throttle.enforce(session, "login", "1.2.3.4|A@Example.test", limit=3, window_seconds=900)

    assert caught.value.status_code == 429
    assert 1 <= int(caught.value.headers["Retry-After"]) <= 900
    # A different person, or a different scope, is unaffected.
    throttle.enforce(session, "login", "5.6.7.8|a@example.test", limit=3, window_seconds=900)
    throttle.enforce(session, "recover", "1.2.3.4|a@example.test", limit=3, window_seconds=900)


def test_the_window_slides_and_old_attempts_are_pruned(session: Session) -> None:
    digest_owner = "9.9.9.9"
    throttle.enforce(session, "login", digest_owner, limit=1, window_seconds=60)
    with pytest.raises(HTTPException):
        throttle.enforce(session, "login", digest_owner, limit=1, window_seconds=60)

    session.query(AuthAttempt).update({"occurred_at": datetime.now(UTC) - timedelta(days=3)})
    session.commit()

    throttle.enforce(session, "login", digest_owner, limit=1, window_seconds=60)
    assert throttle.prune(session) == 1
    assert session.scalar(select(AuthAttempt.id).limit(1)) is not None


def test_identities_are_stored_as_digests_not_addresses_or_emails(session: Session) -> None:
    throttle.enforce(session, "login", "victim@example.test", limit=5, window_seconds=60)

    stored = session.scalar(select(AuthAttempt.identity_hash))

    assert len(stored) == 64
    assert "victim" not in stored


def _request(headers: dict[str, str], host: str = "10.0.0.1") -> SimpleNamespace:
    return SimpleNamespace(headers=headers, client=SimpleNamespace(host=host))


def test_forwarded_addresses_are_only_trusted_through_configured_hops() -> None:
    forwarded = {"x-forwarded-for": "6.6.6.6, 203.0.113.9, 10.1.1.1"}

    assert throttle.client_ip(_request(forwarded), Settings(_env_file=None)) == "10.0.0.1"
    one_hop = Settings(_env_file=None, trusted_proxy_hops=1)
    two_hops = Settings(_env_file=None, trusted_proxy_hops=2)
    assert throttle.client_ip(_request(forwarded), one_hop) == "10.1.1.1"
    assert throttle.client_ip(_request(forwarded), two_hops) == "203.0.113.9"


def test_soft_deleted_records_disappear_from_reads_but_can_be_recovered(session: Session) -> None:
    route = Route(name="Broadhurst Route 1")
    session.add(route)
    session.commit()
    route_id = route.id

    route.deleted_at = datetime.now(UTC)
    session.commit()
    session.expire_all()

    assert session.scalar(select(Route).where(Route.id == route_id)) is None
    assert session.scalars(select(Route)).all() == []
    restored = session.execute(
        select(Route).where(Route.id == route_id).execution_options(include_deleted=True)
    ).scalar_one()
    assert restored.deleted_at is not None
    assert restored.public_id is not None


@pytest.fixture
def client():
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [
        ("POST", "/api/routes", {"name": "Injected route"}),
        ("PATCH", "/api/routes/1", {"name": "Renamed"}),
        ("DELETE", "/api/routes/1", None),
        ("POST", "/api/routes/1/nodes", {"name": "Stop", "lat": -24.6, "long": 25.9, "orderNum": 1}),
        ("DELETE", "/api/routes/1/nodes/1", None),
        ("POST", "/api/routes/1/optimize", {"apply": True}),
    ],
)
def test_route_and_stop_writes_reject_anonymous_and_non_admin_callers(client, method, path, body) -> None:
    anonymous = client.request(method, path, json=body)
    assert anonymous.status_code == 401

    app.dependency_overrides[get_current_account] = lambda: SimpleNamespace(id=2, role="developer")
    developer = client.request(method, path, json=body)
    assert developer.status_code == 403
