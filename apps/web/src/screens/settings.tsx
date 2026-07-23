/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { buttonVariants } from "@hydrox/ui";
import { trpc } from "../lib/trpc";
import { t } from "../i18n";

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
  const [roles, setRoles] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState("");
  const [overrideCaps, setOverrideCaps] = useState<string[]>(["board.edit"]);
  const [purgeMsg, setPurgeMsg] = useState<string | null>(null);

  async function refreshRoles() {
    const rows = await (trpc as any).work.listCustomRoles.query({
      organizationId: props.organizationId,
    });
    setRoles(rows);
  }

  useEffect(() => {
    void refreshRoles();
  }, [props.organizationId]);

  return (
    <div class="space-y-6" data-testid="settings-view">
      <section class="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 class="text-lg font-semibold">{t("settings.roles")}</h2>
        <input
          class="w-full rounded-md border border-border bg-background px-3 py-2"
          data-testid="role-name-input"
          placeholder="Role name"
          value={roleName}
          onInput={(e: any) => setRoleName(e.currentTarget.value)}
        />
        <div class="grid grid-cols-2 gap-2 text-sm">
          {CAPS.map((cap) => (
            <label key={cap} class="flex items-center gap-2">
              <input
                type="checkbox"
                data-testid={`cap-${cap}`}
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
          data-testid="create-role-submit"
          onClick={() =>
            void (trpc as any).work.createCustomRole
              .mutate({
                organizationId: props.organizationId,
                name: roleName,
                capabilities: selected,
              })
              .then(() => {
                setMessage("Custom role created");
                setRoleName("");
                return refreshRoles();
              })
          }
        >
          Create custom role
        </button>
        {message ? (
          <p class="text-sm text-primary" data-testid="role-created-message">
            {message}
          </p>
        ) : null}
        <ul class="space-y-1 text-sm" data-testid="custom-roles-list">
          {roles.map((r) => (
            <li key={r.id} class="rounded-md border border-border px-2 py-1">
              <span class="font-medium">{r.name}</span>
              <span class="ml-2 text-muted-foreground">
                {(r.capabilities ?? []).join(", ")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section class="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 class="text-lg font-semibold">{t("settings.overrides")}</h2>
        <input
          class="w-full rounded-md border border-border bg-background px-3 py-2"
          data-testid="override-user-id"
          placeholder="Target user UUID"
          value={targetUserId}
          onInput={(e: any) => setTargetUserId(e.currentTarget.value)}
        />
        <div class="grid grid-cols-2 gap-2 text-sm">
          {CAPS.map((cap) => (
            <label key={cap} class="flex items-center gap-2">
              <input
                type="checkbox"
                checked={overrideCaps.includes(cap)}
                onChange={(e: any) => {
                  setOverrideCaps((prev) =>
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
          class={buttonVariants.secondary}
          type="button"
          data-testid="set-overrides-submit"
          onClick={() =>
            void (trpc as any).work.setProjectOverrides
              .mutate({
                projectId: props.projectId,
                targetUserId,
                capabilities: overrideCaps,
              })
              .then(() => setMessage("Overrides saved"))
          }
        >
          Save project overrides
        </button>
      </section>

      <section class="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 class="text-lg font-semibold">{t("settings.purge")}</h2>
        <p class="text-sm text-muted-foreground">
          Runs 30-day audit purge and soft-delete hard purge. Force skips the
          age gate for soft-deleted rows.
        </p>
        <button
          class={buttonVariants.secondary}
          type="button"
          data-testid="trigger-purge"
          onClick={() =>
            void (trpc as any).admin.triggerPurge
              .mutate({ force: true })
              .then((r: any) =>
                setPurgeMsg(`Purge ok (force=${r.force})`),
              )
              .catch((err: unknown) =>
                setPurgeMsg(
                  err instanceof Error ? err.message : "Purge failed",
                ),
              )
          }
        >
          Run retention purge
        </button>
        {purgeMsg ? (
          <p class="text-sm text-primary" data-testid="purge-message">
            {purgeMsg}
          </p>
        ) : null}
      </section>
    </div>
  );
}
