# Infra

## Compose services

- `postgres` — primary DB (`/health` via `pg_isready`)
- `redis` — pub/sub + future caches (`redis-cli ping`)
- `localstack` — S3-compatible (`/_localstack/health` until S3 available)
- `api` — Nest API (warmup entrypoint waits for deps, migrates, then starts)
- `web` — Octane Vite (dev) or nginx static (prod)

All services declare Compose `healthcheck`s. `api`/`web` use `depends_on: condition: service_healthy`.

## Health endpoints (API)

| Path | Meaning |
|------|---------|
| `GET /health` | Liveness — process is up |
| `GET /ready` | Readiness — Postgres + Redis reachable |
| `GET /trpc/health.ping` | tRPC ping (protocol version) |

Image `HEALTHCHECK` hits `/ready` (API) or `/` (web).

## Warmup

`docker/scripts/api-entrypoint.sh`:

1. Wait for Postgres/Redis TCP (and best-effort S3)
2. Run `yarn workspace @hydrox/db migrate`
3. `exec` the container CMD

## Probes / stack tests

```bash
# Infra only (postgres/redis/s3) — assumes compose already up or brings it up
yarn test:stack:infra

# Full dev stack including api + web HTTP
yarn test:stack:full

# Prod compose images
yarn test:stack:prod          # HTTP-only probe (DB/S3 stay on the compose network)

# Probe against already-running services
yarn probe:stack              # postgres + redis + s3
yarn probe:stack:full         # + api /health /ready + web
```

Agents: after Docker/infra changes run `yarn test:stack:infra` (or `full` when touching API/web images). Include `yarn probe:stack` in `ci:local` when infra is up.

## Env

See `docker/.env.example`.

## Images

Multi-stage Dockerfiles use `turbo prune --docker` for `@hydrox/api` and `@hydrox/web`.

Prod: `yarn docker:prod` → `docker/docker-compose.prod.yml`.
