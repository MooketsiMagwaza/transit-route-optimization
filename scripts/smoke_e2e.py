"""End-to-end smoke test against the running local Compose stack.

    python scripts/smoke_e2e.py

Exercises the public API, scopes and headers, the admin boundary, soft delete and restore,
moderation and the audit trail, idempotent posts, reporting and auto-hide, contribution review and
publishing, throttling, privacy export and deletion, the scheduler's metrics, and the portal
sandbox. It creates real rows, so it removes everything it created when it finishes (even on
failure). It needs the demo account, which only exists in the local Compose stack.
"""

import atexit
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid

API = "http://localhost:8000"
PORTAL = "http://localhost:3003"
results = []


def call(method, url, body=None, headers=None, raw=False):
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(url, data=data, method=method, headers={"Content-Type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = response.read()
            return response.status, dict(response.headers), (payload if raw else (json.loads(payload) if payload else None))
    except urllib.error.HTTPError as error:
        payload = error.read()
        try:
            parsed = json.loads(payload) if payload else None
        except ValueError:
            parsed = payload.decode(errors="replace")
        return error.code, dict(error.headers), parsed


def check(name, condition, detail=""):
    results.append((name, bool(condition)))
    print(("PASS  " if condition else "FAIL  ") + name + (f"  [{detail}]" if detail and not condition else ""))


def psql(sql):
    out = subprocess.run(["docker", "compose", "exec", "-T", "db", "psql", "-U", "transitsym", "-d", "transit", "-tAc", sql], capture_output=True, text=True)
    return (out.stdout + out.stderr).strip()


def psql_script(sql):
    subprocess.run(
        ["docker", "compose", "exec", "-T", "db", "psql", "-U", "transitsym", "-d", "transit", "-v", "ON_ERROR_STOP=1", "-q"],
        input=sql, text=True, capture_output=True,
    )


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


suffix = uuid.uuid4().hex[:8]


def cleanup():
    """Remove every row this run created. AuditEvent rows are append-only by design and stay."""
    psql_script(f"""
        BEGIN;
        DELETE FROM "ContentReport" WHERE "targetType" = 'post' AND "targetId" IN (SELECT id FROM "CommunityPost" WHERE title = 'Smoke tip {suffix}');
        DELETE FROM "CommunityPost" WHERE title = 'Smoke tip {suffix}';
        DELETE FROM "RouteContribution" WHERE name LIKE '%{suffix}';
        DELETE FROM "Route" WHERE name LIKE '%{suffix}';
        DELETE FROM "ApiKey" WHERE name = 'smoke-{suffix}';
        DELETE FROM "DeveloperAccount" WHERE email LIKE '%-{suffix}@example.test'
           OR (email LIKE 'deleted-%@deleted.invalid' AND "deletedAt" > now() - interval '2 hours');
        DELETE FROM "IdempotencyRecord" WHERE "createdAt" > now() - interval '2 hours' AND scope = 'community.post';
        DELETE FROM "AuthAttempt" WHERE "occurredAt" > now() - interval '2 hours';
        COMMIT;
    """)
    print("cleaned up test data")


atexit.register(cleanup)

# ---- authentication and roles
status, _, admin = call("POST", f"{API}/api/developer/login", {"email": "demo@tsela.local", "password": "TselaDemo2026!"})
check("demo admin can sign in", status == 200, status)
admin_token = admin["token"]

# ---- public API: scopes, headers, accounting
status, headers, _ = call("GET", f"{API}/v1/routes")
check("v1 without a key is 401 and versioned", status == 401 and {k.lower(): v for k, v in headers.items()}.get("x-api-version") == "v1", (status, headers))

status, _, key = call("POST", f"{API}/api/developer/keys", {"name": f"smoke-{suffix}"}, bearer(admin_token))
check("key creation returns a scoped key", status == 201 and key.get("scopes") == "routes:read", key)
raw_key = key["key"]
status, headers, routes = call("GET", f"{API}/v1/routes?limit=2", headers={"X-API-Key": raw_key})
check("v1 routes returns 200", status == 200, status)
lower = {k.lower(): v for k, v in headers.items()}
check("rate-limit and quota headers present", all(h in lower for h in ("x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset", "x-quota-limit", "x-quota-remaining", "x-api-version", "x-request-id")), sorted(lower))
check("route payload has provenance fields", routes and all(f in routes[0] for f in ("publicId", "updatedAt", "source", "verificationStatus", "verifiedAt")), routes[:1])
time.sleep(1)
usage = psql(f"select \"statusCode\", \"latencyMs\" is not null, \"requestId\" is not null from \"ApiUsage\" u join \"ApiKey\" k on k.id=u.\"apiKeyId\" where k.name='smoke-{suffix}' order by u.id desc limit 1")
check("usage row finalised with status, latency, request id", usage.startswith("200|t|t"), usage)
psql(f"update \"ApiKey\" set scopes='' where name='smoke-{suffix}'")
status, _, _ = call("GET", f"{API}/v1/routes", headers={"X-API-Key": raw_key})
check("a key without the scope gets 403", status == 403, status)
status, _, _ = call("GET", f"{API}/v1/routes/1/geometry", headers={"X-API-Key": "tos_live_definitely_not_valid_key_1234567890"})
check("an invalid key gets 401", status == 401, status)

# ---- admin boundary
status, _, pages = call("GET", f"{API}/api/admin/handbook", headers=bearer(admin_token))
check("admin can list the handbook", status == 200 and len(pages) >= 20, status)
status, _, page = call("GET", f"{API}/api/admin/handbook/work-orders", headers=bearer(admin_token))
check("admin can read a handbook page", status == 200 and page["markdown"].startswith("#"), status)
email = f"rider-{suffix}@example.test"
status, _, rider = call("POST", f"{API}/api/developer/register", {"email": email, "password": "a-long-rider-password", "displayName": "Smoke Rider"})
check("a rider can register", status == 201, (status, rider))
rider_token = rider["token"]
status, _, _ = call("GET", f"{API}/api/admin/handbook", headers=bearer(rider_token))
check("a non-admin cannot read the handbook", status == 403, status)
status, _, _ = call("GET", f"{API}/api/admin/handbook")
check("anonymous cannot read the handbook", status == 401, status)
status, _, _ = call("POST", f"{API}/api/routes", {"name": "Injected"})
check("anonymous cannot create a route", status == 401, status)
status, _, _ = call("POST", f"{API}/api/routes", {"name": "Injected"}, bearer(rider_token))
check("a rider cannot create a route", status == 403, status)

# ---- soft delete and restore (on a temporary route)
status, _, temp = call("POST", f"{API}/api/routes", {"name": f"Temp {suffix}", "description": "smoke"}, bearer(admin_token))
check("admin can create a route with a public id", status == 201 and temp.get("publicId"), (status, temp))
status, _, _ = call("DELETE", f"{API}/api/routes/{temp['id']}", headers=bearer(admin_token))
check("admin can delete a route", status == 200, status)
status, _, _ = call("GET", f"{API}/api/routes/{temp['id']}")
check("a deleted route is hidden", status == 404, status)
status, _, _ = call("POST", f"{API}/api/admin/moderation/routes/{temp['id']}/restore", headers=bearer(admin_token))
check("admin can restore it", status == 204, status)
status, _, _ = call("GET", f"{API}/api/routes/{temp['id']}")
check("the restored route is visible again", status == 200, status)

# ---- verification and audit
status, _, _ = call("POST", f"{API}/api/admin/moderation/routes/{temp['id']}/verify", {"status": "field_verified", "note": "smoke"}, bearer(admin_token))
check("admin can mark a route field verified", status == 204, status)
status, _, fresh = call("GET", f"{API}/api/routes/{temp['id']}")
check("verification is visible to riders", fresh.get("verificationStatus") == "field_verified" and fresh.get("verifiedAt"), fresh)
status, _, audit = call("GET", f"{API}/api/admin/moderation/audit", headers=bearer(admin_token))
actions = {event["action"] for event in audit}
check("decisions are audited", {"route.delete", "route.restore", "route.verify"} <= actions, actions)
update = psql("update \"AuditEvent\" set action='tampered' where id=(select min(id) from \"AuditEvent\")")
check("the audit trail cannot be edited", "append-only" in update, update)
delete = psql("delete from \"AuditEvent\"")
check("the audit trail cannot be deleted from", "append-only" in delete, delete)

# ---- community: idempotency, reports, auto-hide
post_body = {"kind": "tip", "title": f"Smoke tip {suffix}", "body": "Ask for the stop before the rank."}
idem = uuid.uuid4().hex
status, _, first = call("POST", f"{API}/api/community/posts", post_body, {**bearer(rider_token), "Idempotency-Key": idem})
status2, _, second = call("POST", f"{API}/api/community/posts", post_body, {**bearer(rider_token), "Idempotency-Key": idem})
check("a repeated Idempotency-Key returns the same post", status == 201 and status2 in (200, 201) and first["id"] == second["id"], (first, second))
count = psql(f"select count(*) from \"CommunityPost\" where title='Smoke tip {suffix}'")
check("only one post was created", count == "1", count)
reporters = []
for index in range(3):
    mail = f"reporter{index}-{suffix}@example.test"
    _, _, other = call("POST", f"{API}/api/developer/register", {"email": mail, "password": "a-long-rider-password", "displayName": f"Reporter {index}"})
    reporters.append(other["token"])
for token in reporters:
    call("POST", f"{API}/api/community/reports", {"targetType": "post", "targetId": first["id"], "reason": "spam"}, bearer(token))
posts_visible = call("GET", f"{API}/api/community/posts?query=Smoke%20tip%20{suffix}", headers=bearer(rider_token))[2]
check("three reporters auto-hide the post", not any(p["id"] == first["id"] for p in posts_visible), posts_visible)
status, _, reports = call("GET", f"{API}/api/admin/moderation/reports", headers=bearer(admin_token))
check("moderators see the report queue", status == 200 and any(r["targetId"] == first["id"] for r in reports), status)
status, _, summary = call("GET", f"{API}/api/admin/moderation/summary", headers=bearer(admin_token))
check("moderation summary works", status == 200 and summary["openReports"] >= 1, summary)

# ---- contribution review and publishing
waypoints = [{"lat": -24.6300, "long": 25.9400}, {"lat": -24.6400, "long": 25.9300}, {"lat": -24.6541, "long": 25.9086}]
status, _, contribution = call("POST", f"{API}/api/community/routes", {"name": f"Smoke corridor {suffix}", "notes": "e2e", "waypoints": waypoints}, bearer(rider_token))
if status == 422 and "road-following" in json.dumps(contribution):
    print("SKIP  contribution publishing (the public road router is unreachable from here)")
else:
    check("a contribution is queued with its review", status == 201, (status, contribution))
    status, _, queue = call("GET", f"{API}/api/admin/moderation/contributions", headers=bearer(admin_token))
    found = [c for c in queue if c["id"] == contribution["id"]]
    check("the queue shows the contribution with validation", status == 200 and found and "duplicates" in found[0]["validation"], found)
    status, _, approved = call("POST", f"{API}/api/admin/moderation/contributions/{contribution['id']}/approve", {"overrideDuplicate": True}, bearer(admin_token))
    check("an admin can publish it", status == 200 and approved["publishedRouteId"], (status, approved))
    published = call("GET", f"{API}/api/routes/{approved['publishedRouteId']}")[2] if status == 200 else {}
    check("the published route is community sourced and unverified", published.get("source") == "community" and published.get("verificationStatus") == "unverified", published)
far = [{"lat": -24.63, "long": 25.94}, {"lat": -26.2, "long": 28.0}]
status, _, _ = call("POST", f"{API}/api/community/routes", {"name": "Too far away", "waypoints": far}, bearer(rider_token))
check("an out-of-area contribution is rejected", status == 422, status)

# ---- throttling
codes = [call("POST", f"{API}/api/developer/login", {"email": f"nobody-{suffix}@example.test", "password": "wrong-password-1"})[0] for _ in range(12)]
check("repeated bad sign-ins are throttled", 429 in codes and codes[0] == 401, codes)

# ---- privacy
status, _, _ = call("POST", f"{API}/api/privacy/consent", {"choice": "necessary", "policyVersion": "2026-09-19", "visitorId": uuid.uuid4().hex, "source": "marketing"})
check("consent is recorded", status == 204, status)
status, _, exported = call("GET", f"{API}/api/developer/export", headers=bearer(rider_token), raw=True)
export_json = json.loads(exported) if status == 200 else {}
check("export contains the account and its post", status == 200 and export_json["account"]["email"] == email and export_json["communityPosts"], status)
check("export never includes secrets", "passwordHash" not in exported.decode() and "tos_live_" not in exported.decode())
status, _, _ = call("DELETE", f"{API}/api/developer/account", {"confirmEmail": "wrong@example.test"}, bearer(rider_token))
check("deletion needs the matching email", status == 422, status)
status, _, _ = call("DELETE", f"{API}/api/developer/account", {"confirmEmail": email}, bearer(rider_token))
check("a rider can delete their account", status == 204, status)
status, _, _ = call("GET", f"{API}/api/developer/me", headers=bearer(rider_token))
check("the deleted account's session no longer works", status in (401, 403), status)
row = psql(f"select count(*) from \"DeveloperAccount\" where email='{email}'")
check("the email is gone from the database", row == "0", row)
status, _, _ = call("POST", f"{API}/api/developer/login", {"email": email, "password": "a-long-rider-password"})
check("the deleted account cannot sign in", status in (401, 403), status)

# ---- uploads disabled by default
status, _, _ = call("POST", f"{API}/api/uploads/intents", {"purpose": "profile", "contentType": "image/png", "sizeBytes": 1000, "sha256": "a" * 64}, bearer(admin_token))
check("uploads are disabled until an object store is configured", status == 503, status)

# ---- scheduler and metrics
time.sleep(2)
runs = psql("select string_agg(distinct \"jobName\", ',') from \"MaintenanceRun\" where status='succeeded'")
check("the scheduler ran the lifecycle jobs", all(j in runs for j in ("cleanup-auth", "prune-usage", "key-rotation-audit", "route-freshness")), runs)
metrics = call("GET", f"{API}/metrics/", raw=True)[2].decode()
check("job health metrics are exported", "tsela_maintenance_last_success_timestamp_seconds" in metrics and "tsela_maintenance_last_run_failed" in metrics)

# ---- developer portal sandbox
status, _, session_login = call("POST", f"{API}/api/developer/login", {"email": "demo@tsela.local", "password": "TselaDemo2026!"})
cookie = {"Cookie": f"tsela.developer-session={session_login['token']}"}
status, _, sandbox = call("POST", f"{PORTAL}/api/sandbox", {"slug": "routes/list", "params": {"limit": "2"}}, cookie)
check("the sandbox returns a real response", status == 200 and sandbox["status"] == 200 and "x-ratelimit-remaining" in sandbox["headers"], (status, sandbox))
check("the sandbox never leaks its key", "tos_live_local_docs" not in json.dumps(sandbox))
status, _, blocked = call("POST", f"{PORTAL}/api/sandbox", {"slug": "routes/list", "params": {"limit": "500"}}, cookie)
check("the sandbox validates parameters", status == 422, (status, blocked))
status, _, _ = call("POST", f"{PORTAL}/api/sandbox", {"slug": "../../api/admin/overview", "params": {}}, cookie)
check("the sandbox refuses anything not in the catalog", status == 404, status)
status, _, _ = call("POST", f"{PORTAL}/api/sandbox", {"slug": "routes/list", "params": {}})
check("the sandbox needs a session", status == 401, status)

passed = sum(1 for _, ok in results if ok)
print(f"\n{passed}/{len(results)} checks passed")
sys.exit(0 if passed == len(results) else 1)
