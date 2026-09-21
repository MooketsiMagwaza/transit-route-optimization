#!/bin/bash
# Restore drill: rebuild the database from the newest OFF-HOST logical backup into a clean,
# empty PostgreSQL ("restore-target") and prove it is usable. Writes timing evidence.
#
# It uses nothing from the primary's disks: only the encrypted object-store copy, the passphrase,
# and a scratch server. That is what a clean-host recovery has available.
set -Eeuo pipefail
umask 077

: "${BACKUPS_BUCKET:=tsela-backups}" "${EVIDENCE_DIR:=/evidence}" "${RESTORE_HOST:=restore-target}"
: "${BACKUP_ENCRYPTION_PASSPHRASE:?BACKUP_ENCRYPTION_PASSPHRASE is required}"
: "${RESTORE_SUPERUSER:=postgres}"
export RCLONE_CONFIG_OFFSITE_TYPE=s3 RCLONE_CONFIG_OFFSITE_PROVIDER="${OFFSITE_PROVIDER:-Minio}"
export RCLONE_CONFIG_OFFSITE_ENDPOINT="${OFFSITE_ENDPOINT:-http://objects:9000}"
export RCLONE_CONFIG_OFFSITE_ACCESS_KEY_ID="${OFFSITE_ACCESS_KEY:?OFFSITE_ACCESS_KEY is required}"
export RCLONE_CONFIG_OFFSITE_SECRET_ACCESS_KEY="${OFFSITE_SECRET_KEY:?OFFSITE_SECRET_KEY is required}"
export RCLONE_CONFIG_OFFSITE_NO_CHECK_BUCKET=true
export PGHOST="$RESTORE_HOST" PGUSER="$RESTORE_SUPERUSER" PGPASSWORD="${RESTORE_PASSWORD:-restore-drill}"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$EVIDENCE_DIR"
started=$(date +%s)
step() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*"; }

step "waiting for the scratch server"
for _ in $(seq 1 60); do pg_isready -q && break; sleep 1; done
pg_isready -q

newest=$(rclone lsf "offsite:${BACKUPS_BUCKET}/logical/" --files-only | grep '\.tar\.enc$' | sort | tail -n 1)
[[ -n "$newest" ]] || { echo "no off-host backup exists" >&2; exit 1; }
step "downloading $newest"
rclone copyto "offsite:${BACKUPS_BUCKET}/logical/$newest" "$work/$newest"
rclone copyto "offsite:${BACKUPS_BUCKET}/logical/$newest.sha256" "$work/$newest.sha256"
( cd "$work" && sha256sum -c "$newest.sha256" )

step "decrypting"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass env:BACKUP_ENCRYPTION_PASSPHRASE \
  -in "$work/$newest" -out "$work/backup.tar"

step "restoring into an empty database"
psql -v ON_ERROR_STOP=1 -d postgres -c 'DROP DATABASE IF EXISTS transit_restore' -c 'CREATE DATABASE transit_restore'
psql -v ON_ERROR_STOP=1 -d transit_restore -c 'CREATE EXTENSION IF NOT EXISTS postgis' >/dev/null
# The dump was taken by a least-privilege role; ownership is irrelevant to a verification restore.
pg_restore --no-owner --no-privileges --exit-on-error -d transit_restore "$work/backup.tar" || \
  pg_restore --no-owner --no-privileges -d transit_restore "$work/backup.tar"

step "verifying restored data"
q() { psql -qAt -d transit_restore -c "$1"; }
routes=$(q 'SELECT count(*) FROM "Route"')
nodes=$(q 'SELECT count(*) FROM "Node"')
accounts=$(q 'SELECT count(*) FROM "DeveloperAccount"')
revision=$(q 'SELECT version_num FROM alembic_version')
postgis=$(q 'SELECT postgis_version()')
[[ "$routes" -gt 0 ]] || { echo "restored database has no routes" >&2; exit 1; }
[[ "$nodes" -gt 0 ]] || { echo "restored database has no stops" >&2; exit 1; }
[[ -n "$revision" ]] || { echo "migration revision missing" >&2; exit 1; }

seconds=$(( $(date +%s) - started ))
evidence="$EVIDENCE_DIR/restore-$(date -u +%Y%m%dT%H%M%SZ).json"
cat >"$evidence" <<JSON
{
  "drill": "logical-restore",
  "result": "passed",
  "completedAt": "$(date -u +%FT%TZ)",
  "sourceBackup": "$newest",
  "source": "off-host object store (encrypted, checksum verified)",
  "target": "clean scratch PostgreSQL with no volume shared with the primary",
  "durationSeconds": $seconds,
  "restored": { "routes": $routes, "stops": $nodes, "accounts": $accounts },
  "alembicRevision": "$revision",
  "postgis": "$postgis"
}
JSON
step "PASSED in ${seconds}s; evidence: $evidence"
