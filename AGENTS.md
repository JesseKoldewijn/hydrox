# Hydrox agent guide

Hydrox is a Yarn Berry (`nodeLinker: node-modules`) + Turborepo monorepo.

## Packages

| Package | Role |
|---------|------|
| `apps/api` | NestJS + Fastify + `@nest-native/trpc` — serves tRPC **and** the Octane SPA |
| `apps/web` | Octane + Tailwind 4 + Dexie local-first client (source); built assets served by Nest |
| `packages/contracts` | Zod contracts (must stay in sync with `docs/contracts`) |
| `packages/db` | Drizzle **MySQL** schema + migrations |
| `packages/domain` | Pure domain helpers (issue keys, ranks, permissions) |
| `packages/sync` | Field-level merge + conflict helpers |
| `packages/trpc` | Shared tRPC constants/types |
| `packages/ui` | Shared CSS tokens + `cn()` |

## Architecture (v0)

- **One process / one origin** (default `:3000`): Nest serves `/trpc`, `/health`, `/ready`, and Octane (Vite middleware in dev, static `apps/web/dist` in prod).
- **External runtime dep:** MySQL only (Compose/CI).
- **Sync fan-out:** in-process `EventEmitter` (`apps/api/src/sync`). Multi-replica Redis is out of v0 scope.
- **Attachments:** MySQL `LONGBLOB` via `work.uploadAttachment` / `work.attachmentDownload`.
- **Auth:** local username/password only (no WorkOS in v0).
- **Realtime subscriptions:** HTTP SSE (`httpSubscriptionLink`), not WebSockets.

## Contracts

Read `docs/contracts/*` before changing API, sync, auth, storage, or domain shapes.
Update **docs and Zod together**.

## Product surfaces agents must keep working

- Board (Kanban DnD), backlog, sprints, initiatives, activity
- Issue detail (key, comments, attachments, soft-delete)
- Conflict dialog (Dexie `conflicts` → resolve per field)
- Settings: custom roles, project overrides, admin purge
- Notifications: in-app list + optional Web Push (`/sw.js` + VAPID env)
- Soft-delete + scheduled purge (30d) + audit retention (30d)

## Mandatory local validation (before commit / push)

```bash
yarn lint
yarn typecheck
yarn test
# when touching API/DB/sync/jobs:
yarn test:integration
# when touching web UX:
yarn workspace @hydrox/web test:e2e
# when touching Docker/infra/health:
yarn test:stack:infra
# yarn test:stack:full
yarn probe:stack
```

Or: `yarn validate` / `yarn ci:local`.

## Dev

```bash
yarn docker:up          # MySQL
yarn db:migrate
PORT=3000 yarn dev      # Nest + Vite HMR on :3000
```

Unset legacy `API_PORT=3001` if present, or set `PORT=3000`.

## Rules

- Do not import `@hydrox/db` from `apps/web`.
- Prefer local-first Dexie writes; sync via tRPC push/pull + SSE subscriptions.
- SSG/static shells must reserve layout height (skeletons) — no CLS.
- Soft-delete by default; purge via cron + `admin.triggerPurge`.
- Audit events retain **30 days** (`AUDIT_RETENTION_DAYS`).
- Octane: `/** @jsxImportSource octane */`; use `onInput` for text fields.
- Nest routers under `apps/api/src/trpc` with `@nest-native/trpc` decorators.

## Adapter note

HTTP adapter is **Fastify** — see `docs/adr/0001-http-adapter.md`.
