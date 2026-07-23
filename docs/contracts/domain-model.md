# Domain model

Organization → Workspace → Project → Epic → Issue (story|bug|task|sub_task)

Initiatives: `organization` or `project` scope. Org initiatives link to project-owned epics.

Issue keys: Jira-style `PROJECTKEY-N` (unique per project).

## UI flow (v0)

- Shell: project context in sidebar; tabs Board / Backlog / Sprints / Initiatives / Activity / Notifications / Settings.
- Board: create issue → local Dexie → sync → real key on card; DnD across status columns.
- Issue detail panel: open from board card — edit title/description, comments, attachments, soft-delete.
- Conflicts: modal over shell until resolved.

Soft delete on primary entities. Audit retention 30 days — see [retention.md](./retention.md).
