/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { liveQuery } from "dexie";
import { buttonVariants } from "@hydrox/ui";
import { rankBetween } from "@hydrox/domain";
import { db, type LocalIssue } from "../lib/db";
import { trpc } from "../lib/trpc";
import { updateIssueLocally } from "../lib/sync-engine";
import { PriorityIcon, TypeChip, IssuePeopleMeta } from "../components/issue-meta";
import { useAppSearch, useIssueNav } from "../lib/navigation";
import { FieldError, FormError } from "../components/form";

export function BacklogView(props: { projectId: string; organizationId: string }) {
  const { openIssue } = useIssueNav();
  const selectedId = useAppSearch().issue ?? null;
  const [issues, setIssues] = useState<LocalIssue[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [sprintName, setSprintName] = useState("");
  const [assignSprintId, setAssignSprintId] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [bulkPriority, setBulkPriority] = useState("");
  const [bulkSprintId, setBulkSprintId] = useState("");
  const [statuses, setStatuses] = useState<any[]>([]);
  const [bulkStatusId, setBulkStatusId] = useState("");
  const [sprintNameError, setSprintNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function refreshSprints() {
    const [rows, st, m, comps] = await Promise.all([
      (trpc as any).work.sprints.query({ projectId: props.projectId }),
      (trpc as any).work.statuses.query({ projectId: props.projectId }),
      (trpc as any).work.listProjectMembers.query({
        projectId: props.projectId,
      }),
      (trpc as any).work.listComponents.query({ projectId: props.projectId }),
    ]);
    setSprints(rows.filter((s: any) => s.state !== "closed"));
    setStatuses(st);
    setMembers(m);
    setComponents(comps);
    if (!assignSprintId && rows[0]) setAssignSprintId(rows[0].id);
  }

  useEffect(() => {
    void refreshSprints();
    const sub = liveQuery(() =>
      db.issues.where("projectId").equals(props.projectId).sortBy("backlogRank"),
    ).subscribe({
      next: (rows) => setIssues(rows.filter((r) => !r.deletedAt && !r.sprintId)),
    });
    return () => sub.unsubscribe();
  }, [props.projectId]);

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= issues.length) return;
    const a = issues[index]!;
    const b = issues[target]!;
    const before = dir < 0 ? (issues[target - 1]?.backlogRank ?? null) : b.backlogRank;
    const after = dir < 0 ? b.backlogRank : (issues[target + 1]?.backlogRank ?? null);
    const rank = rankBetween(before, after);
    await updateIssueLocally(a.id, { backlogRank: rank });
  }

  async function addToSprint(issueId: string, sprintId: string) {
    if (!sprintId) return;
    await updateIssueLocally(issueId, { sprintId });
  }

  async function applyBulk() {
    const ids = Object.entries(checked)
      .filter(([, on]) => on)
      .map(([id]) => id);
    if (!ids.length) return;
    const patch: Record<string, unknown> = {};
    if (bulkPriority) patch.priority = bulkPriority;
    if (bulkSprintId) patch.sprintId = bulkSprintId === "__none__" ? null : bulkSprintId;
    if (bulkStatusId) patch.statusId = bulkStatusId;
    if (!Object.keys(patch).length) return;
    await (trpc as any).work.bulkUpdateIssues.mutate({ ids, patch });
    for (const id of ids) {
      const current = await db.issues.get(id);
      if (!current) continue;
      await db.issues.put({
        ...current,
        ...patch,
        version: current.version + 1,
        updatedAt: new Date().toISOString(),
        pending: false,
      } as any);
    }
    setChecked({});
  }

  const selectedCount = Object.values(checked).filter(Boolean).length;

  function memberName(userId: string | null | undefined) {
    if (!userId) return null;
    return members.find((m) => m.userId === userId)?.user?.displayName ?? userId;
  }

  function componentNames(ids: string[] | undefined) {
    if (!ids?.length) return [];
    return ids.map((id) => components.find((c) => c.id === id)?.name).filter(Boolean) as string[];
  }

  return (
    <div class="view-stack" data-testid="backlog-view">
      <div class="board-main space-y-3">
        <h1 class="panel-title">Backlog</h1>

        <form
          class="form-panel"
          data-testid="create-sprint-inline"
          noValidate
          onSubmit={(e: any) => {
            e.preventDefault();
            setFormError(null);
            if (!sprintName.trim()) {
              setSprintNameError("Sprint name is required");
              return;
            }
            setSprintNameError(null);
            void (trpc as any).work.createSprint
              .mutate({ projectId: props.projectId, name: sprintName.trim() })
              .then(() => {
                setSprintName("");
                return refreshSprints();
              })
              .catch((err: unknown) => {
                setFormError(err instanceof Error ? err.message : "Could not create sprint");
              });
          }}
        >
          <p class="form-panel-title">Sprint planning</p>
          <div class="form-row composer">
            <label class="control-field grow">
              <span class="control-label required">New sprint</span>
              <input
                class={"control toolbar-input" + (sprintNameError ? " is-invalid" : "")}
                placeholder="Sprint name"
                required
                value={sprintName}
                onInput={(e: any) => {
                  setSprintName(e.currentTarget.value);
                  setSprintNameError(null);
                }}
              />
              <FieldError message={sprintNameError} />
            </label>
            <button class={buttonVariants.secondary} type="submit">
              Create sprint
            </button>
            <label class="control-field">
              <span class="control-label">Assign to</span>
              <select
                class="control"
                data-testid="backlog-target-sprint"
                value={assignSprintId}
                onChange={(e: any) => setAssignSprintId(e.currentTarget.value)}
              >
                <option value="">Choose sprint…</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <FormError message={formError} />
        </form>

        {selectedCount > 0 ? (
          <div class="form-panel" data-testid="bulk-edit-bar">
            <p class="form-panel-title">{selectedCount} selected</p>
            <div class="form-row composer">
              <label class="control-field">
                <span class="control-label">Priority</span>
                <select
                  class="control"
                  data-testid="bulk-priority"
                  value={bulkPriority}
                  onChange={(e: any) => setBulkPriority(e.currentTarget.value)}
                >
                  <option value="">No change</option>
                  <option value="highest">Highest</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="lowest">Lowest</option>
                </select>
              </label>
              <label class="control-field">
                <span class="control-label">Sprint</span>
                <select
                  class="control"
                  data-testid="bulk-sprint"
                  value={bulkSprintId}
                  onChange={(e: any) => setBulkSprintId(e.currentTarget.value)}
                >
                  <option value="">No change</option>
                  <option value="__none__">Backlog</option>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label class="control-field">
                <span class="control-label">Status</span>
                <select
                  class="control"
                  data-testid="bulk-status"
                  value={bulkStatusId}
                  onChange={(e: any) => setBulkStatusId(e.currentTarget.value)}
                >
                  <option value="">No change</option>
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                class={buttonVariants.default}
                type="button"
                data-testid="bulk-apply"
                onClick={() => void applyBulk()}
              >
                Apply
              </button>
            </div>
          </div>
        ) : null}

        {issues.length === 0 ? (
          <div class="empty-panel" data-testid="backlog-empty">
            <p class="empty-title">Backlog is empty</p>
            <p class="empty-copy">
              Issues without a sprint show up here. Create them on the board.
            </p>
          </div>
        ) : (
          <ul class="space-y-1.5" data-testid="backlog-list">
            {issues.map((issue, i) => (
              <li
                key={issue.id}
                class={"issue-row" + (selectedId === issue.id ? " issue-card-selected" : "")}
                data-testid="backlog-row"
                data-issue-key={issue.key}
              >
                <label class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    data-testid="bulk-check"
                    checked={!!checked[issue.id]}
                    onChange={(e: any) =>
                      setChecked((prev) => ({
                        ...prev,
                        [issue.id]: e.currentTarget.checked,
                      }))
                    }
                  />
                </label>
                <button type="button" class="issue-row-main" onClick={() => openIssue(issue.id)}>
                  <TypeChip type={issue.type} />
                  <PriorityIcon priority={issue.priority ?? "medium"} />
                  <span class="issue-key">{issue.key}</span>
                  <span class="issue-title">{issue.title}</span>
                </button>
                <IssuePeopleMeta
                  assigneeName={memberName(issue.assigneeId)}
                  componentNames={componentNames(issue.componentIds)}
                  compact
                />
                <div class="issue-row-actions">
                  <button
                    type="button"
                    class={buttonVariants.ghost + " row-icon-btn"}
                    aria-label="Move up"
                    data-testid="backlog-move-up"
                    onClick={() => void move(i, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    class={buttonVariants.ghost + " row-icon-btn"}
                    aria-label="Move down"
                    data-testid="backlog-move-down"
                    onClick={() => void move(i, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    class={buttonVariants.secondary + " add-sprint-btn"}
                    data-testid="add-to-sprint"
                    disabled={!assignSprintId}
                    onClick={() => void addToSprint(issue.id, assignSprintId)}
                  >
                    <span class="add-sprint-full">Add to sprint</span>
                    <span class="add-sprint-short">Sprint</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
