# Architecture

- Monorepo: `apps/api` (Nest/Fastify), `apps/web` (Octane source), shared `packages/*`.
- **Single Nest process** serves tRPC + SPA on one origin (default `:3000`).
- Server source of truth: **MySQL** via Drizzle (`@hydrox/db`).
- Client: local-first **Dexie** (`@octanejs/dexie`); sync via tRPC push/pull.
- Transport: tRPC HTTP + **SSE** subscriptions (`httpSubscriptionLink`). No WS upgrade on `/trpc`.
- Realtime fan-out: in-process `SyncBusService` (EventEmitter). Not multi-replica in v0.
- Attachments: MySQL `LONGBLOB` (not object storage).
- Auth: local password only.
- SSG/static: Vite build + Nest `@fastify/static`; skeletons avoid CLS.
- Package boundary: web must not import `@hydrox/db`.
