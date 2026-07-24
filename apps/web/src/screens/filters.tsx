/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { buttonVariants } from "@hydrox/ui";
import { trpc } from "../lib/trpc";
import { ISSUE_TYPES } from "../components/issue-meta";
import { FieldError, FormHint, labelize } from "../components/form";

function summarizeQuery(query: Record<string, unknown> | null | undefined) {
  if (!query || typeof query !== "object") return "All issues";
  const parts: string[] = [];
  if (query.text) parts.push(`text “${String(query.text)}”`);
  if (query.type) parts.push(`type ${String(query.type)}`);
  if (query.statusId) parts.push("status set");
  if (query.assigneeId) parts.push("assignee set");
  if (query.labelId) parts.push("label set");
  if (query.priority) parts.push(`priority ${String(query.priority)}`);
  return parts.length ? parts.join(" · ") : "All issues";
}

export function FiltersView(props: { projectId: string }) {
  const [filters, setFilters] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [type, setType] = useState("");
  const [statusId, setStatusId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [labelId, setLabelId] = useState("");
  const [statuses, setStatuses] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [f, s, m, lb] = await Promise.all([
      (trpc as any).work.listSavedFilters.query({ projectId: props.projectId }),
      (trpc as any).work.statuses.query({ projectId: props.projectId }),
      (trpc as any).work.listProjectMembers.query({
        projectId: props.projectId,
      }),
      (trpc as any).work.listLabels.query({ projectId: props.projectId }),
    ]);
    setFilters(f);
    setStatuses(s);
    setMembers(m);
    setLabels(lb);
  }

  useEffect(() => {
    void refresh();
  }, [props.projectId]);

  async function apply(filterId: string) {
    setActiveFilterId(filterId);
    const rows = await (trpc as any).work.applySavedFilter.query({ filterId });
    setResults(rows);
  }

  return (
    <div class="space-y-5" data-testid="filters-view">
      <h1 class="panel-title">Filters</h1>

      <form
        class="form-panel"
        data-testid="save-filter-form"
        noValidate
        onSubmit={(e: any) => {
          e.preventDefault();
          if (!name.trim()) {
            setNameError("Filter name is required");
            return;
          }
          setNameError(null);
          setBusy(true);
          void (trpc as any).work.saveFilter
            .mutate({
              projectId: props.projectId,
              name: name.trim(),
              query: {
                text: text || undefined,
                type: type || undefined,
                statusId: statusId || undefined,
                assigneeId: assigneeId || undefined,
                labelId: labelId || undefined,
              },
            })
            .then(() => {
              setName("");
              return refresh();
            })
            .finally(() => setBusy(false));
        }}
      >
        <p class="form-panel-title">Save filter</p>
        <FormHint>Name the filter, optionally refine criteria, then save for reuse.</FormHint>
        <label class="control-field grow">
          <span class="control-label required">Name</span>
          <input
            class={"control toolbar-input" + (nameError ? " is-invalid" : "")}
            data-testid="filter-name-input"
            placeholder="Filter name"
            required
            value={name}
            onInput={(e: any) => {
              setName(e.currentTarget.value);
              setNameError(null);
            }}
          />
          <FieldError message={nameError} />
        </label>
        <div class="form-row">
          <label class="control-field grow">
            <span class="control-label">Text</span>
            <input
              class="control toolbar-input"
              data-testid="filter-text"
              placeholder="Text / key"
              value={text}
              onInput={(e: any) => setText(e.currentTarget.value)}
            />
          </label>
          <label class="control-field">
            <span class="control-label">Type</span>
            <select
              class="control"
              data-testid="filter-type-select"
              value={type}
              onChange={(e: any) => setType(e.currentTarget.value)}
            >
              <option value="">Any</option>
              {ISSUE_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {labelize(ty)}
                </option>
              ))}
            </select>
          </label>
          <label class="control-field">
            <span class="control-label">Status</span>
            <select
              class="control"
              data-testid="filter-status-select"
              value={statusId}
              onChange={(e: any) => setStatusId(e.currentTarget.value)}
            >
              <option value="">Any</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label class="control-field">
            <span class="control-label">Assignee</span>
            <select
              class="control"
              data-testid="filter-assignee-select"
              value={assigneeId}
              onChange={(e: any) => setAssigneeId(e.currentTarget.value)}
            >
              <option value="">Any</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user?.displayName ?? m.userId}
                </option>
              ))}
            </select>
          </label>
          <label class="control-field">
            <span class="control-label">Label</span>
            <select
              class="control"
              data-testid="filter-label-select"
              value={labelId}
              onChange={(e: any) => setLabelId(e.currentTarget.value)}
            >
              <option value="">Any</option>
              {labels.map((lb) => (
                <option key={lb.id} value={lb.id}>
                  {lb.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          class={buttonVariants.default}
          type="submit"
          data-testid="save-filter"
          disabled={busy}
        >
          {busy ? "Saving…" : "Save filter"}
        </button>
      </form>

      <section>
        <h2 class="section-heading">Saved filters</h2>
        {filters.length === 0 ? (
          <div class="empty-panel" data-testid="filters-empty">
            <p class="empty-title">No saved filters</p>
            <p class="empty-copy">Build a query above and save it for one-click reuse.</p>
          </div>
        ) : (
          <ul class="space-y-2" data-testid="saved-filters-list">
            {filters.map((f) => (
              <li key={f.id} class="surface-card flex flex-wrap items-center justify-between gap-2">
                <div class="min-w-0">
                  <div class="font-medium">{f.name}</div>
                  <div class="text-xs text-muted-foreground">{summarizeQuery(f.query)}</div>
                </div>
                <div class="flex gap-2">
                  <button
                    class={buttonVariants.secondary}
                    type="button"
                    data-testid="apply-filter"
                    onClick={() => void apply(f.id)}
                  >
                    Apply
                  </button>
                  <button
                    class={buttonVariants.ghost}
                    type="button"
                    data-testid="delete-filter"
                    onClick={() =>
                      void (trpc as any).work.deleteSavedFilter.mutate({ id: f.id }).then(refresh)
                    }
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {activeFilterId ? (
        <section data-testid="filter-results">
          <h2 class="section-heading">Results ({results.length})</h2>
          {results.length === 0 ? (
            <div class="empty-panel">
              <p class="empty-title">No matching issues</p>
              <p class="empty-copy">Try loosening the filter criteria.</p>
            </div>
          ) : (
            <div class="issue-table-wrap">
              <table class="issue-table w-full text-sm">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id} data-testid="filter-result-row">
                      <td class="issue-key">{r.key}</td>
                      <td>{r.type}</td>
                      <td>{r.title}</td>
                      <td>{r.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
