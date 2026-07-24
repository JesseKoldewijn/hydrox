/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { buttonVariants } from "@hydrox/ui";
import { liveQuery } from "dexie";
import { db, type LocalIssue } from "../lib/db";
import { trpc } from "../lib/trpc";
import { createIssueLocally, updateIssueLocally } from "../lib/sync-engine";
import { t } from "../i18n";
import { SkeletonBlock } from "../components/skeleton";
import {
  ISSUE_TYPES,
  PRIORITIES,
  PriorityIcon,
  TypeChip,
  IssuePeopleMeta,
} from "../components/issue-meta";
import { useAppSearch, useBoardFilterNav, useBoardSearch, useIssueNav } from "../lib/navigation";
import { FieldError, FormError, FormHint, labelize } from "../components/form";

export function BoardView(props: { projectId: string; organizationId: string }) {
  const appSearch = useAppSearch();
  const boardSearch = useBoardSearch();
  const { openIssue } = useIssueNav();
  const { patchBoardSearch } = useBoardFilterNav();
  const selectedId = appSearch.issue ?? null;
  const filterAssignee = boardSearch.assignee ?? "";
  const filterType = boardSearch.issueType ?? "";
  const filterLabel = boardSearch.label ?? "";
  const filterComponent = boardSearch.component ?? "";
  const swimlane = boardSearch.swimlaneMode;

  const [statuses, setStatuses] = useState<any[]>([]);
  const [issues, setIssues] = useState<LocalIssue[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [epics, setEpics] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [createType, setCreateType] = useState<string>("story");
  const [createPriority, setCreatePriority] = useState<string>("medium");
  const [createAssignee, setCreateAssignee] = useState("");
  const [createComponents, setCreateComponents] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [ready, setReady] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [s, lb, m, e, tpl, comps] = await Promise.all([
        (trpc as any).work.statuses.query({ projectId: props.projectId }),
        (trpc as any).work.listLabels.query({ projectId: props.projectId }),
        (trpc as any).work.listProjectMembers.query({
          projectId: props.projectId,
        }),
        (trpc as any).work.epics.query({ projectId: props.projectId }),
        (trpc as any).work.listIssueTemplates.query({
          projectId: props.projectId,
        }),
        (trpc as any).work.listComponents.query({ projectId: props.projectId }),
      ]);
      setStatuses(s);
      setLabels(lb);
      setMembers(m);
      setEpics(e);
      setTemplates(tpl);
      setComponents(comps);
      setReady(true);
    })();
    const sub = liveQuery(() =>
      db.issues.where("projectId").equals(props.projectId).sortBy("backlogRank"),
    ).subscribe({
      next: (rows) => setIssues(rows.filter((r) => !r.deletedAt)),
      error: (e) => console.error(e),
    });
    return () => sub.unsubscribe();
  }, [props.projectId]);

  function memberName(userId: string | null | undefined) {
    if (!userId) return null;
    return members.find((m) => m.userId === userId)?.user?.displayName ?? userId;
  }

  function componentNames(ids: string[] | undefined) {
    if (!ids?.length) return [];
    return ids.map((id) => components.find((c) => c.id === id)?.name).filter(Boolean) as string[];
  }

  const filtered = issues.filter((i) => {
    if (filterAssignee === "__none__" && i.assigneeId) return false;
    if (filterAssignee && filterAssignee !== "__none__" && i.assigneeId !== filterAssignee)
      return false;
    if (filterType && i.type !== filterType) return false;
    if (filterLabel && !(i.labelIds ?? []).includes(filterLabel)) return false;
    if (filterComponent && !(i.componentIds ?? []).includes(filterComponent)) return false;
    return true;
  });

  function laneKey(issue: LocalIssue) {
    if (swimlane === "epic") return issue.epicId ?? "__none__";
    if (swimlane === "assignee") return issue.assigneeId ?? "__none__";
    return "__all__";
  }

  function laneLabel(key: string) {
    if (swimlane === "none") return null;
    if (swimlane === "epic") {
      if (key === "__none__") return "No epic";
      return epics.find((e) => e.id === key)?.name ?? "Epic";
    }
    if (key === "__none__") return "Unassigned";
    return members.find((m) => m.userId === key)?.user?.displayName ?? key;
  }

  const laneKeys = swimlane === "none" ? ["__all__"] : Array.from(new Set(filtered.map(laneKey)));

  async function onDrop(statusId: string, issueId: string) {
    await updateIssueLocally(issueId, { statusId });
  }

  async function createFromForm() {
    setCreateError(null);
    if (!title.trim()) {
      setTitleError("Title is required");
      return;
    }
    if (!statuses[0] || creating) return;
    setTitleError(null);
    setCreating(true);
    try {
      if (templateId) {
        const issue = await (trpc as any).work.createIssue.mutate({
          projectId: props.projectId,
          type: createType,
          title: title.trim(),
          priority: createPriority,
          templateId,
          assigneeId: createAssignee || null,
          componentIds: createComponents,
        });
        await db.issues.put({
          id: issue.id,
          projectId: issue.projectId,
          key: issue.key,
          type: issue.type,
          title: issue.title,
          description: issue.description,
          statusId: issue.statusId,
          assigneeId: issue.assigneeId,
          reporterId: issue.reporterId,
          epicId: issue.epicId,
          parentIssueId: issue.parentIssueId,
          sprintId: issue.sprintId,
          priority: issue.priority,
          backlogRank: issue.backlogRank,
          storyPoints: issue.storyPoints,
          dueDate: issue.dueDate ? new Date(issue.dueDate).toISOString() : null,
          originalEstimateMinutes: issue.originalEstimateMinutes,
          remainingEstimateMinutes: issue.remainingEstimateMinutes,
          fixVersionId: issue.fixVersionId,
          labelIds: [],
          componentIds: createComponents,
          version: issue.version,
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        });
      } else {
        await createIssueLocally({
          projectId: props.projectId,
          type: createType,
          title: title.trim(),
          statusId: statuses[0].id,
          priority: createPriority,
          assigneeId: createAssignee || null,
          componentIds: createComponents,
        });
      }
      setTitle("");
      setCreateAssignee("");
      setCreateComponents([]);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create issue");
    } finally {
      setCreating(false);
    }
  }

  if (!ready) {
    return (
      <div class="board-columns" data-testid="board-loading">
        <SkeletonBlock class="h-80" />
        <SkeletonBlock class="h-80" />
        <SkeletonBlock class="h-80" />
      </div>
    );
  }

  return (
    <div data-testid="board-view" class="view-stack">
      <div class="board-main">
        <h1 class="panel-title">{t("nav.board")}</h1>
        <form
          class="form-panel"
          data-testid="create-issue-form"
          noValidate
          onSubmit={(e: any) => {
            e.preventDefault();
            void createFromForm();
          }}
        >
          <p class="form-panel-title">New issue</p>
          <div class="form-row composer">
            <label class="control-field">
              <span class="control-label">Template</span>
              <select
                class="control"
                data-testid="create-template"
                value={templateId}
                onChange={(e: any) => setTemplateId(e.currentTarget.value)}
              >
                <option value="">None</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </label>
            <label class="control-field">
              <span class="control-label">Type</span>
              <select
                class="control"
                data-testid="create-issue-type"
                value={createType}
                onChange={(e: any) => setCreateType(e.currentTarget.value)}
              >
                {ISSUE_TYPES.filter((ty) => ty !== "sub_task").map((ty) => (
                  <option key={ty} value={ty}>
                    {labelize(ty)}
                  </option>
                ))}
              </select>
            </label>
            <label class="control-field">
              <span class="control-label">Priority</span>
              <select
                class="control"
                data-testid="create-issue-priority"
                value={createPriority}
                onChange={(e: any) => setCreatePriority(e.currentTarget.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {labelize(p)}
                  </option>
                ))}
              </select>
            </label>
            <label class="control-field">
              <span class="control-label">Assignee</span>
              <select
                class="control"
                data-testid="create-issue-assignee"
                value={createAssignee}
                onChange={(e: any) => setCreateAssignee(e.currentTarget.value)}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.displayName ?? m.userId}
                  </option>
                ))}
              </select>
            </label>
            <label class="control-field grow">
              <span class="control-label required">Title</span>
              <input
                class={"control toolbar-input" + (titleError ? " is-invalid" : "")}
                data-testid="issue-title-input"
                placeholder={t("issue.create")}
                required
                value={title}
                onInput={(e: any) => {
                  setTitle(e.currentTarget.value);
                  if (titleError) setTitleError(null);
                }}
              />
              <FieldError message={titleError} testId="issue-title-error" />
            </label>
            <button
              class={buttonVariants.default}
              type="submit"
              data-testid="create-issue-submit"
              disabled={creating}
            >
              {creating ? "Creating…" : t("issue.create")}
            </button>
          </div>
          {components.length ? (
            <div class="form-row create-components-row" data-testid="create-issue-components">
              <span class="control-label">Components</span>
              <div class="flex flex-wrap gap-2">
                {components.map((c) => {
                  const on = createComponents.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      class={on ? "label-chip active" : "label-chip"}
                      data-testid="create-component-chip"
                      onClick={() =>
                        setCreateComponents((prev) =>
                          on ? prev.filter((id) => id !== c.id) : [...prev, c.id],
                        )
                      }
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <FormHint>No components yet — add them under Releases.</FormHint>
          )}
          <FormError message={createError} />
        </form>

        <div class="form-panel" data-testid="board-quick-filters">
          <p class="form-panel-title">Filters</p>
          <div class="form-row">
            <label class="control-field">
              <span class="control-label">Swimlanes</span>
              <select
                class="control"
                data-testid="swimlane-mode"
                value={swimlane}
                onChange={(e: any) => {
                  const v = e.currentTarget.value;
                  patchBoardSearch({
                    swimlane: v === "epic" || v === "assignee" ? v : undefined,
                  });
                }}
              >
                <option value="none">None</option>
                <option value="epic">By epic</option>
                <option value="assignee">By assignee</option>
              </select>
            </label>
            <label class="control-field">
              <span class="control-label">Assignee</span>
              <select
                class="control"
                data-testid="filter-assignee"
                value={filterAssignee}
                onChange={(e: any) =>
                  patchBoardSearch({
                    assignee: e.currentTarget.value || undefined,
                  })
                }
              >
                <option value="">All</option>
                <option value="__none__">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.displayName ?? m.userId}
                  </option>
                ))}
              </select>
            </label>
            <label class="control-field">
              <span class="control-label">Type</span>
              <select
                class="control"
                data-testid="filter-type"
                value={filterType}
                onChange={(e: any) =>
                  patchBoardSearch({
                    issueType: e.currentTarget.value || undefined,
                  })
                }
              >
                <option value="">All</option>
                {ISSUE_TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {labelize(ty)}
                  </option>
                ))}
              </select>
            </label>
            <label class="control-field">
              <span class="control-label">Label</span>
              <select
                class="control"
                data-testid="filter-label"
                value={filterLabel}
                onChange={(e: any) =>
                  patchBoardSearch({
                    label: e.currentTarget.value || undefined,
                  })
                }
              >
                <option value="">All</option>
                {labels.map((lb) => (
                  <option key={lb.id} value={lb.id}>
                    {lb.name}
                  </option>
                ))}
              </select>
            </label>
            <label class="control-field">
              <span class="control-label">Component</span>
              <select
                class="control"
                data-testid="filter-component"
                value={filterComponent}
                onChange={(e: any) =>
                  patchBoardSearch({
                    component: e.currentTarget.value || undefined,
                  })
                }
              >
                <option value="">All</option>
                {components.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div class="empty-panel" data-testid="board-empty">
            <p class="empty-title">
              {issues.length === 0 ? "No issues yet" : "No matching issues"}
            </p>
            <p class="empty-copy">
              {issues.length === 0
                ? "Create an issue above to populate the board."
                : "Clear filters or adjust swimlanes to see cards again."}
            </p>
          </div>
        ) : null}

        {laneKeys.map((lane) => (
          <section key={lane} class="swimlane" data-testid="swimlane">
            {swimlane !== "none" ? <h2 class="swimlane-title">{laneLabel(lane)}</h2> : null}
            <div class="board-columns" data-testid="board-columns">
              {statuses.map((status) => {
                const columnIssues = filtered.filter(
                  (i) => i.statusId === status.id && laneKey(i) === lane,
                );
                return (
                  <section
                    key={status.id}
                    class="board-column"
                    data-testid={`column-${status.name}`}
                    onDragOver={(e: any) => e.preventDefault()}
                    onDrop={(e: any) => {
                      e.preventDefault();
                      const issueId = e.dataTransfer.getData("text/issue-id");
                      if (issueId) void onDrop(status.id, issueId);
                    }}
                  >
                    <h2 class="board-column-title">
                      {status.name}
                      <span class="board-column-count">{columnIssues.length}</span>
                    </h2>
                    <div class="space-y-1.5">
                      {columnIssues.length === 0 ? (
                        <p class="column-empty">Drop issues here</p>
                      ) : null}
                      {columnIssues.map((issue) => (
                        <article
                          key={issue.id}
                          class={
                            "issue-card" + (selectedId === issue.id ? " issue-card-selected" : "")
                          }
                          data-testid="issue-card"
                          data-issue-key={issue.key}
                          data-pending={issue.pending ? "true" : "false"}
                          draggable
                          onDragStart={(e: any) => {
                            e.dataTransfer.setData("text/issue-id", issue.id);
                          }}
                          onClick={() => openIssue(issue.id)}
                        >
                          <div class="flex items-center gap-1.5">
                            <TypeChip type={issue.type} />
                            <PriorityIcon priority={issue.priority ?? "medium"} />
                            <div class="issue-key">{issue.key}</div>
                          </div>
                          <div class="issue-title">{issue.title}</div>
                          <IssuePeopleMeta
                            assigneeName={memberName(issue.assigneeId)}
                            componentNames={componentNames(issue.componentIds)}
                            compact
                          />
                          {issue.pending ? (
                            <span class="sync-pill" data-testid="syncing-pill">
                              Syncing
                            </span>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
