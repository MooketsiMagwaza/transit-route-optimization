"""CLI entry point for cleanup, retention, and API-key expiry audits."""

from __future__ import annotations

import argparse
import json
import os
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select

from app.config import get_settings
from app.database import SessionLocal
from app.models import (
    ApiKey,
    ApiUsage,
    DeveloperSession,
    GrafanaNotification,
    MaintenanceRun,
    PasswordResetToken,
    RevokedAuthSession,
    UploadIntent,
)


def cleanup_auth(session, now: datetime) -> tuple[int, dict]:
    sessions = session.execute(
        delete(DeveloperSession).where(DeveloperSession.expires_at < now)
    ).rowcount
    resets = session.execute(
        delete(PasswordResetToken).where(
            (PasswordResetToken.expires_at < now)
            | (PasswordResetToken.used_at < now - timedelta(days=7))
        )
    ).rowcount
    revoked = session.execute(
        delete(RevokedAuthSession).where(RevokedAuthSession.expires_at < now)
    ).rowcount
    return sessions + resets + revoked, {
        "expiredSessions": sessions,
        "expiredResetTokens": resets,
        "expiredRevocations": revoked,
    }


def prune_usage(session, now: datetime) -> tuple[int, dict]:
    cutoff = now - timedelta(days=get_settings().api_usage_retention_days)
    removed = session.execute(delete(ApiUsage).where(ApiUsage.occurred_at < cutoff)).rowcount
    return removed, {"cutoff": cutoff.isoformat()}


def key_rotation_audit(session, now: datetime) -> tuple[int, dict]:
    deadline = now + timedelta(days=get_settings().api_key_rotation_warning_days)
    due = (
        session.scalar(
            select(func.count(ApiKey.id)).where(
                ApiKey.revoked_at.is_(None), ApiKey.expires_at > now, ApiKey.expires_at <= deadline
            )
        )
        or 0
    )
    expired = (
        session.scalar(
            select(func.count(ApiKey.id)).where(
                ApiKey.revoked_at.is_(None), ApiKey.expires_at <= now
            )
        )
        or 0
    )
    if due or expired:
        session.add(
            GrafanaNotification(
                fingerprint=f"api-key-expiry-{now.date().isoformat()}",
                state="firing",
                severity="warning",
                title="API credentials require attention",
                message=f"{due} active keys expire soon; {expired} keys are expired.",
                payload={"expiringSoon": due, "expired": expired},
            )
        )
    return due + expired, {
        "expiringSoon": due,
        "expired": expired,
        "warningDeadline": deadline.isoformat(),
    }


def cleanup_uploads(session, now: datetime) -> tuple[int, dict]:
    """Delete abandoned and rejected uploads from the object store, then mark them deleted."""

    from app.services.object_store import ObjectStoreDisabled, object_delete

    settings = get_settings()
    stale = list(
        session.scalars(
            select(UploadIntent).where(
                UploadIntent.deleted_at.is_(None),
                (
                    (UploadIntent.status == "pending")
                    & (UploadIntent.expires_at < now - timedelta(hours=1))
                )
                | (UploadIntent.status == "rejected"),
            )
        )
    )
    removed = failed = 0
    for intent in stale:
        try:
            object_delete(settings, intent.object_key)
        except (ObjectStoreDisabled, Exception):  # noqa: BLE001 - retried on the next run
            failed += 1
            continue
        intent.status = "deleted"
        intent.deleted_at = now
        removed += 1
    return removed, {"deleted": removed, "failed": failed}


JOBS = {
    "cleanup-uploads": cleanup_uploads,
    "cleanup-auth": cleanup_auth,
    "prune-usage": prune_usage,
    "key-rotation-audit": key_rotation_audit,
}


def run(job_name: str, run_id: str) -> None:
    now = datetime.now(UTC)
    with SessionLocal() as session:
        if session.scalar(select(MaintenanceRun).where(MaintenanceRun.run_id == run_id)):
            print(json.dumps({"job": job_name, "runId": run_id, "status": "duplicate_skipped"}))
            return
        audit = MaintenanceRun(job_name=job_name, run_id=run_id, status="running")
        session.add(audit)
        session.commit()
        session.refresh(audit)
        try:
            rows, detail = JOBS[job_name](session, now)
            audit.status = "succeeded"
            audit.rows_affected = rows
            audit.detail = detail
            audit.finished_at = datetime.now(UTC)
            session.commit()
            print(
                json.dumps(
                    {"job": job_name, "runId": run_id, "status": "succeeded", "rowsAffected": rows}
                )
            )
        except Exception as error:
            session.rollback()
            failed = session.get(MaintenanceRun, audit.id)
            if failed:
                failed.status = "failed"
                failed.detail = {"errorType": type(error).__name__}
                failed.finished_at = datetime.now(UTC)
                session.commit()
            raise


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("job", choices=JOBS)
    parser.add_argument("--run-id")
    args = parser.parse_args()
    run(args.job, args.run_id or os.getenv("JOB_RUN_ID") or f"{args.job}-{uuid.uuid4()}")


if __name__ == "__main__":
    main()
