/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { buttonVariants } from "@hydrox/ui";
import { trpc } from "../lib/trpc";

export function InitiativesView(props: {
  organizationId: string;
  projectId: string;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"organization" | "project">("organization");

  async function refresh() {
    setItems(
      await (trpc as any).work.initiatives.query({
        organizationId: props.organizationId,
      }),
    );
  }

  useEffect(() => {
    void refresh();
  }, [props.organizationId]);

  return (
    <div class="space-y-4">
      <form
        class="flex flex-wrap gap-2"
        onSubmit={(e: any) => {
          e.preventDefault();
          void (trpc as any).work.createInitiative
            .mutate({
              organizationId: props.organizationId,
              projectId: scope === "project" ? props.projectId : null,
              scope,
              name,
            })
            .then(() => {
              setName("");
              return refresh();
            });
        }}
      >
        <input
          class="flex-1 rounded-md border border-border bg-background px-3 py-2"
          value={name}
          onInput={(e: any) => setName(e.currentTarget.value)}
          placeholder="Initiative name"
        />
        <select
          class="rounded-md border border-border bg-background px-2"
          value={scope}
          onChange={(e: any) => setScope(e.currentTarget.value)}
        >
          <option value="organization">Organization-wide</option>
          <option value="project">Project</option>
        </select>
        <button class={buttonVariants.default} type="submit">
          Create
        </button>
      </form>
      <ul class="space-y-2">
        {items.map((i) => (
          <li key={i.id} class="rounded-md border border-border bg-card px-3 py-2">
            <div class="font-medium">{i.name}</div>
            <div class="text-xs text-muted-foreground">{i.scope}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
