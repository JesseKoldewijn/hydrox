#!/usr/bin/env bash
# Bring up Compose (infra or full), wait for health, then probe.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="${1:-infra}" # infra | full | prod
COMPOSE_FILE="docker/docker-compose.yml"
PROBE_FLAGS=()
export DATABASE_URL="${DATABASE_URL:-postgres://hydrox:hydrox@localhost:5432/hydrox}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export S3_ENDPOINT="${S3_ENDPOINT:-http://localhost:4566}"
export S3_BUCKET="${S3_BUCKET:-hydrox}"
export S3_ACCESS_KEY_ID="${S3_ACCESS_KEY_ID:-test}"
export S3_SECRET_ACCESS_KEY="${S3_SECRET_ACCESS_KEY:-test}"
export API_URL="${API_URL:-http://127.0.0.1:3001}"
export WEB_URL="${WEB_URL:-http://127.0.0.1:5173}"

case "$MODE" in
  infra)
    SERVICES=(postgres redis localstack)
    ;;
  full)
    SERVICES=(postgres redis localstack api web)
    PROBE_FLAGS=(--full)
    WEB_URL="${WEB_URL:-http://127.0.0.1:5173}"
    ;;
  prod)
    COMPOSE_FILE="docker/docker-compose.prod.yml"
    SERVICES=(postgres redis localstack api web)
    # Prod compose does not publish postgres/redis/localstack to the host;
    # api /ready covers DB+Redis; probe published HTTP surfaces only.
    PROBE_FLAGS=(--http-only)
    export WEB_URL="${WEB_URL:-http://127.0.0.1:8080}"
    export API_URL="${API_URL:-http://127.0.0.1:3001}"
    ;;
  *)
    echo "Usage: $0 [infra|full|prod]" >&2
    exit 2
    ;;
esac

echo "stack-test: compose file=${COMPOSE_FILE} services=${SERVICES[*]}"
docker compose -f "$COMPOSE_FILE" up -d --build "${SERVICES[@]}"

echo "stack-test: waiting for container health"
deadline=$((SECONDS + 180))
while (( SECONDS < deadline )); do
  unhealthy="$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null | node -e '
    let s=""; process.stdin.on("data",d=>s+=d); process.stdin.on("end",()=>{
      const lines=s.trim().split(/\n+/).filter(Boolean);
      const rows=lines.map(l=>{ try{return JSON.parse(l)}catch{return null}}).filter(Boolean);
      const wanted=new Set(process.argv.slice(1));
      const bad=[];
      for (const r of rows) {
        const name=r.Service||r.Name||"";
        if (![...wanted].some(w=>name.includes(w)|| (r.Service===w))) continue;
        const h=(r.Health||r.State||"").toLowerCase();
        // localstack/api/web may report running without Health in older compose
        if (h.includes("unhealthy")) bad.push(name+":"+h);
        if (h && !h.includes("healthy") && !h.includes("running") && !h.includes("started")) bad.push(name+":"+h);
      }
      if (bad.length) { console.log(bad.join(",")); process.exit(1); }
      process.exit(0);
    });
  ' "${SERVICES[@]}" || true)"

  # Prefer docker inspect health; require healthy when a healthcheck exists
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
    # No HEALTHCHECK defined → accept running
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

# Extra HTTP wait for api/web when required
if [[ "$MODE" == "full" || "$MODE" == "prod" ]]; then
  bash docker/scripts/wait-for-http.sh "$API_URL/ready" 60 2
  bash docker/scripts/wait-for-http.sh "$WEB_URL" 60 2
fi

echo "stack-test: running probes"
node scripts/probe-stack.mjs "${PROBE_FLAGS[@]}"
echo "stack-test: OK"
