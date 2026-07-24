#!/usr/bin/env bash
# App container entrypoint: wait for MySQL, migrate, then exec the server command.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
if [[ -f /app/docker/scripts/wait-for-tcp.sh ]]; then
  SCRIPT_DIR=/app/docker/scripts
else
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
fi

DATABASE_URL="${DATABASE_URL:-mysql://hydrox:hydrox@mysql:3306/hydrox}"

parse_host_port() {
  local url="$1"
  local default_port="$2"
  local without_scheme="${url#*://}"
  local hostport="${without_scheme%%/*}"
  hostport="${hostport#*@}"
  local host="${hostport%%:*}"
  local port="${hostport##*:}"
  if [[ "$host" == "$port" ]]; then
    port="$default_port"
  fi
  echo "$host" "$port"
}

read -r DB_HOST DB_PORT < <(parse_host_port "$DATABASE_URL" 3306)
bash "$SCRIPT_DIR/wait-for-tcp.sh" "$DB_HOST" "$DB_PORT"

echo "warmup: running database migrations"
if command -v yarn >/dev/null 2>&1; then
  (cd /app 2>/dev/null || cd "$ROOT_DIR"; yarn workspace @hydrox/db migrate) || {
    echo "warmup: migration failed" >&2
    exit 1
  }
else
  echo "warmup: yarn not found; skipping migrate (expect pre-migrated DB)" >&2
fi

echo "warmup: starting Hydrox"
exec "$@"
