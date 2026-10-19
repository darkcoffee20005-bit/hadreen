#!/usr/bin/env bash
# Throwaway local Postgres for development and tests.
# Data lives in ./.pg (git-ignored); the server listens on localhost:${PGPORT_LOCAL:-54329}.
# Creates role "hadreen" and the databases hadreen, hadreen_test and hadreen_e2e.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGHOME="$ROOT/.pg"
PGDATA="$PGHOME/data"
PGRUN="$PGHOME/run"
PORT="${PGPORT_LOCAL:-54329}"

PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
if [ -z "$PGBIN" ]; then
  PGBIN="$(dirname "$(command -v pg_ctl)")"
fi

# initdb refuses to run as root, so the server runs as the postgres user when we are root.
as_pg() {
  if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi
}

psql_admin() {
  as_pg "$PGBIN/psql" -h localhost -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -qtA "$@"
}

case "${1:-up}" in
  up)
    mkdir -p "$PGHOME"
    if [ "$(id -u)" = 0 ]; then chown -R postgres:postgres "$PGHOME"; fi
    if [ ! -f "$PGDATA/PG_VERSION" ]; then
      as_pg "$PGBIN/initdb" -D "$PGDATA" -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null
    fi
    as_pg mkdir -p "$PGRUN"
    if ! as_pg "$PGBIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
      as_pg "$PGBIN/pg_ctl" -D "$PGDATA" -l "$PGHOME/postgres.log" -w \
        -o "-p $PORT -k $PGRUN -c listen_addresses=localhost" start >/dev/null
    fi
    psql_admin -c "DO \$\$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hadreen') THEN
        CREATE ROLE hadreen LOGIN PASSWORD 'hadreen' CREATEDB;
      END IF;
    END \$\$;"
    for db in hadreen hadreen_test hadreen_e2e; do
      if [ "$(psql_admin -c "SELECT 1 FROM pg_database WHERE datname = '$db'")" != 1 ]; then
        psql_admin -c "CREATE DATABASE $db OWNER hadreen"
      fi
    done
    echo "Postgres ready on localhost:$PORT (hadreen, hadreen_test, hadreen_e2e)"
    ;;
  down)
    as_pg "$PGBIN/pg_ctl" -D "$PGDATA" -m fast stop
    ;;
  *)
    echo "usage: $0 up|down" >&2
    exit 1
    ;;
esac
