/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { buttonVariants } from "@hydrox/ui";
import { trpc } from "../lib/trpc";
import { FieldError, FormError, FormHint, labelize } from "../components/form";

export function ReleasesView(props: { projectId: string }) {
  const [versions, setVersions] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [vName, setVName] = useState("");
  const [cName, setCName] = useState("");
  const [tName, setTName] = useState("");
  const [tType, setTType] = useState("story");
  const [tPriority, setTPriority] = useState("medium");
  const [vError, setVError] = useState<string | null>(null);
  const [cError, setCError] = useState<string | null>(null);
  const [tError, setTError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function refresh() {
    const [v, c, t] = await Promise.all([
      (trpc as any).work.listProjectVersions.query({
        projectId: props.projectId,
      }),
      (trpc as any).work.listComponents.query({ projectId: props.projectId }),
      (trpc as any).work.listIssueTemplates.query({
        projectId: props.projectId,
      }),
    ]);
    setVersions(v);
    setComponents(c);
    setTemplates(t);
  }

  useEffect(() => {
    void refresh();
  }, [props.projectId]);

  return (
    <div class="space-y-6" data-testid="releases-view">
      <h1 class="panel-title">Releases</h1>
      <FormError message={formError} />

      <section class="section-card">
        <h2>Versions</h2>
        <form
          class="form-row composer"
          data-testid="create-version-form"
          noValidate
          onSubmit={(e: any) => {
            e.preventDefault();
            setFormError(null);
            if (!vName.trim()) {
              setVError("Version name is required");
              return;
            }
            setVError(null);
            void (trpc as any).work.createProjectVersion
              .mutate({ projectId: props.projectId, name: vName.trim() })
              .then(() => {
                setVName("");
                return refresh();
              })
              .catch((err: unknown) => {
                setFormError(err instanceof Error ? err.message : "Could not add version");
              });
          }}
        >
          <label class="control-field grow">
            <span class="control-label required">Name</span>
            <input
              class={"control toolbar-input" + (vError ? " is-invalid" : "")}
              data-testid="version-name"
              placeholder="e.g. 1.0.0"
              required
              value={vName}
              onInput={(e: any) => {
                setVName(e.currentTarget.value);
                setVError(null);
              }}
            />
            <FieldError message={vError} />
          </label>
          <button class={buttonVariants.default} type="submit">
            Add version
          </button>
        </form>
        <ul class="space-y-2" data-testid="versions-list">
          {versions.length === 0 ? (
            <li class="empty-panel compact">
              <p class="empty-copy">No versions yet.</p>
            </li>
          ) : null}
          {versions.map((v) => (
            <li
              key={v.id}
              class="flex items-center justify-between rounded-md border border-border px-3 py-2"
              data-testid="version-row"
            >
              <div>
                <div class="font-medium">{v.name}</div>
                <div class="text-xs text-muted-foreground">
                  {v.released ? "Released" : "Unreleased"}
                  {v.archived ? " · archived" : ""}
                </div>
              </div>
              {!v.released ? (
                <button
                  class={buttonVariants.secondary}
                  type="button"
                  data-testid="release-version"
                  onClick={() =>
                    void (trpc as any).work.updateProjectVersion
                      .mutate({ id: v.id, released: true })
                      .then(refresh)
                  }
                >
                  Release
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section class="section-card">
        <h2>Components</h2>
        <form
          class="form-row composer"
          data-testid="create-component-form"
          noValidate
          onSubmit={(e: any) => {
            e.preventDefault();
            setFormError(null);
            if (!cName.trim()) {
              setCError("Component name is required");
              return;
            }
            setCError(null);
            void (trpc as any).work.createComponent
              .mutate({ projectId: props.projectId, name: cName.trim() })
              .then(() => {
                setCName("");
                return refresh();
              })
              .catch((err: unknown) => {
                setFormError(err instanceof Error ? err.message : "Could not add component");
              });
          }}
        >
          <label class="control-field grow">
            <span class="control-label required">Name</span>
            <input
              class={"control toolbar-input" + (cError ? " is-invalid" : "")}
              data-testid="component-name"
              placeholder="e.g. Frontend"
              required
              value={cName}
              onInput={(e: any) => {
                setCName(e.currentTarget.value);
                setCError(null);
              }}
            />
            <FieldError message={cError} />
          </label>
          <button class={buttonVariants.default} type="submit">
            Add component
          </button>
        </form>
        <ul class="space-y-1" data-testid="components-list">
          {components.length === 0 ? (
            <li class="empty-panel compact">
              <p class="empty-copy">No components yet.</p>
            </li>
          ) : null}
          {components.map((c) => (
            <li key={c.id} class="rounded-md border border-border px-3 py-2 text-sm">
              {c.name}
            </li>
          ))}
        </ul>
      </section>

      <section class="section-card">
        <h2>Issue templates</h2>
        <FormHint>Templates pre-fill type and priority when creating issues on the board.</FormHint>
        <form
          class="form-row composer"
          data-testid="create-template-form"
          noValidate
          onSubmit={(e: any) => {
            e.preventDefault();
            setFormError(null);
            if (!tName.trim()) {
              setTError("Template name is required");
              return;
            }
            setTError(null);
            void (trpc as any).work.createIssueTemplate
              .mutate({
                projectId: props.projectId,
                name: tName.trim(),
                defaults: { type: tType, priority: tPriority },
              })
              .then(() => {
                setTName("");
                return refresh();
              })
              .catch((err: unknown) => {
                setFormError(err instanceof Error ? err.message : "Could not add template");
              });
          }}
        >
          <label class="control-field grow">
            <span class="control-label required">Name</span>
            <input
              class={"control toolbar-input" + (tError ? " is-invalid" : "")}
              data-testid="template-name"
              placeholder="Template name"
              required
              value={tName}
              onInput={(e: any) => {
                setTName(e.currentTarget.value);
                setTError(null);
              }}
            />
            <FieldError message={tError} />
          </label>
          <label class="control-field">
            <span class="control-label">Type</span>
            <select
              class="control"
              value={tType}
              onChange={(e: any) => setTType(e.currentTarget.value)}
            >
              <option value="story">Story</option>
              <option value="bug">Bug</option>
              <option value="task">Task</option>
            </select>
          </label>
          <label class="control-field">
            <span class="control-label">Priority</span>
            <select
              class="control"
              value={tPriority}
              onChange={(e: any) => setTPriority(e.currentTarget.value)}
            >
              <option value="highest">Highest</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="lowest">Lowest</option>
            </select>
          </label>
          <button class={buttonVariants.default} type="submit">
            Add template
          </button>
        </form>
        <ul class="space-y-1" data-testid="templates-list">
          {templates.length === 0 ? (
            <li class="empty-panel compact">
              <p class="empty-copy">No templates yet.</p>
            </li>
          ) : null}
          {templates.map((t) => (
            <li
              key={t.id}
              class="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <span>
                {t.name} · {labelize(String((t.defaults as any)?.type ?? "task"))} /{" "}
                {labelize(String((t.defaults as any)?.priority ?? "medium"))}
              </span>
              <button
                class={buttonVariants.ghost}
                type="button"
                onClick={() =>
                  void (trpc as any).work.deleteIssueTemplate.mutate({ id: t.id }).then(refresh)
                }
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
