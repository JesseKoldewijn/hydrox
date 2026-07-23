# Infra

## Compose services

- `postgres` — primary DB
- `redis` — pub/sub + future caches
- `localstack` — S3-compatible (JesseKoldewijn/openstack LocalStack port when available; fallback `localstack/localstack`)
- `api` — Nest API image
- `web` — Octane static/SSR host

## Env

See `docker/.env.example`.

## Images

Multi-stage Dockerfiles use `turbo prune --docker` for `@hydrox/api` and `@hydrox/web`.

Prod: `yarn docker:prod` → `docker/docker-compose.prod.yml`.
