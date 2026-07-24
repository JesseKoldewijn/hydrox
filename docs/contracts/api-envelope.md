# API envelope

- Errors use `ErrorCode` from `@hydrox/contracts`.
- Sync mutations require UUID `idempotencyKey`.
- Pagination: `{ cursor, limit }` → `{ nextCursor }`.
- Auth: httpOnly `hydrox_session` cookie; Bearer token accepted.
- Protocol version: `PROTOCOL_VERSION = 1`.
