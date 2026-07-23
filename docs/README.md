# Docs index

- [Agent rules](./agents/README.md)
- [Contracts](./contracts/) — architecture law for agents
- [ADRs](./adr/)

## Contracts map

| Doc | Topic |
|-----|--------|
| [architecture.md](./contracts/architecture.md) | Nest SPA, MySQL, Dexie, SSE |
| [infra.md](./contracts/infra.md) | Compose (MySQL + app), probes, health |
| [api-envelope.md](./contracts/api-envelope.md) | Errors, pagination, idempotency |
| [sync-protocol.md](./contracts/sync-protocol.md) | Local-first ops, conflicts, SSE |
| [auth.md](./contracts/auth.md) | Password auth + sessions |
| [permissions.md](./contracts/permissions.md) | Roles, overrides, custom roles |
| [domain-model.md](./contracts/domain-model.md) | Hierarchy, keys, soft delete |
| [storage.md](./contracts/storage.md) | Attachment BLOBs |
| [notifications.md](./contracts/notifications.md) | In-app + Web Push |
| [i18n-theming.md](./contracts/i18n-theming.md) | Locales + theme |
| [retention.md](./contracts/retention.md) | Soft-delete purge + audit 30d |

Local CI equivalents: root `AGENTS.md` and `.github/workflows/ci.yml`.
