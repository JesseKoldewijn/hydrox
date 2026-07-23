# Retention & purge

## Audit events

- Written for significant mutations (see `audit_events` table).
- Retained **`AUDIT_RETENTION_DAYS` (30)** calendar days.
- Daily cron (`RetentionJobsService.purgeAuditEvents`) deletes older rows.
- Manual: `admin.triggerPurge` also runs audit purge.

## Soft delete

- Primary entities support `deletedAt` / `deletedById`.
- Issues soft-deleted from the issue detail panel (and sync patches with `deletedAt`).
- Board/backlog hide soft-deleted issues.

## Hard purge

- Soft-deleted issues still referenced by attachments/comments are cleaned by deleting those children first, then the issue rows.
- Daily cron hard-deletes soft-deleted `comments`, `attachments`, `issues`, `projects` older than **30 days**.
- `admin.triggerPurge({ force: true })` purges soft-deleted rows immediately (still auth-gated).
- Settings UI exposes purge for org admins (`data-testid="trigger-purge"`).

## Tests

- Unit/integration cover purge helpers against MySQL.
- Agents: run `yarn test:integration` after changing jobs.
