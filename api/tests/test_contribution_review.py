"""Automated contribution checks: shape, service area, and duplicate detection."""

from app.services.contribution_review import (
    KnownRoute,
    Point,
    check_shape,
    find_duplicates,
    haversine_meters,
    review_contribution,
)

# Real Gaborone landmarks, roughly 2.5 km apart.
BROADHURST = Point(-24.6300, 25.9400)
MAIN_MALL = Point(-24.6541, 25.9086)
BBS_MALL = Point(-24.6512, 25.9200)


def test_haversine_is_close_to_known_distances() -> None:
    assert 0 <= haversine_meters(BROADHURST, BROADHURST) < 1
    assert 3_800 < haversine_meters(BROADHURST, MAIN_MALL) < 4_400


def test_a_plausible_corridor_passes() -> None:
    blocking, warnings, total = check_shape([BROADHURST, BBS_MALL, MAIN_MALL])

    assert blocking == []
    assert warnings == []
    assert total > 3_000


def test_shapes_that_cannot_be_a_combi_corridor_are_blocked() -> None:
    too_few, _, _ = check_shape([BROADHURST])
    outside, _, _ = check_shape([BROADHURST, Point(-26.2, 28.0)])
    far_apart = [Point(-24.4, 25.6), Point(-24.85, 26.15)]
    too_far, _, _ = check_shape(far_apart)
    too_many, _, _ = check_shape([BROADHURST, MAIN_MALL] * 21)

    assert "at least two points" in too_few[0]
    assert any("service area" in message for message in outside)
    assert any("25 km" in message for message in too_far)
    assert any("at most 40" in message for message in too_many)


def test_points_on_top_of_each_other_only_warn() -> None:
    blocking, warnings, _ = check_shape([BROADHURST, Point(-24.63001, 25.94001), MAIN_MALL])

    assert blocking == []
    assert any("on top of each other" in message for message in warnings)


def test_duplicates_are_found_by_name_or_by_shared_corridor() -> None:
    known = [
        KnownRoute(1, "Broadhurst Route 1", (BROADHURST, BBS_MALL, MAIN_MALL)),
        KnownRoute(2, "Village to Rank", (Point(-24.5, 25.7), Point(-24.55, 25.75))),
    ]

    same_corridor = find_duplicates(
        "Something completely different", [BROADHURST, BBS_MALL, MAIN_MALL], known
    )
    similar_name = find_duplicates(
        "broadhurst route 1!", [Point(-24.8, 26.1), Point(-24.85, 26.15)], known
    )
    unrelated = find_duplicates(
        "Airport shuttle", [Point(-24.8, 26.1), Point(-24.85, 26.15)], known
    )

    assert [d["routeId"] for d in same_corridor] == [1]
    assert same_corridor[0]["reasons"] == ["same corridor"]
    assert similar_name and similar_name[0]["reasons"] == ["similar name"]
    assert unrelated == []


def test_review_flags_duplicates_without_blocking_and_serialises() -> None:
    known = [KnownRoute(1, "Broadhurst Route 1", (BROADHURST, BBS_MALL, MAIN_MALL))]

    result = review_contribution(
        "Broadhurst Route 1 again", [BROADHURST, BBS_MALL, MAIN_MALL], known
    )

    assert result.ok
    assert result.duplicates and "may duplicate" in result.warnings[-1]
    payload = result.as_json()
    assert set(payload) == {"blocking", "warnings", "duplicates", "totalMeters"}


def test_blocking_shapes_skip_duplicate_search() -> None:
    known = [KnownRoute(1, "Broadhurst Route 1", (BROADHURST, MAIN_MALL))]

    result = review_contribution("Broadhurst Route 1", [BROADHURST], known)

    assert not result.ok
    assert result.duplicates == []
