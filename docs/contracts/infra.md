# Infra

## Compose services

- `mysql` — primary DB (`mysqladmin ping`)
- `app` — Nest serves tRPC + Octane (Vite middleware in dev, static SSG in prod)

All services declare Compose `healthcheck`s. `app` uses `depends_on: condition: service_healthy`.

## Health endpoints (app)

| Path | Meaning |
|------|---------|
| `GET /health` | Liveness — process is up |
| `GET /ready` | Readiness — MySQL reachable |
| `GET /trpc/health.ping` | tRPC ping (protocol version) |

Image `HEALTHCHECK` hits `/ready`.

## Warmup

`docker/scripts/api-entrypoint.sh`:

1. Wait for MySQL TCP
2. Run `yarn workspace @hydrox/db migrate`
3. `exec` the container CMD

## Probes / stack tests

```bash
# Infra only (mysql) — assumes compose already up or brings it up
yarn test:stack:infra

# Full stack including app HTTP (same origin)
yarn test:stack:full

# Prod compose image
yarn test:stack:prod          # HTTP-only probe (MySQL stays on the compose network)

# Probe against already-running services
yarn probe:stack              # mysql
yarn probe:stack:full         # + /health /ready + SPA
```

Agents: after Docker/infra changes run `yarn test:stack:infra` (or `full` when touching the app image). Include `yarn probe:stack` in `ci:local` when infra is up.

## Env

See `docker/.env.example`.

## Images

Single multi-stage Dockerfile (`docker/api.Dockerfile`) builds Octane into `apps/web/dist` and Nest into `apps/api/dist`. Nest serves both.

Prod: `yarn docker:prod` → `docker/docker-compose.prod.yml`.
