/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { buttonVariants } from "@hydrox/ui";
import { trpc } from "../lib/trpc";
import { FieldError, FormError, FormHint, labelize } from "../components/form";

export function InitiativesView(props: { organizationId: string; projectId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [epics, setEpics] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<"organization" | "project">("organization");
  const [linkEpicId, setLinkEpicId] = useState("");
  const [linkInitiativeId, setLinkInitiativeId] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [ini, ep] = await Promise.all([
      (trpc as any).work.initiatives.query({
        organizationId: props.organizationId,
      }),
      (trpc as any).work.epics.query({ projectId: props.projectId }),
    ]);
    setItems(ini);
    setEpics(ep);
    if (!linkInitiativeId && ini[0]) setLinkInitiativeId(ini[0].id);
    if (!linkEpicId && ep[0]) setLinkEpicId(ep[0].id);
  }

  useEffect(() => {
    void refresh();
  }, [props.organizationId, props.projectId]);

  return (
    <div class="space-y-5" data-testid="initiatives-view">
      <h1 class="panel-title">Initiatives</h1>
      <FormError message={formError} />

      <form
        class="form-panel"
        data-testid="create-initiative-form"
        noValidate
        onSubmit={(e: any) => {
          e.preventDefault();
          setFormError(null);
          if (!name.trim()) {
            setNameError("Name is required");
            return;
          }
          setNameError(null);
          setBusy(true);
          void (trpc as any).work.createInitiative
            .mutate({
              organizationId: props.organizationId,
              projectId: scope === "project" ? props.projectId : null,
              scope,
              name: name.trim(),
              description: description.trim() || null,
            })
            .then(() => {
              setName("");
              setDescription("");
              return refresh();
            })
            .catch((err: unknown) => {
              setFormError(err instanceof Error ? err.message : "Could not create initiative");
            })
            .finally(() => setBusy(false));
        }}
      >
        <p class="form-panel-title">Create initiative</p>
        <div class="form-row composer">
          <label class="control-field grow">
            <span class="control-label required">Name</span>
            <input
              class={"control toolbar-input" + (nameError ? " is-invalid" : "")}
              data-testid="initiative-name"
              value={name}
              required
              onInput={(e: any) => {
                setName(e.currentTarget.value);
                setNameError(null);
              }}
              placeholder="Initiative name"
            />
            <FieldError message={nameError} />
          </label>
          <label class="control-field grow">
            <span class="control-label">Description</span>
            <input
              class="control toolbar-input"
              data-testid="initiative-description"
              value={description}
              onInput={(e: any) => setDescription(e.currentTarget.value)}
              placeholder="Optional summary"
            />
          </label>
          <label class="control-field">
            <span class="control-label">Scope</span>
            <select
              class="control"
              value={scope}
              onChange={(e: any) => setScope(e.currentTarget.value)}
            >
              <option value="organization">Organization-wide</option>
              <option value="project">This project</option>
            </select>
          </label>
          <button class={buttonVariants.default} type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </form>

      <form
        class="form-panel"
        data-testid="link-epic-form"
        noValidate
        onSubmit={(e: any) => {
          e.preventDefault();
          setFormError(null);
          if (!linkEpicId || !linkInitiativeId) {
            setLinkError("Select both an epic and an initiative");
            return;
          }
          setLinkError(null);
          void (trpc as any).work.updateEpic
            .mutate({
              id: linkEpicId,
              initiativeId: linkInitiativeId,
            })
            .then(refresh)
            .catch((err: unknown) => {
              setFormError(err instanceof Error ? err.message : "Could not link epic");
            });
        }}
      >
        <p class="form-panel-title">Link epic</p>
        <FormHint>Connect an epic to track it under a larger theme.</FormHint>
        <div class="form-row composer">
          <label class="control-field grow">
            <span class="control-label required">Epic</span>
            <select
              class={"control" + (linkError ? " is-invalid" : "")}
              data-testid="link-epic"
              required
              value={linkEpicId}
              onChange={(e: any) => {
                setLinkEpicId(e.currentTarget.value);
                setLinkError(null);
              }}
            >
              <option value="">Select epic</option>
              {epics.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.name}
                </option>
              ))}
            </select>
          </label>
          <label class="control-field grow">
            <span class="control-label required">Initiative</span>
            <select
              class={"control" + (linkError ? " is-invalid" : "")}
              data-testid="link-initiative"
              required
              value={linkInitiativeId}
              onChange={(e: any) => {
                setLinkInitiativeId(e.currentTarget.value);
                setLinkError(null);
              }}
            >
              <option value="">Select initiative</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
          <button class={buttonVariants.secondary} type="submit">
            Link epic
          </button>
        </div>
        <FieldError message={linkError} />
      </form>

      <ul class="space-y-3" data-testid="initiatives-list">
        {items.length === 0 ? (
          <li class="empty-panel" data-testid="initiatives-empty">
            <p class="empty-title">No initiatives yet</p>
            <p class="empty-copy">Create an initiative, then link epics to track larger themes.</p>
          </li>
        ) : null}
        {items.map((i) => {
          const linked = epics.filter((ep) => ep.initiativeId === i.id);
          return (
            <li key={i.id} class="surface-card" data-testid="initiative-card">
              <div class="font-medium">{i.name}</div>
              {i.description ? (
                <p class="mt-1 text-sm text-muted-foreground">{i.description}</p>
              ) : null}
              <div class="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                {labelize(String(i.scope))} · {linked.length} epics
              </div>
              {linked.length ? (
                <ul class="mt-2 space-y-1 text-sm">
                  {linked.map((ep) => (
                    <li key={ep.id}>↳ {ep.name}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
