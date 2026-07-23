/** @jsxImportSource octane */
import { useState } from "octane";
import { buttonVariants } from "@hydrox/ui";
import { trpc } from "../lib/trpc";

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

export function SettingsView(props: {
  organizationId: string;
  projectId: string;
}) {
  const [roleName, setRoleName] = useState("");
  const [selected, setSelected] = useState<string[]>(["board.edit"]);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div class="space-y-6">
      <section class="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 class="text-lg font-semibold">Custom roles</h2>
        <input
          class="w-full rounded-md border border-border bg-background px-3 py-2"
          placeholder="Role name"
          value={roleName}
          onInput={(e: any) => setRoleName(e.currentTarget.value)}
        />
        <div class="grid grid-cols-2 gap-2 text-sm">
          {CAPS.map((cap) => (
            <label key={cap} class="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(cap)}
                onChange={(e: any) => {
                  setSelected((prev) =>
                    e.currentTarget.checked
                      ? [...prev, cap]
                      : prev.filter((c) => c !== cap),
                  );
                }}
              />
              {cap}
            </label>
          ))}
        </div>
        <button
          class={buttonVariants.default}
          type="button"
          onClick={() =>
            void (trpc as any).work.createCustomRole
              .mutate({
                organizationId: props.organizationId,
                name: roleName,
                capabilities: selected,
              })
              .then(() => setMessage("Custom role created"))
          }
        >
          Create custom role
        </button>
        {message ? <p class="text-sm text-primary">{message}</p> : null}
      </section>
      <section class="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        Project overrides and purge controls use the same capability system.
        Admins can trigger retention purge via{" "}
        <code>admin.triggerPurge</code>.
      </section>
    </div>
  );
}
