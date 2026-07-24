# Sync protocol

1. Client applies Dexie write immediately.
2. Enqueue `SyncOp` and `sync.push`.
3. Server merges with field-level merge (`@hydrox/sync`).
4. Non-overlapping fields merge; same-field stale writes → `SyncConflict`.
5. Client stores conflicts in Dexie and shows **ConflictDialog**; user chooses local/server per field.
6. Server publishes `entity.patch` on the in-process sync bus; peers apply via tRPC subscription over **HTTP SSE**.

Soft-deleted issues arrive as patches with `deletedAt` set; clients remove them from the local board.

Issue patches include: `type`, `priority`, `assigneeId`, `reporterId`, `epicId`, `parentIssueId`, `sprintId`, `storyPoints`, `backlogRank`, and `labelIds` (resolved from `issue_labels`). Label membership may also be set via `work.setIssueLabels`.
