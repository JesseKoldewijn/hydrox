# Hydrox

Jira-style work management: NestJS API + Octane web client, tRPC end-to-end, Dexie local-first sync.

## Stack

- Yarn Berry (`nodeLinker: node-modules`) + Turborepo
- `apps/api` — Nest 11 + Fastify + `@nest-native/trpc`
- `apps/web` — Octane + Tailwind CSS 4 + Dexie
- Postgres + Drizzle, Redis pub/sub, S3 (LocalStack locally)

## Quick start

```bash
cp docker/.env.example docker/.env
yarn install
yarn docker:up   # postgres, redis, localstack (+ optional api/web)
yarn workspace @hydrox/db generate
yarn workspace @hydrox/db migrate
yarn dev
```

- Web: http://localhost:5173
- API: http://localhost:3001/trpc

## Agent / CI

See [`AGENTS.md`](./AGENTS.md). Local equivalents of CI:

```bash
yarn validate
yarn ci:local
```

## Docs

Contracts and ADRs live in [`docs/`](./docs/).
