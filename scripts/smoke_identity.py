"""Identity flow smoke test against the local Compose stack with the `identity` profile running.

    docker compose --profile identity up -d
    python scripts/smoke_identity.py                    # operator MFA off (the local default)
    python scripts/smoke_identity.py --mfa-required     # API started with OPERATOR_MFA_REQUIRED=true

Walks one throwaway person through the real provider: sign-up, the confirmation email in Mailpit,
sign-in, an API call with the provider token, password recovery, TOTP enrolment and an aal2
session, the operator MFA gate, logout revocation, and account deletion (which must also remove
the provider user). The account is deleted at the end, even on failure. Local use only.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import html
import json
import re
import struct
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

AUTH = "http://localhost:9999"
MAILPIT = "http://localhost:8025"
API = "http://localhost:8000"
PASSWORD = "Correct-horse-9-battery"
NEW_PASSWORD = "Another-horse-9-staple"

results: list[tuple[bool, str]] = []


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):  # noqa: D401 - urllib hook
        return None


OPENER = urllib.request.build_opener(_NoRedirect)


def call(method, url, body=None, token=None):
    """Return ``(status, json_or_text, headers)`` without following redirects."""

    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        response = OPENER.open(request, timeout=20)
    except urllib.error.HTTPError as error:
        response = error
    raw = response.read().decode("utf-8", "replace")
    try:
        payload = json.loads(raw) if raw else None
    except json.JSONDecodeError:
        payload = raw
    return response.status if hasattr(response, "status") else response.code, payload, response.headers


def check(name, condition, detail=""):
    results.append((bool(condition), name))
    print(f"{'PASS' if condition else 'FAIL'}  {name}" + (f"  [{detail}]" if detail and not condition else ""))
    return bool(condition)


def claims_of(token):
    part = token.split(".")[1]
    return json.loads(base64.urlsafe_b64decode(part + "=" * (-len(part) % 4)))


def totp(secret):
    key = base64.b32decode(secret.upper() + "=" * (-len(secret) % 8))
    counter = struct.pack(">Q", int(time.time()) // 30)
    digest = hmac.new(key, counter, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    value = (struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF) % 1_000_000
    return f"{value:06d}"


def mail_link(address, kind, timeout=25):
    """Find the newest Mailpit message to `address` whose link has `type=kind`."""

    deadline = time.time() + timeout
    while time.time() < deadline:
        _, listing, _ = call("GET", f"{MAILPIT}/api/v1/search?query=" + urllib.parse.quote(f"to:{address}"))
        for message in (listing or {}).get("messages", []):
            _, full, _ = call("GET", f"{MAILPIT}/api/v1/message/{message['ID']}")
            body = html.unescape((full.get("HTML") or "") + " " + (full.get("Text") or ""))
            for link in re.findall(r"http://[^\s\"'<>]+/verify\?[^\s\"'<>]+", body):
                if f"type={kind}" in link:
                    return link
        time.sleep(1)
    return None


def session_from_redirect(link):
    """Follow a GoTrue verify link once and read the tokens it puts in the redirect fragment."""

    status, _, headers = call("GET", link)
    location = headers.get("Location", "")
    fragment = urllib.parse.parse_qs(urllib.parse.urlparse(location).fragment)
    return status, {key: values[0] for key, values in fragment.items()}


def sign_in(email, password):
    status, payload, _ = call(
        "POST", f"{AUTH}/token?grant_type=password", {"email": email, "password": password}
    )
    return status, payload


def psql(sql):
    subprocess.run(
        ["docker", "compose", "exec", "-T", "db", "psql", "-U", "transitsym", "-d", "transit", "-q", "-c", sql],
        capture_output=True,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mfa-required", action="store_true", help="the API enforces operator MFA")
    args = parser.parse_args()

    if call("GET", f"{AUTH}/health")[0] != 200:
        sys.exit("GoTrue is not running. Start it with: docker compose --profile identity up -d")

    suffix = uuid.uuid4().hex[:8]
    email = f"identity-{suffix}@example.test"
    token = None
    try:
        # Sign-up and confirmation email
        status, user, _ = call("POST", f"{AUTH}/signup", {"email": email, "password": PASSWORD})
        check("sign-up accepted", status == 200, f"{status} {user}")
        check("sign-in refused until the email is confirmed", sign_in(email, PASSWORD)[0] == 400)
        link = mail_link(email, "signup")
        check("confirmation email arrives in Mailpit", link is not None)
        if not link:
            return
        status, tokens = session_from_redirect(link)
        check("confirmation link signs the person in", "access_token" in tokens, f"{status} {tokens}")

        status, payload = sign_in(email, PASSWORD)
        token = (payload or {}).get("access_token")
        check("password sign-in works after confirmation", status == 200 and token, f"{status} {payload}")
        claims = claims_of(token)
        verified = (claims.get("user_metadata") or {}).get("email_verified")
        # The API links an existing account by email only on this claim, so it must be true here.
        check("token carries user_metadata.email_verified = true", verified is True, f"claims: {claims.get('user_metadata')}")
        check("token starts at aal1 with a session id", claims.get("aal") == "aal1" and claims.get("session_id"))

        # The API accepts the provider token and creates the local account
        status, me, _ = call("GET", f"{API}/api/developer/me", token=token)
        check("API accepts the provider token", status == 200 and me and me.get("email") == email, f"{status} {me}")
        status, _, _ = call("GET", f"{API}/api/admin/overview", token=token)
        check("a developer token cannot reach the admin API", status == 403, str(status))

        # Password recovery
        status, _, _ = call("POST", f"{AUTH}/recover", {"email": email})
        check("recovery request accepted", status == 200, str(status))
        link = mail_link(email, "recovery")
        check("recovery email arrives", link is not None)
        if link:
            _, tokens = session_from_redirect(link)
            status, _, _ = call("PUT", f"{AUTH}/user", {"password": NEW_PASSWORD}, token=tokens.get("access_token"))
            check("recovery link lets the person set a new password", status == 200, str(status))
            check("the old password stops working", sign_in(email, PASSWORD)[0] == 400)
            status, payload = sign_in(email, NEW_PASSWORD)
            check("the new password works", status == 200, str(status))
            token = payload["access_token"]

        # Promote to operator, then exercise the MFA gate
        subprocess.run(
            ["docker", "compose", "exec", "-T", "api", "python", "-m", "app.cli", "grant-role", email, "admin"],
            capture_output=True,
        )
        status, _, _ = call("GET", f"{API}/api/admin/overview", token=token)
        if args.mfa_required:
            check("operator MFA: an aal1 admin token is refused", status == 403, str(status))
        else:
            check("operator MFA off: an aal1 admin token is accepted", status == 200, str(status))

        status, enrol, _ = call(
            "POST", f"{AUTH}/factors", {"factor_type": "totp", "friendly_name": f"smoke-{suffix}", "issuer": "Tsela"}, token=token
        )
        check("TOTP enrolment returns a secret", status == 200 and enrol.get("totp", {}).get("secret"), f"{status} {enrol}")
        factor = enrol["id"]
        _, challenge, _ = call("POST", f"{AUTH}/factors/{factor}/challenge", {}, token=token)
        status, bad, _ = call("POST", f"{AUTH}/factors/{factor}/verify", {"challenge_id": challenge["id"], "code": "000000"}, token=token)
        check("a wrong TOTP code is refused", status >= 400, str(status))
        _, challenge, _ = call("POST", f"{AUTH}/factors/{factor}/challenge", {}, token=token)
        status, verified_session, _ = call(
            "POST", f"{AUTH}/factors/{factor}/verify",
            {"challenge_id": challenge["id"], "code": totp(enrol["totp"]["secret"])}, token=token,
        )
        check("the correct TOTP code is accepted", status == 200, f"{status} {verified_session}")
        token = verified_session["access_token"]
        check("the new session is aal2", claims_of(token).get("aal") == "aal2")
        status, _, _ = call("GET", f"{API}/api/admin/overview", token=token)
        check("an aal2 admin token is accepted", status == 200, str(status))

        # Logout revokes the session on the API even though the JWT has not expired
        status, _, _ = call("POST", f"{API}/api/developer/logout", token=token)
        check("logout accepted", status == 204, str(status))
        status, _, _ = call("GET", f"{API}/api/developer/me", token=token)
        check("the logged-out token is refused", status == 401, str(status))

        # Deletion must remove the provider user too. Sign in again, demote, delete.
        _, payload = sign_in(email, NEW_PASSWORD)
        again = payload["access_token"]
        subprocess.run(
            ["docker", "compose", "exec", "-T", "api", "python", "-m", "app.cli", "grant-role", email, "developer"],
            capture_output=True,
        )
        status, _, _ = call("DELETE", f"{API}/api/developer/account", {"confirmEmail": email}, token=again)
        check("account deletion accepted", status == 204, str(status))
        status, _ = sign_in(email, NEW_PASSWORD)
        check("the provider user is gone (cannot sign in)", status == 400, str(status))
        status, _, _ = call("GET", f"{API}/api/developer/me", token=again)
        check("a token issued before deletion is refused", status in (401, 403), str(status))
        count = subprocess.run(
            ["docker", "compose", "exec", "-T", "db", "psql", "-U", "transitsym", "-d", "transit", "-tAc",
             f"SELECT count(*) FROM \"DeveloperAccount\" WHERE email = '{email}'"],
            capture_output=True, text=True,
        ).stdout.strip()
        check("and it did not recreate the account", count == "0", count)
    finally:
        psql(
            f"DELETE FROM \"DeveloperAccount\" WHERE email LIKE 'identity-{suffix}@example.test' "
            "OR (email LIKE 'deleted-%@deleted.invalid' AND \"deletedAt\" > now() - interval '30 minutes')"
        )
        call("DELETE", f"{MAILPIT}/api/v1/search?query=" + urllib.parse.quote(f"to:{email}"))
        failed = [name for ok, name in results if not ok]
        print(f"\n{len(results) - len(failed)} of {len(results)} checks passed")
        if failed:
            print("failed:", *failed, sep="\n  - ")
            sys.exit(1)


if __name__ == "__main__":
    main()
