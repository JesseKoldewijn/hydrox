/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { buttonVariants } from "@hydrox/ui";
import { trpc } from "../lib/trpc";
import { t } from "../i18n";
import { FieldError, FormError, FormHint, FormSuccess, labelize } from "../components/form";

const CAPS = [
  "project.view",
  "project.edit",
  "board.edit",
  "issue.create",
  "issue.edit",
  "issue.delete",
  "sprint.manage",
  "workflow.manage",
  "members.manage",
  "roles.manage",
  "attachments.manage",
  "purge.trigger",
] as const;

export function SettingsView(props: { organizationId: string; projectId: string }) {
  const [roleName, setRoleName] = useState("");
  const [selected, setSelected] = useState<string[]>(["board.edit"]);
  const [roles, setRoles] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState("");
  const [overrideCaps, setOverrideCaps] = useState<string[]>(["board.edit"]);
  const [purgeMsg, setPurgeMsg] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [projectErrors, setProjectErrors] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<any[]>([]);
  const [statusName, setStatusName] = useState("");
  const [statusCategory, setStatusCategory] = useState<"todo" | "in_progress" | "done">("todo");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);

  async function refreshRoles() {
    const rows = await (trpc as any).work.listCustomRoles.query({
      organizationId: props.organizationId,
    });
    setRoles(rows);
  }

  async function refreshProject() {
    const [s, m, p] = await Promise.all([
      (trpc as any).work.statuses.query({ projectId: props.projectId }),
      (trpc as any).work.listProjectMembers.query({
        projectId: props.projectId,
      }),
      (trpc as any).work.project.query({ projectId: props.projectId }),
    ]);
    setStatuses(s);
    setMembers(m);
    if (p) {
      setProjectName(p.name);
      setProjectKey(p.key);
    }
  }

  useEffect(() => {
    void refreshRoles();
    void refreshProject();
  }, [props.organizationId, props.projectId]);

  return (
    <div class="space-y-6" data-testid="settings-view">
      <h1 class="panel-title">Settings</h1>
      <FormError message={error} />
      <FormSuccess message={message} testId="role-created-message" />

      <section class="section-card">
        <h2>Project</h2>
        <form
          class="space-y-3"
          data-testid="project-settings-form"
          noValidate
          onSubmit={(e: any) => {
            e.preventDefault();
            const next: Record<string, string> = {};
            if (!projectName.trim()) next.name = "Name is required";
            if (!projectKey.trim()) next.key = "Key is required";
            else if (!/^[A-Z][A-Z0-9]{1,9}$/.test(projectKey.trim())) {
              next.key = "Key must be 2–10 uppercase letters/numbers";
            }
            setProjectErrors(next);
            if (Object.keys(next).length) return;
            setError(null);
            void (trpc as any).work.updateProject
              .mutate({
                id: props.projectId,
                name: projectName.trim(),
                key: projectKey.trim(),
              })
              .then(() => setMessage("Project saved"))
              .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Could not save project");
              });
          }}
        >
          <label class="control-field">
            <span class="control-label required">Name</span>
            <input
              class={"control" + (projectErrors.name ? " is-invalid" : "")}
              data-testid="project-name-input"
              required
              value={projectName}
              onInput={(e: any) => {
                setProjectName(e.currentTarget.value);
                setProjectErrors((prev) => {
                  const n = { ...prev };
                  delete n.name;
                  return n;
                });
              }}
            />
            <FieldError message={projectErrors.name} />
          </label>
          <label class="control-field">
            <span class="control-label required">Key</span>
            <input
              class={"control" + (projectErrors.key ? " is-invalid" : "")}
              data-testid="project-key-input"
              required
              value={projectKey}
              onInput={(e: any) => {
                setProjectKey(e.currentTarget.value.toUpperCase());
                setProjectErrors((prev) => {
                  const n = { ...prev };
                  delete n.key;
                  return n;
                });
              }}
            />
            <FieldError message={projectErrors.key} />
            <FormHint>Used as the issue key prefix (e.g. HYDX-12).</FormHint>
          </label>
          <button class={buttonVariants.default} type="submit" data-testid="save-project">
            Save project
          </button>
        </form>
      </section>

      <section class="section-card">
        <h2>Workflow statuses</h2>
        <ul class="space-y-2" data-testid="workflow-statuses">
          {statuses.map((s, idx) => (
            <li
              key={s.id}
              class="flex flex-wrap items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm"
            >
              <input
                class="control flex-1"
                value={s.name}
                onInput={(e: any) => {
                  const name = e.currentTarget.value;
                  setStatuses((prev) => prev.map((x) => (x.id === s.id ? { ...x, name } : x)));
                }}
                onBlur={() =>
                  void (trpc as any).work.updateWorkflowStatus.mutate({
                    id: s.id,
                    name: s.name,
                  })
                }
              />
              <span class="text-xs text-muted-foreground">{labelize(String(s.category))}</span>
              <button
                type="button"
                class={buttonVariants.ghost}
                disabled={idx === 0}
                onClick={() => {
                  const ordered = statuses.map((x) => x.id);
                  const tmp = ordered[idx - 1]!;
                  ordered[idx - 1] = ordered[idx]!;
                  ordered[idx] = tmp;
                  void (trpc as any).work.reorderWorkflowStatuses
                    .mutate({
                      projectId: props.projectId,
                      orderedIds: ordered,
                    })
                    .then(refreshProject);
                }}
              >
                ↑
              </button>
              <button
                type="button"
                class={buttonVariants.ghost}
                disabled={idx === statuses.length - 1}
                onClick={() => {
                  const ordered = statuses.map((x) => x.id);
                  const tmp = ordered[idx + 1]!;
                  ordered[idx + 1] = ordered[idx]!;
                  ordered[idx] = tmp;
                  void (trpc as any).work.reorderWorkflowStatuses
                    .mutate({
                      projectId: props.projectId,
                      orderedIds: ordered,
                    })
                    .then(refreshProject);
                }}
              >
                ↓
              </button>
            </li>
          ))}
        </ul>
        <form
          class="form-row composer"
          noValidate
          onSubmit={(e: any) => {
            e.preventDefault();
            if (!statusName.trim()) {
              setStatusError("Status name is required");
              return;
            }
            setStatusError(null);
            void (trpc as any).work.createWorkflowStatus
              .mutate({
                projectId: props.projectId,
                name: statusName.trim(),
                category: statusCategory,
              })
              .then(() => {
                setStatusName("");
                return refreshProject();
              });
          }}
        >
          <label class="control-field grow">
            <span class="control-label required">Name</span>
            <input
              class={"control toolbar-input" + (statusError ? " is-invalid" : "")}
              data-testid="status-name-input"
              placeholder="New status"
              required
              value={statusName}
              onInput={(e: any) => {
                setStatusName(e.currentTarget.value);
                setStatusError(null);
              }}
            />
            <FieldError message={statusError} />
          </label>
          <label class="control-field">
            <span class="control-label">Category</span>
            <select
              class="control"
              value={statusCategory}
              onChange={(e: any) => setStatusCategory(e.currentTarget.value)}
            >
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </label>
          <button class={buttonVariants.secondary} type="submit">
            Add status
          </button>
        </form>
      </section>

      <section class="section-card">
        <h2>{t("settings.roles")}</h2>
        <label class="control-field">
          <span class="control-label required">Role name</span>
          <input
            class={"control" + (roleError ? " is-invalid" : "")}
            data-testid="role-name-input"
            placeholder="Role name"
            value={roleName}
            onInput={(e: any) => {
              setRoleName(e.currentTarget.value);
              setRoleError(null);
            }}
          />
          <FieldError message={roleError} />
        </label>
        <div class="checkbox-grid">
          {CAPS.map((cap) => (
            <label key={cap} class="checkbox-option">
              <input
                type="checkbox"
                data-testid={`cap-${cap}`}
                checked={selected.includes(cap)}
                onChange={(e: any) => {
                  setSelected((prev) =>
                    e.currentTarget.checked ? [...prev, cap] : prev.filter((c) => c !== cap),
                  );
                }}
              />
              <span>{cap}</span>
            </label>
          ))}
        </div>
        <button
          class={buttonVariants.default}
          type="button"
          data-testid="create-role-submit"
          onClick={() => {
            if (!roleName.trim()) {
              setRoleError("Role name is required");
              return;
            }
            if (!selected.length) {
              setRoleError("Select at least one capability");
              return;
            }
            setRoleError(null);
            void (trpc as any).work.createCustomRole
              .mutate({
                organizationId: props.organizationId,
                name: roleName.trim(),
                capabilities: selected,
              })
              .then(() => {
                setMessage("Custom role created");
                setRoleName("");
                return refreshRoles();
              })
              .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Could not create role");
              });
          }}
        >
          Create custom role
        </button>
        <ul class="space-y-1 text-sm" data-testid="custom-roles-list">
          {roles.map((r) => (
            <li key={r.id} class="rounded-md border border-border px-2 py-1">
              <span class="font-medium">{r.name}</span>
              {" — "}
              <span class="text-muted-foreground">{(r.capabilities ?? []).join(", ")}</span>
            </li>
          ))}
        </ul>
      </section>

      <section class="section-card">
        <h2>{t("settings.overrides")}</h2>
        <label class="control-field">
          <span class="control-label required">Member</span>
          <select
            class={"control" + (overrideError ? " is-invalid" : "")}
            data-testid="override-user-id"
            value={targetUserId}
            onChange={(e: any) => {
              setTargetUserId(e.currentTarget.value);
              setOverrideError(null);
            }}
          >
            <option value="">Select member</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user?.displayName ?? m.userId}
              </option>
            ))}
          </select>
          <FieldError message={overrideError} />
        </label>
        <div class="checkbox-grid">
          {CAPS.map((cap) => (
            <label key={cap} class="checkbox-option">
              <input
                type="checkbox"
                checked={overrideCaps.includes(cap)}
                onChange={(e: any) => {
                  setOverrideCaps((prev) =>
                    e.currentTarget.checked ? [...prev, cap] : prev.filter((c) => c !== cap),
                  );
                }}
              />
              <span>{cap}</span>
            </label>
          ))}
        </div>
        <button
          class={buttonVariants.secondary}
          type="button"
          data-testid="set-overrides-submit"
          onClick={() => {
            if (!targetUserId) {
              setOverrideError("Select a member");
              return;
            }
            setOverrideError(null);
            void (trpc as any).work.setProjectOverrides
              .mutate({
                projectId: props.projectId,
                targetUserId,
                capabilities: overrideCaps,
              })
              .then(() => setMessage("Overrides saved"))
              .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : "Could not save overrides");
              });
          }}
        >
          Save project overrides
        </button>
      </section>

      <section class="section-card">
        <h2>{t("settings.purge")}</h2>
        <FormHint>
          Runs 30-day audit purge and soft-delete hard purge. Force skips the age gate for
          soft-deleted rows.
        </FormHint>
        <button
          class={buttonVariants.secondary}
          type="button"
          data-testid="trigger-purge"
          onClick={() =>
            void (trpc as any).admin.triggerPurge
              .mutate({ force: true })
              .then((r: any) => setPurgeMsg(`Purge ok (force=${r.force})`))
              .catch((err: unknown) =>
                setPurgeMsg(err instanceof Error ? err.message : "Purge failed"),
              )
          }
        >
          Run retention purge
        </button>
        {purgeMsg ? (
          <p class="form-success" data-testid="purge-message">
            {purgeMsg}
          </p>
        ) : null}
      </section>
    </div>
  );
}
