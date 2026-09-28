"""Refuse to release with placeholders, published local defaults, or weak secrets.

    python scripts/check_release_env.py .env.production
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REQUIRED = (
    "TSELA_DOMAIN", "ACME_EMAIL", "AUTH_PUBLIC_URL", "AUTH_JWT_SECRET", "AUTH_DB_PASSWORD",
    "TOKEN_HASH_SECRET", "DOCS_SANDBOX_API_KEY", "GRAFANA_WEBHOOK_SECRET", "GRAFANA_ADMIN_PASSWORD",
    "POSTGRES_PASSWORD", "REPLICATION_PASSWORD", "BACKUP_DB_PASSWORD", "BACKUP_ENCRYPTION_PASSPHRASE",
    "MINIO_ROOT_USER", "MINIO_ROOT_PASSWORD", "UPLOADS_ACCESS_KEY", "UPLOADS_SECRET_KEY",
    "BACKUPS_ACCESS_KEY", "BACKUPS_SECRET_KEY", "SMTP_HOST", "SMTP_PORT",
)
MINIMUM_LENGTH = {
    "AUTH_JWT_SECRET": 48, "TOKEN_HASH_SECRET": 32, "BACKUP_ENCRYPTION_PASSPHRASE": 32,
    "POSTGRES_PASSWORD": 16, "REPLICATION_PASSWORD": 16, "BACKUP_DB_PASSWORD": 16,
    "AUTH_DB_PASSWORD": 16, "MINIO_ROOT_PASSWORD": 16, "UPLOADS_SECRET_KEY": 16,
    "BACKUPS_SECRET_KEY": 16, "GRAFANA_ADMIN_PASSWORD": 12, "GRAFANA_WEBHOOK_SECRET": 16,
}
PUBLISHED_DEFAULTS = (
    "metro", "admin", "local-", "replace", "generate", "change-me", "example.com", "not_for_production",
    "not-for-production", "choose-a", "TselaDemo",
)
DISTINCT_PAIRS = (("UPLOADS_ACCESS_KEY", "BACKUPS_ACCESS_KEY"), ("UPLOADS_SECRET_KEY", "BACKUPS_SECRET_KEY"))


def parse(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def problems(values: dict[str, str]) -> list[str]:
    found: list[str] = []
    for key in REQUIRED:
        value = values.get(key, "")
        if not value:
            found.append(f"{key} is missing")
            continue
        lowered = value.lower()
        if any(marker.lower() in lowered for marker in PUBLISHED_DEFAULTS):
            found.append(f"{key} still looks like a placeholder or published default")
        if len(value) < MINIMUM_LENGTH.get(key, 1):
            found.append(f"{key} must be at least {MINIMUM_LENGTH[key]} characters")
    for first, second in DISTINCT_PAIRS:
        if values.get(first) and values.get(first) == values.get(second):
            found.append(f"{first} and {second} must differ so a leaked upload key cannot read backups")
    if values.get("AUTH_PUBLIC_URL", "").startswith("http://"):
        found.append("AUTH_PUBLIC_URL must use https in production")
    if values.get("GOOGLE_OAUTH_ENABLED", "false") == "true" and not (
        values.get("GOOGLE_CLIENT_ID") and values.get("GOOGLE_CLIENT_SECRET")
    ):
        found.append("GOOGLE_OAUTH_ENABLED is true but the Google client ID or secret is empty")
    if not re.fullmatch(r"[A-Za-z0-9.-]+", values.get("TSELA_DOMAIN", "x")):
        found.append("TSELA_DOMAIN must be a bare hostname")
    return found


def main() -> int:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else ".env.production")
    if not path.is_file():
        print(f"{path} does not exist. Copy deploy/.env.production.example and fill it in.")
        return 2
    issues = problems(parse(path))
    for issue in issues:
        print(f"  - {issue}")
    print("release environment OK" if not issues else f"{len(issues)} problem(s) must be fixed before releasing")
    return 1 if issues else 0


if __name__ == "__main__":
    raise SystemExit(main())
