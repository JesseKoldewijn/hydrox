/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { buttonVariants } from "@hydrox/ui";
import { trpc } from "../lib/trpc";

export function SprintsView(props: { projectId: string }) {
  const [sprints, setSprints] = useState<any[]>([]);
  const [name, setName] = useState("");

  async function refresh() {
    setSprints(await (trpc as any).work.sprints.query({ projectId: props.projectId }));
  }

  useEffect(() => {
    void refresh();
  }, [props.projectId]);

  return (
    <div class="space-y-4">
      <form
        class="flex gap-2"
        onSubmit={(e: any) => {
          e.preventDefault();
          void (trpc as any).work.createSprint
            .mutate({ projectId: props.projectId, name })
            .then(() => {
              setName("");
              return refresh();
            });
        }}
      >
        <input
          class="flex-1 rounded-md border border-border bg-background px-3 py-2"
          value={name}
          placeholder="Sprint name"
          onInput={(e: any) => setName(e.currentTarget.value)}
        />
        <button class={buttonVariants.default} type="submit">
          Create sprint
        </button>
      </form>
      <ul class="space-y-2">
        {sprints.map((s) => (
          <li key={s.id} class="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
            <div>
              <div class="font-medium">{s.name}</div>
              <div class="text-xs text-muted-foreground">{s.state}</div>
            </div>
            <div class="flex gap-2">
              {s.state === "future" ? (
                <button
                  class={buttonVariants.secondary}
                  type="button"
                  onClick={() =>
                    void (trpc as any).work.startSprint.mutate({ id: s.id }).then(refresh)
                  }
                >
                  Start
                </button>
              ) : null}
              {s.state === "active" ? (
                <button
                  class={buttonVariants.default}
                  type="button"
                  onClick={() =>
                    void (trpc as any).work.completeSprint.mutate({ id: s.id }).then(refresh)
                  }
                >
                  Complete
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
