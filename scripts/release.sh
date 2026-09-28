#!/bin/bash
# Health-gated release for a single Docker host.
#
#   scripts/release.sh                 # build, back up, migrate, deploy, smoke test, record
#
# Order matters: nothing is deployed until the environment passes preflight, images are built
# with an immutable version tag, and a fresh off-host backup exists to recover from. If the
# smoke test fails the previous version is restored automatically and the launch record says so.
#
# Schema policy: migrations must be backward compatible for one release (add, then remove later)
# so the previous images keep working against the new schema during a rollback.
set -Eeuo pipefail

cd "$(dirname "$0")/.."
ENV_FILE="${ENV_FILE:-.env.production}"
RECORDS=deploy/records
mkdir -p "$RECORDS"

say() { printf '\n== %s\n' "$*"; }
die() { printf 'release aborted: %s\n' "$*" >&2; exit 1; }

say "Preflight"
python scripts/check_release_env.py "$ENV_FILE" || die "fix the environment file first"
if [[ "${ALLOW_DIRTY:-false}" != "true" && -n "$(git status --porcelain)" ]]; then
  die "the working tree has uncommitted changes (set ALLOW_DIRTY=true only for a rehearsal)"
fi

VERSION="$(git describe --tags --always)"
SHA="$(git rev-parse HEAD)"
export TSELA_VERSION="$VERSION"
PREVIOUS="$(cat deploy/.current-version 2>/dev/null || true)"
DC="docker compose -f compose.yaml -f deploy/compose.release.yaml --env-file $ENV_FILE --profile identity --profile recovery"
DOMAIN="$(grep -E '^TSELA_DOMAIN=' "$ENV_FILE" | cut -d= -f2-)"
SANDBOX_KEY="$(grep -E '^DOCS_SANDBOX_API_KEY=' "$ENV_FILE" | cut -d= -f2-)"
SCHEME="${SMOKE_SCHEME:-https}"
API_URL="${SMOKE_API_URL:-$SCHEME://api.$DOMAIN}"
CURL_FLAGS=(-fsS --max-time 15)
[[ "${SMOKE_INSECURE:-false}" == "true" ]] && CURL_FLAGS+=(-k)
STARTED="$(date -u +%FT%TZ)"

say "Building $VERSION"
$DC build api marketing rider admin docs

say "Pre-migration backup (the recovery point for this release)"
BACKUP_LOG="$($DC run --rm backup logical 2>&1 | tee /dev/stderr)"
BACKUP_FILE="$(printf '%s\n' "$BACKUP_LOG" | grep -o 'tsela-[0-9TZ]*\.tar\.enc' | tail -n 1 || true)"
[[ -n "$BACKUP_FILE" ]] || die "the backup did not report a file; refusing to migrate"

say "Migrating"
$DC up -d db
$DC run --rm --no-deps api alembic upgrade head
REVISION="$($DC run --rm --no-deps api alembic current 2>/dev/null | grep -oE '^[0-9a-z_]+' | tail -n 1)"

say "Deploying $VERSION"
$DC up -d --remove-orphans --wait

smoke() {
  local output
  output="$(curl "${CURL_FLAGS[@]}" "$API_URL/api/health")" || return 1
  printf 'health: %s\n' "$output"
  curl "${CURL_FLAGS[@]}" -o /dev/null -D - -H "X-API-Key: $SANDBOX_KEY" "$API_URL/v1/routes?limit=1" | tr -d '\r' | grep -iE '^(HTTP/|x-api-version|x-ratelimit-remaining)' || return 1
  # The public edge must not serve metrics or the alert webhook.
  [[ "$(curl -s -o /dev/null -w '%{http_code}' "${CURL_FLAGS[@]/-f/}" "$API_URL/metrics")" == "404" ]] || { echo "metrics are exposed publicly"; return 1; }
}

say "Smoke test"
SMOKE_OUTPUT="$(smoke 2>&1)" && SMOKE_OK=true || SMOKE_OK=false
printf '%s\n' "$SMOKE_OUTPUT"

ROLLED_BACK=false
if [[ "$SMOKE_OK" != "true" ]]; then
  echo "smoke test failed"
  if [[ -n "$PREVIOUS" ]]; then
    say "Rolling back to $PREVIOUS"
    TSELA_VERSION="$PREVIOUS" $DC up -d --remove-orphans --wait
    ROLLED_BACK=true
  fi
fi

digest() { docker image inspect --format '{{.Id}}' "tsela/$1:$VERSION" 2>/dev/null || echo unknown; }
RECORD="$RECORDS/$VERSION.json"
cat >"$RECORD" <<JSON
{
  "version": "$VERSION",
  "gitCommit": "$SHA",
  "startedAt": "$STARTED",
  "finishedAt": "$(date -u +%FT%TZ)",
  "operator": "$(git config user.name || whoami)",
  "domain": "$DOMAIN",
  "images": { "api": "$(digest api)", "marketing": "$(digest marketing)", "rider": "$(digest rider)", "admin": "$(digest admin)", "docs": "$(digest docs)" },
  "migrationRevision": "$REVISION",
  "preMigrationBackup": "$BACKUP_FILE",
  "previousVersion": "${PREVIOUS:-none}",
  "smokeTestPassed": $SMOKE_OK,
  "rolledBack": $ROLLED_BACK,
  "smokeOutput": $(python -c 'import json,sys; print(json.dumps(sys.stdin.read()))' <<<"$SMOKE_OUTPUT")
}
JSON
echo "launch record: $RECORD"

if [[ "$SMOKE_OK" == "true" ]]; then
  echo "$VERSION" >deploy/.current-version
  if [[ "${SIGN_TAG:-false}" == "true" ]]; then git tag -s "release-$VERSION" -m "Release $VERSION" || true
  else git tag -a "release-$VERSION" -m "Release $VERSION" 2>/dev/null || true; fi
  say "Released $VERSION"
else
  die "release failed the smoke test${PREVIOUS:+; $PREVIOUS was restored}"
fi
