# Architecture

- Monorepo: `apps/api` (Nest), `apps/web` (Octane), shared `packages/*`.
- Server is source of truth in Postgres; client is local-first via Dexie.
- Transport: tRPC over HTTP + WebSocket subscriptions.
- Realtime fan-out: Redis pub/sub channel `hydrox:sync`.
- SSG: prerender stable shells + skeletons; hydrate then paint Dexie cache.
- Package boundary: web must not import `@hydrox/db`.
