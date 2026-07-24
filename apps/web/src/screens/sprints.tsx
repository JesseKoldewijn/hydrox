/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { liveQuery } from "dexie";
import { buttonVariants } from "@hydrox/ui";
import { db, type LocalIssue } from "../lib/db";
import { trpc } from "../lib/trpc";
import { updateIssueLocally } from "../lib/sync-engine";
import { PriorityIcon, TypeChip, IssuePeopleMeta } from "../components/issue-meta";
import { useIssueNav } from "../lib/navigation";
import { FieldError, FormError } from "../components/form";

export function SprintsView(props: { projectId: string; organizationId: string }) {
  const { openIssue } = useIssueNav();
  const [sprints, setSprints] = useState<any[]>([]);
  const [issues, setIssues] = useState<LocalIssue[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [completeTarget, setCompleteTarget] = useState<Record<string, string>>({});
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [sp, m, comps] = await Promise.all([
      (trpc as any).work.sprints.query({ projectId: props.projectId }),
      (trpc as any).work.listProjectMembers.query({
        projectId: props.projectId,
      }),
      (trpc as any).work.listComponents.query({ projectId: props.projectId }),
    ]);
    setSprints(sp);
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
  }, [props.projectId]);

  function memberName(userId: string | null | undefined) {
    if (!userId) return null;
    return members.find((m) => m.userId === userId)?.user?.displayName ?? userId;
  }

  function componentNames(ids: string[] | undefined) {
    if (!ids?.length) return [];
    return ids.map((id) => components.find((c) => c.id === id)?.name).filter(Boolean) as string[];
  }

  const sections = [
    {
      key: "active",
      title: "Active",
      items: sprints.filter((s) => s.state === "active"),
    },
    {
      key: "future",
      title: "Future",
      items: sprints.filter((s) => s.state === "future"),
    },
    {
      key: "closed",
      title: "Closed",
      items: sprints.filter((s) => s.state === "closed"),
    },
  ];

  const futureSprints = sprints.filter((s) => s.state === "future");

  return (
    <div class="view-stack" data-testid="sprints-view">
      <div class="board-main space-y-5">
        <h1 class="panel-title">Sprints</h1>
        <form
          class="form-panel"
          data-testid="create-sprint-form"
          noValidate
          onSubmit={(e: any) => {
            e.preventDefault();
            setFormError(null);
            if (!name.trim()) {
              setNameError("Sprint name is required");
              return;
            }
            setNameError(null);
            setBusy(true);
            void (trpc as any).work.createSprint
              .mutate({
                projectId: props.projectId,
                name: name.trim(),
                goal: goal.trim() || null,
              })
              .then(() => {
                setName("");
                setGoal("");
                return refresh();
              })
              .catch((err: unknown) => {
                setFormError(err instanceof Error ? err.message : "Could not create sprint");
              })
              .finally(() => setBusy(false));
          }}
        >
          <p class="form-panel-title">Create sprint</p>
          <div class="form-row composer">
            <label class="control-field grow">
              <span class="control-label required">Name</span>
              <input
                class={"control toolbar-input" + (nameError ? " is-invalid" : "")}
                data-testid="sprint-name-input"
                value={name}
                required
                placeholder="Sprint name"
                onInput={(e: any) => {
                  setName(e.currentTarget.value);
                  setNameError(null);
                }}
              />
              <FieldError message={nameError} />
            </label>
            <label class="control-field grow">
              <span class="control-label">Goal</span>
              <input
                class="control toolbar-input"
                data-testid="sprint-goal-input"
                value={goal}
                placeholder="Optional goal"
                onInput={(e: any) => setGoal(e.currentTarget.value)}
              />
            </label>
            <button class={buttonVariants.default} type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create sprint"}
            </button>
          </div>
          <FormError message={formError} />
        </form>

        {sprints.length === 0 ? (
          <div class="empty-panel" data-testid="sprints-empty">
            <p class="empty-title">No sprints yet</p>
            <p class="empty-copy">Create a sprint, then pull issues in from the backlog.</p>
          </div>
        ) : null}

        {sections.map((section) => (
          <section key={section.key} data-testid={`sprints-${section.key}`}>
            <h2 class="section-heading">{section.title}</h2>
            {section.items.length === 0 ? (
              <p class="text-sm text-muted-foreground">None</p>
            ) : (
              <ul class="space-y-3">
                {section.items.map((s) => {
                  const sprintIssues = issues.filter((i) => i.sprintId === s.id);
                  return (
                    <li key={s.id} class="surface-card" data-testid="sprint-card">
                      <div class="flex flex-wrap items-start justify-between gap-2">
                        <div class="min-w-0">
                          <div class="font-medium">{s.name}</div>
                          {s.goal ? (
                            <div class="text-sm text-muted-foreground">{s.goal}</div>
                          ) : null}
                          <div class="mt-1 text-xs text-muted-foreground">
                            {sprintIssues.length} issues
                            {s.startDate
                              ? ` · started ${new Date(s.startDate).toLocaleDateString()}`
                              : ""}
                            {s.endDate
                              ? ` · ended ${new Date(s.endDate).toLocaleDateString()}`
                              : ""}
                          </div>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                          {s.state === "future" ? (
                            <button
                              class={buttonVariants.secondary}
                              type="button"
                              data-testid="start-sprint"
                              onClick={() =>
                                void (trpc as any).work.startSprint
                                  .mutate({ id: s.id })
                                  .then(refresh)
                              }
                            >
                              Start
                            </button>
                          ) : null}
                          {s.state === "active" ? (
                            <>
                              <select
                                class="toolbar-select"
                                data-testid="complete-move-target"
                                value={completeTarget[s.id] ?? ""}
                                onChange={(e: any) =>
                                  setCompleteTarget((prev) => ({
                                    ...prev,
                                    [s.id]: e.currentTarget.value,
                                  }))
                                }
                              >
                                <option value="">Incomplete → backlog</option>
                                {futureSprints.map((fs) => (
                                  <option key={fs.id} value={fs.id}>
                                    Incomplete → {fs.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                class={buttonVariants.default}
                                type="button"
                                data-testid="complete-sprint"
                                onClick={() =>
                                  void (trpc as any).work.completeSprint
                                    .mutate({
                                      id: s.id,
                                      moveIncompleteToSprintId: completeTarget[s.id] || null,
                                    })
                                    .then(refresh)
                                }
                              >
                                Complete
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <ul class="mt-3 space-y-1">
                        {sprintIssues.length === 0 ? (
                          <li class="text-sm text-muted-foreground">No issues in this sprint</li>
                        ) : (
                          sprintIssues.map((issue) => (
                            <li
                              key={issue.id}
                              class="flex flex-wrap items-center gap-2 text-sm"
                              data-testid="sprint-issue"
                            >
                              <button
                                type="button"
                                class="issue-row-link min-w-0 flex-1"
                                onClick={() => openIssue(issue.id)}
                              >
                                <TypeChip type={issue.type} />
                                <PriorityIcon priority={issue.priority ?? "medium"} />
                                <span class="issue-key">{issue.key}</span>
                                <span class="truncate">{issue.title}</span>
                              </button>
                              <IssuePeopleMeta
                                assigneeName={memberName(issue.assigneeId)}
                                componentNames={componentNames(issue.componentIds)}
                                compact
                              />
                              {s.state !== "closed" ? (
                                <button
                                  type="button"
                                  class={buttonVariants.ghost}
                                  onClick={() =>
                                    void updateIssueLocally(issue.id, {
                                      sprintId: null,
                                    })
                                  }
                                >
                                  Remove
                                </button>
                              ) : null}
                            </li>
                          ))
                        )}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
