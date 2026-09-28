#!/bin/bash
# Prove the real alert path end to end: Prometheus rule -> Grafana -> Tsela webhook -> admin feed.
#
#   scripts/alert-drill.sh                 # needs the observability profile and an admin account
#
# It stops the PostgreSQL exporter, waits for the TselaDatabaseMetricsDown alert to reach the
# admin notification feed, restarts the exporter, waits for the resolved notice, and writes JSON
# evidence. A drill that never ran is not evidence that alerts work.
set -Eeuo pipefail

cd "$(dirname "$0")/.."
API="${API_URL:-http://localhost:8000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-demo@tsela.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-TselaDemo2026!}"
DC="docker compose --profile observability"
EVIDENCE=ops/backups/evidence
mkdir -p "$EVIDENCE"

json() { python -c "import json,sys; d=json.load(sys.stdin); print($1)"; }
say() { printf '\n== %s\n' "$*"; }

login() {
  curl -fsS -X POST "$API/api/developer/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | json 'd["token"]'
}
notifications() {
  curl -fsS "$API/api/admin/notifications?limit=50" -H "Authorization: Bearer $TOKEN"
}
count_state() { # state
  notifications | json "sum(1 for n in d if n['title'].startswith('Database metrics') and n['state']=='$1')"
}

TOKEN="$(login)"
BASE_FIRING="$(count_state firing)"
BASE_RESOLVED="$(count_state resolved)"
STARTED=$(date +%s)

say "Stopping the PostgreSQL exporter to trigger TselaDatabaseMetricsDown"
$DC stop postgres-exporter >/dev/null

FIRING_AT=""
for _ in $(seq 1 60); do
  sleep 10
  if [[ "$(count_state firing)" -gt "$BASE_FIRING" ]]; then FIRING_AT=$(( $(date +%s) - STARTED )); break; fi
done
[[ -n "$FIRING_AT" ]] || { $DC start postgres-exporter >/dev/null; echo "the alert never reached the admin feed" >&2; exit 1; }
say "Alert delivered after ${FIRING_AT}s. Restarting the exporter."

RECOVER_STARTED=$(date +%s)
$DC start postgres-exporter >/dev/null
RESOLVED_AT=""
for _ in $(seq 1 60); do
  sleep 10
  if [[ "$(count_state resolved)" -gt "$BASE_RESOLVED" ]]; then RESOLVED_AT=$(( $(date +%s) - RECOVER_STARTED )); break; fi
done

FILE="$EVIDENCE/alert-drill-$(date -u +%Y%m%dT%H%M%SZ).json"
cat >"$FILE" <<JSON
{
  "drill": "alert-delivery",
  "result": "$([[ -n "$RESOLVED_AT" ]] && echo passed || echo partial)",
  "completedAt": "$(date -u +%FT%TZ)",
  "alert": "TselaDatabaseMetricsDown",
  "path": "Prometheus rule -> Grafana alerting -> Tsela webhook -> admin notification feed",
  "secondsUntilFiringNotification": $FIRING_AT,
  "secondsUntilResolvedNotification": ${RESOLVED_AT:-null}
}
JSON
say "Evidence: $FILE"
