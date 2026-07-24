# ADR 0001 — HTTP adapter (h3 vs Fastify)

## Status

Accepted (fallback)

## Context

Plan prefers h3/Hattip under Nest with tRPC HTTP + WebSocket subscriptions. Nest first-class platforms are Express/Fastify; h3 is community (`nestjs-platform-h3`). `@nest-native/trpc` documents Express/Fastify adapters.

## Decision

Ship v0 on **Nest + Fastify** (`@nestjs/platform-fastify` + `@fastify/websocket`) for reliable tRPC subscriptions and Nest DI.

Re-evaluate h3 behind an adapter spike if upstream Nest/tRPC support matures.

## Consequences

- Fastify plugins (`cors`, `cookie`, `websocket`) are first-class.
- ADR documents deviation from h3 preference without blocking delivery.
