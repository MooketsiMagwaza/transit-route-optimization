// Endpoint-page contract for the public API catalog. Runs with `npm test` (node:test, no dependencies).
// The API-side drift check lives in api/tests/test_public_contract_docs.py.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const catalog = JSON.parse(readFileSync(new URL("../content/api-catalog.json", import.meta.url), "utf8"));
const guides = readFileSync(new URL("../lib/guides.ts", import.meta.url), "utf8");
const REQUIRED = ["slug", "operationId", "group", "method", "path", "title", "summary", "stability", "since", "auth", "quotaCost", "idempotency", "parameters", "response", "errors", "pagination", "caching", "timeout", "freshness", "examples", "sandbox"];

test("every endpoint page has all contract fields", () => {
  assert.ok(catalog.endpoints.length > 0);
  for (const endpoint of catalog.endpoints) {
    for (const field of REQUIRED) assert.ok(endpoint[field] !== undefined && endpoint[field] !== "", `${endpoint.slug} is missing ${field}`);
    assert.ok(endpoint.response.example, `${endpoint.slug} needs a realistic response`);
    assert.ok(endpoint.response.fields.length > 0, `${endpoint.slug} needs a response field table`);
    assert.ok(endpoint.errors.some((error) => error.status === 401) && endpoint.errors.some((error) => error.status === 429), `${endpoint.slug} must document 401 and 429`);
  }
});

test("slugs, paths and operation ids are unique", () => {
  for (const key of ["slug", "operationId"]) {
    const values = catalog.endpoints.map((endpoint) => endpoint[key]);
    assert.equal(new Set(values).size, values.length, `${key} must be unique`);
  }
  const routes = catalog.endpoints.map((endpoint) => `${endpoint.method} ${endpoint.path}`);
  assert.equal(new Set(routes).size, routes.length);
});

test("only versioned public endpoints are documented", () => {
  for (const endpoint of catalog.endpoints) {
    assert.match(endpoint.path, /^\/v\d+\//);
    assert.ok(!endpoint.path.includes("/api/"), "internal routes must never be documented");
  }
});

test("examples use placeholders and server-side credentials only", () => {
  for (const endpoint of catalog.endpoints) {
    for (const [language, code] of Object.entries(endpoint.examples)) {
      assert.match(code, /X-API-Key/, `${endpoint.slug} ${language} example must send the key header`);
      assert.doesNotMatch(code, /tos_(live|session|reset)_/, "examples must not embed a real credential");
    }
    assert.match(endpoint.examples.javascript, /process\.env\.TSELA_API_KEY/, "JavaScript examples read the key from the environment");
    assert.doesNotMatch(endpoint.examples.curl, /[?&](api[_-]?key|key)=/i, "credentials never go in the query string");
  }
});

test("sandbox samples only reference declared parameters and only allow safe methods", () => {
  for (const endpoint of catalog.endpoints.filter((item) => item.sandbox.enabled)) {
    assert.equal(endpoint.method, "GET", "the sandbox may only send safe requests");
    const names = new Set(endpoint.parameters.map((parameter) => parameter.name));
    for (const name of Object.keys(endpoint.sandbox.sample)) assert.ok(names.has(name), `${endpoint.slug} sample uses unknown ${name}`);
    for (const parameter of endpoint.parameters.filter((item) => item.in === "path")) assert.ok(parameter.example !== undefined, `${endpoint.slug} path parameter needs an example`);
  }
});

test("public guides contain no internal operations material", () => {
  for (const term of ["pgBackRest", "Garage", "OpenProject", "runbook", "PITR", "Kubernetes", "handbook"]) {
    assert.ok(!guides.toLowerCase().includes(term.toLowerCase()), `public guides must not mention ${term}`);
  }
});
