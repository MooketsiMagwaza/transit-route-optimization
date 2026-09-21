"""Idempotent community-sourced starter data for Gaborone.

The route relationships come from the user-supplied Gaborone combi route post.
Landmark coordinates were geocoded from OpenStreetMap in September 2026. These
are editable starter corridors, not an official operator schedule.
"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app.config import get_settings
from app.database import SessionLocal
from app.models import ApiKey, DeveloperAccount, Node, Route
from app.services.security import hash_password, hash_token, key_prefix


@dataclass(frozen=True)
class SeedStop:
    name: str
    lat: float
    long: float


@dataclass(frozen=True)
class SeedRoute:
    name: str
    stops: tuple[SeedStop, ...]


AIRPORT_JUNCTION = SeedStop("Airport Junction", -24.6042148, 25.9254803)
BBS_MALL = SeedStop("BBS Mall", -24.6270524, 25.9354447)
AFRICAN_MALL = SeedStop("African Mall", -24.6638883, 25.9165431)
RIVERWALK = SeedStop("Riverwalk Mall", -24.6766577, 25.9354980)
NORTH_GATE = SeedStop("North Gate Mall", -24.6075702, 25.9330913)
WESTGATE = SeedStop("Westgate Mall", -24.6375024, 25.8935925)
GAME_CITY = SeedStop("Game City", -24.6866328, 25.8789722)
FAIRGROUNDS = SeedStop("Fairgrounds Mall", -24.6831718, 25.9111604)
SOUTH_RING = SeedStop("South Ring Mall", -24.6679372, 25.9203156)
MAIN_MALL = SeedStop("Main Mall", -24.6581596, 25.9159428)
MOLAPO = SeedStop("Molapo Crossing", -24.6430481, 25.8857696)
ACACIA = SeedStop("Acacia Mall", -24.5511885, 25.9869043)
TLOKWENG = SeedStop("Tlokweng", -24.6673770, 25.9719810)
BROADHURST = SeedStop("Broadhurst", -24.6289613, 25.9436703)
BLOCK_8 = SeedStop("Block 8", -24.6011186, 25.9150728)
PHAKALANE = SeedStop("Phakalane", -24.5524245, 25.9867821)
MOGODITSHANE = SeedStop("Mogoditshane", -24.6282115, 25.8691824)

SEED_ROUTES = (
    SeedRoute(
        "Tlokweng Route 1",
        (TLOKWENG, RIVERWALK, SOUTH_RING, AFRICAN_MALL, MAIN_MALL),
    ),
    SeedRoute(
        "Tlokweng Route 6 - Game City",
        (TLOKWENG, RIVERWALK, FAIRGROUNDS, GAME_CITY),
    ),
    SeedRoute(
        "Broadhurst Route 1",
        (BROADHURST, BBS_MALL, AFRICAN_MALL, MAIN_MALL),
    ),
    SeedRoute(
        "Broadhurst Route 6 - Game City",
        (BROADHURST, BBS_MALL, WESTGATE, MOLAPO, GAME_CITY),
    ),
    SeedRoute(
        "Block 8 Route 3",
        (BLOCK_8, AIRPORT_JUNCTION, BBS_MALL, MAIN_MALL),
    ),
    SeedRoute(
        "Phakalane Phase 2",
        (PHAKALANE, ACACIA, NORTH_GATE, AIRPORT_JUNCTION),
    ),
    SeedRoute(
        "Block 6 / Mogoditshane Route 8",
        (MOGODITSHANE, WESTGATE, MOLAPO),
    ),
)

SEED_DESCRIPTION = (
    "Community-sourced Gaborone starter corridor. Verify stops and alignment "
    "with local operators before production use."
)


def seed() -> int:
    created = 0
    with SessionLocal() as session:
        existing_names = set(session.scalars(select(Route.name)))
        for definition in SEED_ROUTES:
            if definition.name in existing_names:
                continue
            route = Route(name=definition.name, description=SEED_DESCRIPTION)
            session.add(route)
            session.flush()
            for order_num, stop in enumerate(definition.stops, start=1):
                session.add(
                    Node(
                        route_id=route.id,
                        label=f"ROUTE{route.id}-STOP{order_num}",
                        name=stop.name,
                        lat=stop.lat,
                        long=stop.long,
                        order_num=order_num,
                        geom=func.ST_SetSRID(func.ST_MakePoint(stop.long, stop.lat), 4326),
                    )
                )
            created += 1
        session.commit()
    return created


def seed_demo_account() -> bool:
    """Create a predictable account only when the local demo flag is enabled."""

    settings = get_settings()
    if not settings.demo_account_enabled:
        return False
    with SessionLocal() as session:
        account = session.scalar(
            select(DeveloperAccount).where(DeveloperAccount.email == settings.demo_account_email)
        )
        password_hash = hash_password(settings.demo_account_password)
        if account is None:
            session.add(
                DeveloperAccount(
                    email=settings.demo_account_email,
                    display_name=settings.demo_account_name,
                    password_hash=password_hash,
                    role="admin",
                )
            )
        else:
            account.display_name = settings.demo_account_name
            account.password_hash = password_hash
            account.role = "admin"
        session.commit()
    return True


def seed_sandbox_key() -> bool:
    """Provision the documentation sandbox key from ``SANDBOX_API_KEY`` (never a default).

    The key is a normal, hashed, read-only credential owned by a dedicated non-admin
    account with a tight hourly limit, so the docs demo cannot reach anything sensitive.
    """

    settings = get_settings()
    if not settings.sandbox_api_key:
        return False
    with SessionLocal() as session:
        account = session.scalar(
            select(DeveloperAccount).where(DeveloperAccount.email == "sandbox@tsela.local")
        )
        if account is None:
            account = DeveloperAccount(
                email="sandbox@tsela.local",
                display_name="Documentation sandbox",
                # An unusable hash: nobody can sign in as the sandbox account.
                password_hash="!disabled",
                role="sandbox",
            )
            session.add(account)
            session.flush()
        secret_hash = hash_token(settings.sandbox_api_key)
        key = session.scalar(select(ApiKey).where(ApiKey.secret_hash == secret_hash))
        expires_at = datetime.now(UTC) + timedelta(days=settings.api_key_lifetime_days)
        if key is None:
            session.add(
                ApiKey(
                    account_id=account.id,
                    name="Documentation sandbox",
                    prefix=key_prefix(settings.sandbox_api_key),
                    secret_hash=secret_hash,
                    monthly_quota=5000,
                    hourly_limit=settings.sandbox_hourly_limit,
                    scopes="routes:read",
                    expires_at=expires_at,
                )
            )
        else:
            key.revoked_at = None
            key.expires_at = expires_at
            key.scopes = "routes:read"
            key.hourly_limit = settings.sandbox_hourly_limit
        session.commit()
    return True


if __name__ == "__main__":
    count = seed()
    print(f"Seeded {count} Gaborone route(s).")
    if seed_demo_account():
        print("Local developer demo account is ready.")
    if seed_sandbox_key():
        print("Documentation sandbox key is ready.")
