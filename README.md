# Hydrox

Jira-style work management: NestJS (tRPC + Octane SPA) with Dexie local-first sync and MySQL.

## Stack

- Yarn Berry (`nodeLinker: node-modules`) + Turborepo
- `apps/api` — Nest 11 + Fastify + `@nest-native/trpc` (serves SPA)
- `apps/web` — Octane + Tailwind CSS 4 + Dexie
- MySQL + Drizzle (attachments stored as LONGBLOB)

## Quick start

```bash
cp docker/.env.example docker/.env
yarn install
yarn docker:up   # mysql (+ optional Nest app)
yarn workspace @hydrox/db migrate
yarn dev         # Nest on :3000 with Vite HMR middleware
```

- App (SPA + API): http://localhost:3000
- tRPC: http://localhost:3000/trpc

## Agent / CI

See [`AGENTS.md`](./AGENTS.md). Local equivalents of CI:

```bash
yarn validate
yarn ci:local
```

## Docs

Contracts and ADRs live in [`docs/`](./docs/). Start with [`AGENTS.md`](./AGENTS.md) and [`docs/contracts/`](./docs/contracts/).

### v0 product surfaces

Board + issue detail (comments, attachments, soft-delete), backlog/sprints/initiatives, conflict dialog, custom roles/overrides, retention purge, in-app notifications + optional Web Push (`/sw.js`).
