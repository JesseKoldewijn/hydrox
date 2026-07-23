/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { liveQuery } from "dexie";
import { buttonVariants } from "@hydrox/ui";
import { db, type LocalConflict } from "../lib/db";
import { resolveConflict } from "../lib/sync-engine";
import { t } from "../i18n";

export function ConflictDialog() {
  const [conflict, setConflict] = useState<LocalConflict | null>(null);
  const [choices, setChoices] = useState<Record<string, "local" | "server">>({});

  useEffect(() => {
    const sub = liveQuery(() => db.conflicts.toArray()).subscribe({
      next: (rows) => {
        setConflict(rows[0] ?? null);
        if (rows[0]) {
          const init: Record<string, "local" | "server"> = {};
          for (const c of rows[0].conflicts) init[c.field] = "local";
          setChoices(init);
        }
      },
    });
    return () => sub.unsubscribe();
  }, []);

  if (!conflict) return null;

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div class="w-full max-w-lg rounded-lg border border-border bg-card p-5 shadow-lg">
        <h2 class="text-lg font-semibold">{t("conflict.title")}</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          {conflict.entityType} / {conflict.entityId}
        </p>
        <ul class="mt-4 space-y-3">
          {conflict.conflicts.map((c) => (
            <li key={c.field} class="rounded-md border border-border p-3 text-sm">
              <div class="font-medium">{c.field}</div>
              <div class="mt-1 grid grid-cols-2 gap-2">
                <div>
                  <div class="text-xs text-muted-foreground">Local</div>
                  <pre class="whitespace-pre-wrap">{JSON.stringify(c.localValue)}</pre>
                </div>
                <div>
                  <div class="text-xs text-muted-foreground">Server</div>
                  <pre class="whitespace-pre-wrap">{JSON.stringify(c.serverValue)}</pre>
                </div>
              </div>
              <select
                class="mt-2 rounded-md border border-border bg-background px-2 py-1"
                value={choices[c.field] ?? "local"}
                onChange={(e: any) =>
                  setChoices((prev) => ({
                    ...prev,
                    [c.field]: e.currentTarget.value,
                  }))
                }
              >
                <option value="local">{t("conflict.local")}</option>
                <option value="server">{t("conflict.server")}</option>
              </select>
            </li>
          ))}
        </ul>
        <button
          class={`${buttonVariants.default} mt-4`}
          type="button"
          onClick={() => void resolveConflict(conflict.id, choices)}
        >
          Apply resolution
        </button>
      </div>
    </div>
  );
}
