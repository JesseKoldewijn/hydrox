# Domain model

Organization → Workspace → Project → Epic → Issue (story|bug|task|sub_task)

Initiatives: `organization` or `project` scope. Org initiatives link to project-owned epics.

Issue keys: Jira-style `PROJECTKEY-N` (unique per project).

## Issue fields

- `type`: `story | bug | task | sub_task`
- `priority`: `highest | high | medium | low | lowest` (default `medium`)
- `epicId`, `parentIssueId` (sub-tasks), `assigneeId`, `reporterId`, `sprintId`, `storyPoints`, `backlogRank`
- `dueDate`, `originalEstimateMinutes`, `remainingEstimateMinutes`, `fixVersionId`
- Labels: `labels` + `issue_labels` M2M
- Components: `components` + `issue_components` M2M
- Links: `issue_links` (`blocks | is_blocked_by | relates_to | duplicates`)

## Project planning extras

- `project_versions` (releases), `issue_templates`, `dashboards` + `dashboard_gadgets`
- Epics: optional `startDate` / `targetDate` for roadmap

## UI flow

- Shell tabs: Board / Backlog / Sprints / Epics / Roadmap / Initiatives / Filters / People / Releases / Dashboard / Activity / Notifications / Settings
- Topbar search: `work.searchIssues` by key/title
- Board: swimlanes (epic/assignee), templates on create, type/priority, quick filters, DnD
- Issue detail: components, versions, due date, estimates, labels, sub-tasks, links, comments, attachments
- Backlog: bulk edit (priority/status/sprint)
- Releases: versions, components, issue templates
- Dashboard: seeded gadgets (stats, priority, sprint, activity)
- Roadmap: epic progress bars + date editing

Soft delete on primary entities. Audit retention 30 days — see [retention.md](./retention.md).

Out of scope: AI, Slack/GitHub/Confluence/email/SSO/marketplace/third-party webhooks; JSM / Product Discovery.
