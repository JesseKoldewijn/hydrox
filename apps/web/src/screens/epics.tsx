/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { liveQuery } from "dexie";
import { buttonVariants } from "@hydrox/ui";
import { db, type LocalIssue } from "../lib/db";
import { trpc } from "../lib/trpc";
import { PriorityIcon, TypeChip, IssuePeopleMeta } from "../components/issue-meta";
import { useIssueNav } from "../lib/navigation";
import { FieldError, FormError } from "../components/form";

export function EpicsView(props: { projectId: string; organizationId: string }) {
  const { openIssue } = useIssueNav();
  const [epics, setEpics] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [initiatives, setInitiatives] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [initiativeId, setInitiativeId] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [issues, setIssues] = useState<LocalIssue[]>([]);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [e, c, ini, m, comps] = await Promise.all([
      (trpc as any).work.epics.query({ projectId: props.projectId }),
      (trpc as any).work.epicIssueCounts.query({ projectId: props.projectId }),
      (trpc as any).work.initiatives.query({
        organizationId: props.organizationId,
      }),
      (trpc as any).work.listProjectMembers.query({
        projectId: props.projectId,
      }),
      (trpc as any).work.listComponents.query({ projectId: props.projectId }),
    ]);
    setEpics(e);
    setCounts(c);
    setInitiatives(ini);
    setMembers(m);
    setComponents(comps);
  }

  useEffect(() => {
    void refresh();
    const sub = liveQuery(() =>
      db.issues.where("projectId").equals(props.projectId).toArray(),
    ).subscribe({
      next: (rows) => setIssues(rows.filter((r) => !r.deletedAt)),
    });
    return () => sub.unsubscribe();
  }, [props.projectId, props.organizationId]);

  const childIssues = expandedId ? issues.filter((i) => i.epicId === expandedId) : [];

  function memberName(userId: string | null | undefined) {
    if (!userId) return null;
    return members.find((m) => m.userId === userId)?.user?.displayName ?? userId;
  }

  function componentNames(ids: string[] | undefined) {
    if (!ids?.length) return [];
    return ids.map((id) => components.find((c) => c.id === id)?.name).filter(Boolean) as string[];
  }

  return (
    <div class="view-stack" data-testid="epics-view">
      <div class="board-main space-y-3">
        <h1 class="panel-title">Epics</h1>
        <form
          class="form-panel"
          data-testid="create-epic-form"
          noValidate
          onSubmit={(e: any) => {
            e.preventDefault();
            setFormError(null);
            if (!name.trim()) {
              setNameError("Epic name is required");
              return;
            }
            setNameError(null);
            setBusy(true);
            void (trpc as any).work.createEpic
              .mutate({
                projectId: props.projectId,
                name: name.trim(),
                initiativeId: initiativeId || null,
              })
              .then(() => {
                setName("");
                return refresh();
              })
              .catch((err: unknown) => {
                setFormError(err instanceof Error ? err.message : "Could not create epic");
              })
              .finally(() => setBusy(false));
          }}
        >
          <p class="form-panel-title">Create epic</p>
          <div class="form-row composer">
            <label class="control-field grow">
              <span class="control-label required">Name</span>
              <input
                class={"control toolbar-input" + (nameError ? " is-invalid" : "")}
                data-testid="epic-name-input"
                placeholder="Epic name"
                required
                value={name}
                onInput={(e: any) => {
                  setName(e.currentTarget.value);
                  setNameError(null);
                }}
              />
              <FieldError message={nameError} />
            </label>
            <label class="control-field">
              <span class="control-label">Initiative</span>
              <select
                class="control"
                data-testid="epic-initiative"
                value={initiativeId}
                onChange={(e: any) => setInitiativeId(e.currentTarget.value)}
              >
                <option value="">None</option>
                {initiatives.map((ini) => (
                  <option key={ini.id} value={ini.id}>
                    {ini.name}
                  </option>
                ))}
              </select>
            </label>
            <button class={buttonVariants.default} type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create epic"}
            </button>
          </div>
          <FormError message={formError} />
        </form>

        <ul class="space-y-2" data-testid="epics-list">
          {epics.length === 0 ? (
            <li class="empty-panel" data-testid="epics-empty">
              <p class="empty-title">No epics yet</p>
              <p class="empty-copy">
                Group related work into an epic, then link issues from the board.
              </p>
            </li>
          ) : null}
          {epics.map((epic) => (
            <li key={epic.id} class="surface-card" data-testid="epic-card">
              <button
                type="button"
                class="w-full text-left"
                onClick={() => setExpandedId((id) => (id === epic.id ? null : epic.id))}
              >
                <div class="flex items-center gap-2">
                  <span class="expand-chevron" aria-hidden="true">
                    {expandedId === epic.id ? "▾" : "▸"}
                  </span>
                  <div class="min-w-0">
                    <div class="font-medium">{epic.name}</div>
                    <div class="text-xs text-muted-foreground">
                      {counts[epic.id] ?? 0} linked issues
                      {epic.initiativeId
                        ? ` · ${initiatives.find((i) => i.id === epic.initiativeId)?.name ?? "initiative"}`
                        : ""}
                    </div>
                  </div>
                </div>
              </button>
              {expandedId === epic.id ? (
                <ul class="mt-3 space-y-1 border-t border-border pt-2">
                  {childIssues.length === 0 ? (
                    <li class="text-sm text-muted-foreground">No issues yet</li>
                  ) : (
                    childIssues.map((issue) => (
                      <li key={issue.id} class="epic-child-row">
                        <button
                          type="button"
                          class="issue-row-link"
                          data-testid="epic-child-issue"
                          onClick={() => openIssue(issue.id)}
                        >
                          <TypeChip type={issue.type} />
                          <PriorityIcon priority={issue.priority ?? "medium"} />
                          <span class="issue-key">{issue.key}</span>
                          {issue.title}
                        </button>
                        <IssuePeopleMeta
                          assigneeName={memberName(issue.assigneeId)}
                          componentNames={componentNames(issue.componentIds)}
                          compact
                        />
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
