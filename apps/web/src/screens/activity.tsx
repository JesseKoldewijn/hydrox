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
    <div class="space-y-3" data-testid="activity-view">
      <h1 class="panel-title">Activity</h1>
      {events.length === 0 ? (
        <div class="empty-panel" data-testid="activity-empty">
          <p class="empty-title">No activity yet</p>
          <p class="empty-copy">Creates, updates, and comments will show up in this timeline.</p>
        </div>
      ) : (
        <ol class="activity-timeline" data-testid="activity-timeline">
          {events.map((e) => (
            <li key={e.id} class="activity-item" data-testid="activity-item">
              <div class="font-medium">
                {e.summary ?? `${e.actorName ?? "Someone"} · ${e.action}`}
              </div>
              <div class="text-xs text-muted-foreground">
                {[e.entityKey, e.entityTitle].filter(Boolean).join(" · ") || e.entityType}
                {" · "}
                {new Date(e.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
