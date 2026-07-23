# Domain model

Organization → Workspace → Project → Epic → Issue (story|bug|task|sub_task)

Initiatives: `organization` or `project` scope. Org initiatives link to project-owned epics.

Issue keys: Jira-style `PROJECTKEY-N`.

Soft delete on primary entities. Audit retention 30 days.
