/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { trpc } from "../lib/trpc";

export function ActivityView(props: { organizationId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => {
    void (trpc as any).work.activity
      .query({ organizationId: props.organizationId })
      .then(setEvents);
  }, [props.organizationId]);

  return (
    <div class="space-y-2">
      <h1 class="text-xl font-semibold">Activity</h1>
      {events
        .slice()
        .reverse()
        .map((e) => (
          <div key={e.id} class="rounded-md border border-border bg-card px-3 py-2 text-sm">
            <span class="font-medium">{e.action}</span>
            <span class="text-muted-foreground">{` - ${String(e.entityType)}`}</span>
            <div class="text-xs text-muted-foreground">
              {new Date(e.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
    </div>
  );
}
