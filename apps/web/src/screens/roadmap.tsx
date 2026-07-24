/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { buttonVariants } from "@hydrox/ui";
import { trpc } from "../lib/trpc";
import { FieldError, FormError, FormHint } from "../components/form";

export function RoadmapView(props: { projectId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function refresh() {
    setRows(await (trpc as any).work.roadmapData.query({ projectId: props.projectId }));
  }

  useEffect(() => {
    void refresh();
  }, [props.projectId]);

  return (
    <div class="space-y-4" data-testid="roadmap-view">
      <h1 class="panel-title">Roadmap</h1>
      <FormHint>Epic timeline with progress across linked issues.</FormHint>
      <FormError message={formError} />
      {rows.length === 0 ? (
        <div class="empty-panel" data-testid="roadmap-empty">
          <p class="empty-title">No epics yet</p>
          <p class="empty-copy">Create epics first, then set start and target dates here.</p>
        </div>
      ) : (
        <ul class="space-y-3" data-testid="roadmap-list">
          {rows.map((epic) => {
            const pct = Math.round((epic.progress ?? 0) * 100);
            const start = epic.startDate ? new Date(epic.startDate).toLocaleDateString() : "—";
            const target = epic.targetDate ? new Date(epic.targetDate).toLocaleDateString() : "—";
            return (
              <li key={epic.id} class="surface-card" data-testid="roadmap-epic">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div class="font-medium">{epic.name}</div>
                    <div class="text-xs text-muted-foreground">
                      {epic.doneCount}/{epic.issueCount} done · {start} → {target}
                    </div>
                  </div>
                  <button
                    class={buttonVariants.ghost}
                    type="button"
                    data-testid="roadmap-edit-dates"
                    onClick={() => {
                      setEditingId(epic.id);
                      setDateError(null);
                      setFormError(null);
                      setStartDate(
                        epic.startDate ? new Date(epic.startDate).toISOString().slice(0, 10) : "",
                      );
                      setTargetDate(
                        epic.targetDate ? new Date(epic.targetDate).toISOString().slice(0, 10) : "",
                      );
                    }}
                  >
                    Dates
                  </button>
                </div>
                <div class="progress-track mt-2" aria-label={`${pct}% complete`}>
                  <div class="progress-fill" style={`width:${pct}%`} />
                </div>
                {editingId === epic.id ? (
                  <form
                    class="form-panel mt-3"
                    data-testid="roadmap-dates-form"
                    noValidate
                    onSubmit={(e: any) => {
                      e.preventDefault();
                      setFormError(null);
                      if (startDate && targetDate && new Date(targetDate) < new Date(startDate)) {
                        setDateError("Target date must be on or after start");
                        return;
                      }
                      setDateError(null);
                      void (trpc as any).work.updateEpic
                        .mutate({
                          id: epic.id,
                          startDate: startDate ? new Date(startDate) : null,
                          targetDate: targetDate ? new Date(targetDate) : null,
                        })
                        .then(() => {
                          setEditingId(null);
                          return refresh();
                        })
                        .catch((err: unknown) => {
                          setFormError(err instanceof Error ? err.message : "Could not save dates");
                        });
                    }}
                  >
                    <p class="form-panel-title">Edit dates</p>
                    <div class="form-row composer">
                      <label class="control-field">
                        <span class="control-label">Start</span>
                        <input
                          class={"control" + (dateError ? " is-invalid" : "")}
                          type="date"
                          data-testid="roadmap-start-date"
                          value={startDate}
                          onInput={(e: any) => {
                            setStartDate(e.currentTarget.value);
                            setDateError(null);
                          }}
                        />
                      </label>
                      <label class="control-field">
                        <span class="control-label">Target</span>
                        <input
                          class={"control" + (dateError ? " is-invalid" : "")}
                          type="date"
                          data-testid="roadmap-target-date"
                          value={targetDate}
                          onInput={(e: any) => {
                            setTargetDate(e.currentTarget.value);
                            setDateError(null);
                          }}
                        />
                      </label>
                      <div class="form-actions">
                        <button class={buttonVariants.secondary} type="submit">
                          Save
                        </button>
                        <button
                          class={buttonVariants.ghost}
                          type="button"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    <FieldError message={dateError} />
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
