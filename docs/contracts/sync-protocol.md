# Sync protocol

1. Client applies Dexie write immediately.
2. Enqueue `SyncOp` and `sync.push`.
3. Server merges with field-level merge (`@hydrox/sync`).
4. Non-overlapping fields merge; same-field stale writes → `SyncConflict`.
5. Client shows conflict UI; user chooses local/server per field.
6. Server publishes `entity.patch` on Redis; peers apply via tRPC subscription over **HTTP SSE** (`httpSubscriptionLink`). `@nest-native/trpc` does not expose a WebSocket upgrade on `/trpc`.
