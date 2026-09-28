"""Fail CI when the public API and its documentation catalog drift apart (WO-15).

The catalog at docs-site/content/api-catalog.json is the source for every endpoint page.
These tests compare it with the OpenAPI document generated from the implemented routes.
"""

import json
import re
from pathlib import Path

import pytest

from app.main import app

CATALOG_PATH = Path(__file__).resolve().parents[2] / "docs-site" / "content" / "api-catalog.json"
PUBLIC_PREFIX = "/v1"
HTTP_METHODS = {"get", "post", "put", "patch", "delete"}
REQUIRED_FIELDS = (
    "slug",
    "operationId",
    "group",
    "method",
    "path",
    "title",
    "summary",
    "stability",
    "since",
    "auth",
    "quotaCost",
    "idempotency",
    "parameters",
    "response",
    "errors",
    "pagination",
    "caching",
    "timeout",
    "freshness",
    "examples",
    "sandbox",
)

if not CATALOG_PATH.is_file():
    pytest.skip("docs-site catalog is not present in this checkout", allow_module_level=True)

CATALOG = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
OPENAPI = app.openapi()


def _implemented() -> dict[tuple[str, str], dict]:
    return {
        (method.upper(), path): operation
        for path, methods in OPENAPI["paths"].items()
        if path.startswith(PUBLIC_PREFIX + "/")
        for method, operation in methods.items()
        if method in HTTP_METHODS
    }


def _documented() -> dict[tuple[str, str], dict]:
    return {(entry["method"], entry["path"]): entry for entry in CATALOG["endpoints"]}


def _resolve(schema: dict) -> dict:
    ref = schema.get("$ref")
    if ref:
        return OPENAPI["components"]["schemas"][ref.rsplit("/", 1)[-1]]
    if "anyOf" in schema:  # Optional[T] is emitted as anyOf [T, null]; use T's constraints.
        merged = {k: v for k, v in schema.items() if k != "anyOf"}
        for option in schema["anyOf"]:
            if option.get("type") != "null":
                merged.update(option)
        return merged
    return schema


def test_every_public_route_has_exactly_one_documentation_page() -> None:
    implemented, documented = set(_implemented()), set(_documented())

    assert implemented - documented == set(), "public routes without a documentation page"
    assert documented - implemented == set(), "documented endpoints that are not implemented"
    assert len(CATALOG["endpoints"]) == len(documented), "duplicate method+path in catalog"


def test_slugs_and_operation_ids_are_unique_and_match_the_api() -> None:
    slugs = [entry["slug"] for entry in CATALOG["endpoints"]]
    assert len(slugs) == len(set(slugs))
    for key, entry in _documented().items():
        assert _implemented()[key]["operationId"] == entry["operationId"]


def test_only_versioned_paths_are_documented() -> None:
    for entry in CATALOG["endpoints"]:
        assert entry["path"].startswith(PUBLIC_PREFIX + "/"), entry["path"]
        assert "/api/" not in entry["path"], "internal routes must not be documented"


@pytest.mark.parametrize("entry", CATALOG["endpoints"], ids=lambda e: e["slug"])
def test_endpoint_satisfies_the_page_contract(entry: dict) -> None:
    for field in REQUIRED_FIELDS:
        assert entry.get(field) not in (None, "", []), f"{entry['slug']} is missing {field}"
    assert entry["auth"]["header"] == "X-API-Key"
    assert entry["auth"]["scope"], "each endpoint must name its required scope"
    assert entry["response"]["example"] not in (None, {}, [])
    assert {"curl", "javascript"} <= set(entry["examples"])
    assert entry["path"].split("{")[0] in entry["examples"]["curl"]
    for code in entry["examples"].values():
        assert "tos_live_" not in code, "examples must not contain a real key"
        assert "X-API-Key" in code
    documented_statuses = {error["status"] for error in entry["errors"]}
    assert {401, 429} <= documented_statuses
    for error in entry["errors"]:
        assert error["meaning"] and error["retry"]


def test_parameters_match_the_implementation() -> None:
    for key, entry in _documented().items():
        operation = _implemented()[key]
        actual = {
            (p["name"], p["in"]): p
            for p in operation.get("parameters", [])
            if p["in"] in ("path", "query")
        }
        declared = {(p["name"], p["in"]): p for p in entry["parameters"]}
        assert set(declared) == set(actual), f"{entry['slug']} parameters differ"
        for name_in, parameter in declared.items():
            schema = _resolve(actual[name_in]["schema"])
            assert parameter["required"] == actual[name_in].get("required", False)
            assert schema.get("default") == parameter.get("default")
            for doc_key, schema_key in (
                ("minimum", "minimum"),
                ("maximum", "maximum"),
                ("maxLength", "maxLength"),
            ):
                if schema_key in schema or doc_key in parameter:
                    assert schema.get(schema_key) == parameter.get(doc_key), (
                        f"{entry['slug']}.{name_in[0]} {doc_key} differs"
                    )


def test_api_key_header_is_a_documented_authentication_requirement() -> None:
    for key in _documented():
        headers = [
            p["name"] for p in _implemented()[key].get("parameters", []) if p["in"] == "header"
        ]
        assert "X-API-Key" in headers


def test_documented_errors_cover_every_declared_failure_status() -> None:
    for key, entry in _documented().items():
        operation = _implemented()[key]
        declared = {int(code) for code in operation["responses"] if not code.startswith("2")}
        documented = {error["status"] for error in entry["errors"]}
        assert declared <= documented, f"{entry['slug']} does not document {declared - documented}"
        assert entry["response"]["status"] == 200
        assert "200" in operation["responses"]


def test_response_examples_only_use_fields_the_api_returns() -> None:
    for key, entry in _documented().items():
        success = _implemented()[key]["responses"]["200"]["content"]["application/json"]["schema"]
        schema = _resolve(success["items"]) if success.get("type") == "array" else _resolve(success)
        example = entry["response"]["example"]
        sample = example[0] if isinstance(example, list) else example
        properties = set(schema["properties"])
        assert set(sample) <= properties, f"{entry['slug']} example has unknown fields"
        documented_fields = {field["name"] for field in entry["response"]["fields"]}
        assert documented_fields == properties, f"{entry['slug']} field table differs"


def test_examples_use_placeholders_not_secrets() -> None:
    text = CATALOG_PATH.read_text(encoding="utf-8")
    assert not re.search(r"tos_(live|session|reset)_[A-Za-z0-9_-]{10,}", text)
