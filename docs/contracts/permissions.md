# Permissions

Default fixed roles:

- Org: owner / admin / member
- Workspace: admin / member
- Project: admin / member / viewer

Plus:

- Project capability overrides (`work.setProjectOverrides`)
- Organization custom roles (`work.createCustomRole`, `work.listCustomRoles`)

Settings UI: create/list custom roles, set overrides for a target user id, trigger purge.

Capabilities catalog: see `capabilitySchema` in `@hydrox/contracts`.
