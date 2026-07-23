#!/usr/bin/env bash
# API container entrypoint: wait for deps, migrate, then exec the server command.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
# When running inside the image, scripts live under /app/docker/scripts
if [[ -f /app/docker/scripts/wait-for-tcp.sh ]]; then
  SCRIPT_DIR=/app/docker/scripts
else
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
fi

DATABASE_URL="${DATABASE_URL:-postgres://hydrox:hydrox@postgres:5432/hydrox}"
REDIS_URL="${REDIS_URL:-redis://redis:6379}"
S3_ENDPOINT="${S3_ENDPOINT:-}"

parse_host_port() {
  # Supports postgres://user:pass@host:port/db and redis://host:port
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

read -r PG_HOST PG_PORT < <(parse_host_port "$DATABASE_URL" 5432)
read -r REDIS_HOST REDIS_PORT < <(parse_host_port "$REDIS_URL" 6379)

bash "$SCRIPT_DIR/wait-for-tcp.sh" "$PG_HOST" "$PG_PORT"
bash "$SCRIPT_DIR/wait-for-tcp.sh" "$REDIS_HOST" "$REDIS_PORT"

if [[ -n "$S3_ENDPOINT" ]]; then
  read -r S3_HOST S3_PORT < <(parse_host_port "$S3_ENDPOINT" 4566)
  bash "$SCRIPT_DIR/wait-for-tcp.sh" "$S3_HOST" "$S3_PORT" 30 2 || true
fi

echo "warmup: running database migrations"
if command -v yarn >/dev/null 2>&1; then
  (cd /app 2>/dev/null || cd "$ROOT_DIR"; yarn workspace @hydrox/db migrate) || {
    echo "warmup: migration failed" >&2
    exit 1
  }
else
  echo "warmup: yarn not found; skipping migrate (expect pre-migrated DB)" >&2
fi

echo "warmup: starting API"
exec "$@"
