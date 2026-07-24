/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { buttonVariants } from "@hydrox/ui";
import { trpc } from "../lib/trpc";
import { FieldError, FormError } from "../components/form";

export function DashboardView(props: { projectId: string; organizationId: string }) {
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [gadgets, setGadgets] = useState<any[]>([]);
  const [gadgetPayloads, setGadgetPayloads] = useState<Record<string, any>>({});
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refreshDashboards() {
    const rows = await (trpc as any).work.listDashboards.query({
      projectId: props.projectId,
    });
    setDashboards(rows);
    if (!activeId && rows[0]) setActiveId(rows[0].id);
  }

  async function loadGadgets(dashboardId: string) {
    const g = await (trpc as any).work.listDashboardGadgets.query({
      dashboardId,
    });
    setGadgets(g);
    const payloads: Record<string, any> = {};
    for (const gadget of g) {
      payloads[gadget.id] = await (trpc as any).work.gadgetData.query({
        projectId: props.projectId,
        type: gadget.type,
        organizationId: props.organizationId,
      });
    }
    setGadgetPayloads(payloads);
  }

  useEffect(() => {
    void refreshDashboards();
  }, [props.projectId]);

  useEffect(() => {
    if (activeId) void loadGadgets(activeId);
  }, [activeId, props.projectId, props.organizationId]);

  return (
    <div class="space-y-4" data-testid="dashboard-view">
      <h1 class="panel-title">Dashboards</h1>
      <form
        class="form-panel"
        data-testid="create-dashboard-form"
        noValidate
        onSubmit={(e: any) => {
          e.preventDefault();
          setFormError(null);
          if (!name.trim()) {
            setNameError("Dashboard name is required");
            return;
          }
          setNameError(null);
          setBusy(true);
          void (trpc as any).work.createDashboard
            .mutate({ projectId: props.projectId, name: name.trim() })
            .then((d: any) => {
              setName("");
              setActiveId(d.id);
              return refreshDashboards();
            })
            .catch((err: unknown) => {
              setFormError(err instanceof Error ? err.message : "Could not create dashboard");
            })
            .finally(() => setBusy(false));
        }}
      >
        <p class="form-panel-title">Create dashboard</p>
        <div class="form-row composer">
          <label class="control-field grow">
            <span class="control-label required">Name</span>
            <input
              class={"control toolbar-input" + (nameError ? " is-invalid" : "")}
              data-testid="dashboard-name"
              placeholder="Dashboard name"
              required
              value={name}
              onInput={(e: any) => {
                setName(e.currentTarget.value);
                setNameError(null);
              }}
            />
            <FieldError message={nameError} />
          </label>
          <button class={buttonVariants.default} type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create dashboard"}
          </button>
        </div>
        <FormError message={formError} />
      </form>

      <div class="form-panel">
        <p class="form-panel-title">Active dashboard</p>
        <label class="control-field">
          <span class="control-label">Select</span>
          <select
            class="control"
            data-testid="dashboard-select"
            value={activeId ?? ""}
            onChange={(e: any) => setActiveId(e.currentTarget.value || null)}
          >
            <option value="">Select dashboard</option>
            {dashboards.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {dashboards.length === 0 ? (
        <div class="empty-panel" data-testid="dashboard-empty">
          <p class="empty-title">No dashboards yet</p>
          <p class="empty-copy">
            Create a dashboard to see issue stats, priority breakdown, and sprint status.
          </p>
        </div>
      ) : activeId && gadgets.length === 0 ? (
        <div class="empty-panel" data-testid="gadgets-empty">
          <p class="empty-title">No gadgets on this dashboard</p>
          <p class="empty-copy">
            New dashboards usually seed default gadgets — try creating another.
          </p>
        </div>
      ) : (
        <div class="gadget-grid" data-testid="gadget-grid">
          {gadgets.map((g) => {
            const data = gadgetPayloads[g.id] ?? {};
            return (
              <article
                key={g.id}
                class="gadget-card"
                data-testid="gadget-card"
                data-gadget-type={g.type}
              >
                <h2 class="text-sm font-semibold">{g.title}</h2>
                {g.type === "issue_stats" ? (
                  <div class="mt-2 text-sm">
                    <div class="text-2xl font-semibold">{data.total ?? 0}</div>
                    <div class="text-muted-foreground">open issues</div>
                    <ul class="mt-2 space-y-0.5 text-xs">
                      {Object.entries(data.byType ?? {}).map(([k, v]) => (
                        <li key={k}>
                          {k}: {String(v)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {g.type === "priority_breakdown" ? (
                  <ul class="mt-2 space-y-1 text-sm">
                    {Object.entries(data.byPriority ?? {}).map(([k, v]) => (
                      <li key={k}>
                        {k}: {String(v)}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {g.type === "sprint_status" ? (
                  <div class="mt-2 text-sm">
                    {data.active ? (
                      <>
                        <div class="font-medium">{data.active.name}</div>
                        <div class="text-muted-foreground">{data.issueCount} issues</div>
                      </>
                    ) : (
                      <span class="text-muted-foreground">No active sprint</span>
                    )}
                  </div>
                ) : null}
                {g.type === "activity_feed" ? (
                  <ul class="mt-2 space-y-1 text-xs">
                    {(data.events ?? []).slice(0, 8).map((e: any) => (
                      <li key={e.id}>{e.summary ?? e.action}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
