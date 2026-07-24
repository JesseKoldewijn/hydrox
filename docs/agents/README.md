# Agent rules

1. Follow root `AGENTS.md`.
2. Treat `docs/contracts/*` as architecture law (MySQL + Nest SPA; no Redis/S3/WorkOS in v0).
3. Run local validation before commit/push.
4. Octane authoring: prefer `.tsx` with `/** @jsxImportSource octane */`; use `onInput` for text fields.
5. Nest routers live under `apps/api/src/trpc` with `@nest-native/trpc` decorators.
6. Keep conflict UI, issue detail, attachments, roles, and purge wired when touching sync or board.
7. Never ship exploit PoCs or destructive git commands.
