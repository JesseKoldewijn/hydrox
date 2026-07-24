# Permissions

Default fixed roles:

- Org: owner / admin / member
- Workspace: admin / member
- Project: admin / member / viewer

Plus:

- Project capability overrides (`work.setProjectOverrides`)
- Organization custom roles (`work.createCustomRole`, `work.listCustomRoles`)

Settings UI: project name/key, workflow status CRUD/reorder, custom roles, member-targeted overrides, purge.

People tab: `work.listProjectMembers` / `addProjectMember` / `removeProjectMember` (requires `members.manage`).

Capabilities catalog: see `capabilitySchema` in `@hydrox/contracts`.
