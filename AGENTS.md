# Hydrox agent guide

Hydrox is a Yarn Berry (`nodeLinker: node-modules`) + Turborepo monorepo.

## Packages

| Package | Role |
|---------|------|
| `apps/api` | NestJS + Fastify + `@nest-native/trpc` |
| `apps/web` | Octane + Tailwind 4 + Dexie local-first client |
| `packages/contracts` | Zod contracts (must stay in sync with `docs/contracts`) |
| `packages/db` | Drizzle schema + migrations |
| `packages/domain` | Pure domain helpers (issue keys, ranks, permissions) |
| `packages/sync` | Field-level merge + conflict helpers |
| `packages/trpc` | Shared tRPC constants/types |
| `packages/ui` | Shared CSS tokens + `cn()` |

## Contracts

Read `docs/contracts/*` before changing API, sync, auth, storage, or domain shapes.
Update **docs and Zod together**.

## Mandatory local validation (before commit / push)

CI only runs on GitHub Actions, but agents must run the same checks locally when relevant:

```bash
yarn lint
yarn typecheck
yarn test
# when touching API/DB/sync:
yarn test:integration
# when touching web UX:
yarn workspace @hydrox/web test:e2e
# when touching Docker/infra/health:
yarn test:stack:infra          # compose + postgres/redis/s3 probe
# yarn test:stack:full         # also boots api+web and probes HTTP
yarn probe:stack               # probe already-running infra
# yarn probe:stack:full        # + /health /ready + web
```

Or: `yarn validate` / `yarn ci:local` (includes `probe:stack` when infra is up).

## Rules

- Do not import `@hydrox/db` from `apps/web`.
- Prefer local-first Dexie writes; sync via tRPC push/pull + subscriptions.
- SSG shells must reserve layout height (skeletons) — no CLS.
- Auth providers must not fork product features (unified user model).
- Soft-delete by default; purge via jobs / admin trigger.
- Audit events retain **30 days**.

## Adapter note

Prefer h3 when viable; current implementation uses **Fastify** after spike — see `docs/adr/0001-http-adapter.md`.
