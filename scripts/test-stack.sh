#!/usr/bin/env bash
# Bring up Compose (infra or full), wait for health, then probe.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="${1:-infra}" # infra | full | prod
COMPOSE_FILE="docker/docker-compose.yml"
PROBE_FLAGS=()
export DATABASE_URL="${DATABASE_URL:-mysql://hydrox:hydrox@127.0.0.1:3306/hydrox}"
export APP_URL="${APP_URL:-http://127.0.0.1:3000}"
export API_URL="${API_URL:-$APP_URL}"
export WEB_URL="${WEB_URL:-$APP_URL}"

case "$MODE" in
  infra)
    SERVICES=(mysql)
    ;;
  full)
    SERVICES=(mysql app)
    PROBE_FLAGS=(--full)
    ;;
  prod)
    COMPOSE_FILE="docker/docker-compose.prod.yml"
    SERVICES=(mysql app)
    # Prod compose does not publish MySQL to the host; probe HTTP only.
    PROBE_FLAGS=(--http-only)
    ;;
  *)
    echo "Usage: $0 [infra|full|prod]" >&2
    exit 2
    ;;
esac

echo "stack-test: compose file=${COMPOSE_FILE} services=${SERVICES[*]}"
docker compose -f "$COMPOSE_FILE" up -d --build "${SERVICES[@]}"

echo "stack-test: waiting for container health"
deadline=$((SECONDS + 240))
all_ok=0
while (( SECONDS < deadline )); do
  all_ok=1
  for svc in "${SERVICES[@]}"; do
    cid="$(docker compose -f "$COMPOSE_FILE" ps -q "$svc" || true)"
    if [[ -z "$cid" ]]; then
      all_ok=0
      break
    fi
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || echo missing)"
    if [[ "$status" == "healthy" ]]; then
      continue
    fi
    has_health="$(docker inspect -f '{{if .State.Health}}yes{{else}}no{{end}}' "$cid" 2>/dev/null || echo no)"
    if [[ "$has_health" == "no" && "$status" == "running" ]]; then
      continue
    fi
    all_ok=0
    break
  done
  if [[ "$all_ok" -eq 1 ]]; then
    echo "stack-test: containers are healthy"
    break
  fi
  sleep 3
done

if [[ "$all_ok" -ne 1 ]]; then
  echo "stack-test: containers failed to become healthy in time" >&2
  docker compose -f "$COMPOSE_FILE" ps
  exit 1
fi

if [[ "$MODE" == "full" || "$MODE" == "prod" ]]; then
  bash docker/scripts/wait-for-http.sh "$APP_URL/ready" 90 2
  bash docker/scripts/wait-for-http.sh "$APP_URL" 60 2
fi

echo "stack-test: running probes"
node scripts/probe-stack.mjs "${PROBE_FLAGS[@]}"
echo "stack-test: OK"
