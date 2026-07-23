/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { buttonVariants } from "@hydrox/ui";
import { liveQuery } from "dexie";
import { db, type LocalIssue } from "../lib/db";
import { trpc } from "../lib/trpc";
import { createIssueLocally, updateIssueLocally } from "../lib/sync-engine";
import { t } from "../i18n";
import { SkeletonBlock } from "../components/skeleton";

export function BoardView(props: { projectId: string }) {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [issues, setIssues] = useState<LocalIssue[]>([]);
  const [title, setTitle] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (trpc as any).work.statuses
      .query({ projectId: props.projectId })
      .then((s: any[]) => {
        setStatuses(s);
        setReady(true);
      });
    const sub = liveQuery(() =>
      db.issues.where("projectId").equals(props.projectId).sortBy("backlogRank"),
    ).subscribe({
      next: (rows) => setIssues(rows.filter((r) => !r.deletedAt)),
      error: (e) => console.error(e),
    });
    return () => sub.unsubscribe();
  }, [props.projectId]);

  async function onDrop(statusId: string, issueId: string) {
    await updateIssueLocally(issueId, { statusId });
  }

  if (!ready) {
    return (
      <div class="board-columns">
        <SkeletonBlock class="h-80" />
        <SkeletonBlock class="h-80" />
        <SkeletonBlock class="h-80" />
      </div>
    );
  }

  return (
    <div class="space-y-4">
      <form
        class="flex gap-2"
        onSubmit={(e: any) => {
          e.preventDefault();
          if (!title || !statuses[0]) return;
          void createIssueLocally({
            projectId: props.projectId,
            type: "story",
            title,
            statusId: statuses[0].id,
          }).then(() => setTitle(""));
        }}
      >
        <input
          class="flex-1 rounded-md border border-border bg-background px-3 py-2"
          placeholder={t("issue.create")}
          value={title}
          onInput={(e: any) => setTitle(e.currentTarget.value)}
        />
        <button class={buttonVariants.default} type="submit">
          {t("issue.create")}
        </button>
      </form>
      <div class="board-columns">
        {statuses.map((status) => (
          <section
            key={status.id}
            class="min-h-72 rounded-lg border border-border bg-card/70 p-3"
            onDragOver={(e: any) => e.preventDefault()}
            onDrop={(e: any) => {
              e.preventDefault();
              const issueId = e.dataTransfer.getData("text/issue-id");
              if (issueId) void onDrop(status.id, issueId);
            }}
          >
            <h2 class="mb-3 text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              {status.name}
            </h2>
            <div class="space-y-2">
              {issues
                .filter((i) => i.statusId === status.id)
                .map((issue) => (
                  <article
                    key={issue.id}
                    class="issue-card"
                    draggable
                    onDragStart={(e: any) => {
                      e.dataTransfer.setData("text/issue-id", issue.id);
                    }}
                  >
                    <div class="text-xs text-muted-foreground">{issue.key}</div>
                    <div class="font-medium">{issue.title}</div>
                    {issue.pending ? (
                      <div class="mt-1 text-xs text-primary">Syncing...</div>
                    ) : null}
                  </article>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
