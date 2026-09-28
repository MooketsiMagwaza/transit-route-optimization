"""Automated checks on a contributed route before a human moderator decides.

Nothing here publishes anything. It flags what a moderator should look at: shapes that cannot
be a real combi corridor, and contributions that duplicate a route we already publish.
"""

from __future__ import annotations

import math
import re
from collections.abc import Sequence
from dataclasses import dataclass, field
from difflib import SequenceMatcher

from app.services.service_area import is_inside_contribution_area

MIN_WAYPOINTS = 2
MAX_WAYPOINTS = 40
MAX_LEG_METERS = 25_000
MAX_TOTAL_METERS = 60_000
MIN_LEG_METERS = 15
DUPLICATE_NAME_RATIO = 0.86
DUPLICATE_STOP_RADIUS_METERS = 150
DUPLICATE_STOP_SHARE = 0.8


@dataclass(frozen=True)
class Point:
    lat: float
    long: float


@dataclass(frozen=True)
class KnownRoute:
    id: int
    name: str
    stops: tuple[Point, ...]


@dataclass
class ReviewResult:
    blocking: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    duplicates: list[dict] = field(default_factory=list)
    total_meters: int = 0

    @property
    def ok(self) -> bool:
        return not self.blocking

    def as_json(self) -> dict:
        return {
            "blocking": self.blocking,
            "warnings": self.warnings,
            "duplicates": self.duplicates,
            "totalMeters": self.total_meters,
        }


def haversine_meters(a: Point, b: Point) -> float:
    radius = 6_371_000.0
    d_lat = math.radians(b.lat - a.lat)
    d_long = math.radians(b.long - a.long)
    h = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(a.lat)) * math.cos(math.radians(b.lat)) * math.sin(d_long / 2) ** 2
    )
    return 2 * radius * math.asin(math.sqrt(h))


def normalise_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()


def check_shape(points: Sequence[Point]) -> tuple[list[str], list[str], int]:
    """Return ``(blocking, warnings, total_meters)`` for the waypoint sequence."""

    blocking: list[str] = []
    warnings: list[str] = []
    if len(points) < MIN_WAYPOINTS:
        blocking.append("A route needs at least two points")
    if len(points) > MAX_WAYPOINTS:
        blocking.append(f"A route can have at most {MAX_WAYPOINTS} points")
    if not all(is_inside_contribution_area(point) for point in points):
        blocking.append("Every point must be inside the Greater Gaborone service area")

    total = 0.0
    for index in range(1, len(points)):
        leg = haversine_meters(points[index - 1], points[index])
        total += leg
        if leg > MAX_LEG_METERS:
            blocking.append(f"Points {index} and {index + 1} are more than 25 km apart")
        elif leg < MIN_LEG_METERS:
            warnings.append(f"Points {index} and {index + 1} are almost on top of each other")
    if total > MAX_TOTAL_METERS:
        blocking.append("The route is longer than 60 km, which is not a local combi corridor")
    if len(points) >= 3 and haversine_meters(points[0], points[-1]) < MIN_LEG_METERS * 4:
        warnings.append("The route starts and ends in the same place; confirm it is a loop")
    return blocking, warnings, round(total)


def find_duplicates(name: str, points: Sequence[Point], known: Sequence[KnownRoute]) -> list[dict]:
    """Published routes that share a near-identical name or most of their stops."""

    wanted = normalise_name(name)
    found: list[dict] = []
    for route in known:
        ratio = SequenceMatcher(None, wanted, normalise_name(route.name)).ratio()
        shared = 0
        if route.stops:
            shared = sum(
                1
                for point in points
                if any(
                    haversine_meters(point, stop) <= DUPLICATE_STOP_RADIUS_METERS
                    for stop in route.stops
                )
            )
        share = shared / len(points) if points else 0.0
        reasons = []
        if ratio >= DUPLICATE_NAME_RATIO:
            reasons.append("similar name")
        if share >= DUPLICATE_STOP_SHARE:
            reasons.append("same corridor")
        if reasons:
            found.append(
                {
                    "routeId": route.id,
                    "routeName": route.name,
                    "reasons": reasons,
                    "nameSimilarity": round(ratio, 2),
                    "sharedStopShare": round(share, 2),
                }
            )
    return sorted(found, key=lambda item: -item["sharedStopShare"])[:5]


def review_contribution(
    name: str, points: Sequence[Point], known: Sequence[KnownRoute]
) -> ReviewResult:
    blocking, warnings, total = check_shape(points)
    result = ReviewResult(blocking=blocking, warnings=warnings, total_meters=total)
    if not blocking:
        result.duplicates = find_duplicates(name, points, known)
        if result.duplicates:
            result.warnings.append("This may duplicate an existing route")
    return result
