/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { liveQuery } from "dexie";
import { db, type LocalIssue } from "../lib/db";
import { updateIssueLocally } from "../lib/sync-engine";
import { rankBetween } from "@hydrox/domain";

export function BacklogView(props: { projectId: string }) {
  const [issues, setIssues] = useState<LocalIssue[]>([]);

  useEffect(() => {
    const sub = liveQuery(() =>
      db.issues.where("projectId").equals(props.projectId).sortBy("backlogRank"),
    ).subscribe({
      next: (rows) =>
        setIssues(rows.filter((r) => !r.deletedAt && !r.sprintId)),
    });
    return () => sub.unsubscribe();
  }, [props.projectId]);

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= issues.length) return;
    const a = issues[index]!;
    const b = issues[target]!;
    const before = dir < 0 ? issues[target - 1]?.backlogRank ?? null : b.backlogRank;
    const after = dir < 0 ? b.backlogRank : issues[target + 1]?.backlogRank ?? null;
    const rank = rankBetween(before, after);
    await updateIssueLocally(a.id, { backlogRank: rank });
  }

  return (
    <div class="space-y-2">
      <h1 class="text-xl font-semibold">Backlog</h1>
      {issues.map((issue, i) => (
        <div
          key={issue.id}
          class="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
        >
          <div>
            <span class="mr-2 text-xs text-muted-foreground">{issue.key}</span>
            {issue.title}
          </div>
          <div class="flex gap-1">
            <button type="button" onClick={() => void move(i, -1)}>
              ↑
            </button>
            <button type="button" onClick={() => void move(i, 1)}>
              ↓
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
