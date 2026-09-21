#!/bin/sh
# Create the database and role that self-hosted Supabase Auth (GoTrue) needs.
# Idempotent: safe to run on every `docker compose --profile identity up`.
set -eu

export PGPASSWORD="${POSTGRES_PASSWORD}"
psql_admin="psql -h db -U ${POSTGRES_USER} -v ON_ERROR_STOP=1"

until pg_isready -h db -U "${POSTGRES_USER}" >/dev/null 2>&1; do sleep 1; done

if ! $psql_admin -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='tsela_auth'" | grep -q 1; then
  $psql_admin -d postgres -c "CREATE DATABASE tsela_auth"
fi

$psql_admin -d tsela_auth <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin LOGIN NOINHERIT CREATEROLE PASSWORD '${AUTH_DB_PASSWORD}';
  ELSE
    ALTER ROLE supabase_auth_admin PASSWORD '${AUTH_DB_PASSWORD}';
  END IF;
END
\$\$;
GRANT ALL ON DATABASE tsela_auth TO supabase_auth_admin;
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
ALTER ROLE supabase_auth_admin SET search_path = auth;
SQL
echo "auth database ready"
