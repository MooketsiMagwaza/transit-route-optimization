#!/bin/bash
# Return to an earlier release by image tag (no rebuild, so it takes seconds).
#
#   scripts/rollback.sh 0.4.2-7-gabc1234
#
# The images for that version must still exist locally. Schema changes are backward compatible
# for one release, so the older code runs against the newer schema.
set -Eeuo pipefail

cd "$(dirname "$0")/.."
TARGET="${1:?usage: scripts/rollback.sh <version>}"
ENV_FILE="${ENV_FILE:-.env.production}"
export TSELA_VERSION="$TARGET"
DC="docker compose -f compose.yaml -f deploy/compose.release.yaml --env-file $ENV_FILE --profile identity --profile recovery"

for image in api marketing rider admin docs; do
  docker image inspect "tsela/$image:$TARGET" >/dev/null 2>&1 || { echo "tsela/$image:$TARGET is not available locally" >&2; exit 1; }
done

CURRENT="$(cat deploy/.current-version 2>/dev/null || echo unknown)"
$DC up -d --remove-orphans --wait

DOMAIN="$(grep -E '^TSELA_DOMAIN=' "$ENV_FILE" | cut -d= -f2-)"
API_URL="${SMOKE_API_URL:-${SMOKE_SCHEME:-https}://api.$DOMAIN}"
curl -fsS --max-time 15 ${SMOKE_INSECURE:+-k} "$API_URL/api/health" >/dev/null || { echo "the restored version is not healthy" >&2; exit 1; }

echo "$TARGET" >deploy/.current-version
mkdir -p deploy/records
cat >"deploy/records/rollback-$(date -u +%Y%m%dT%H%M%SZ).json" <<JSON
{ "action": "rollback", "from": "$CURRENT", "to": "$TARGET", "at": "$(date -u +%FT%TZ)", "operator": "$(git config user.name || whoami)", "healthy": true }
JSON
echo "rolled back from $CURRENT to $TARGET"
