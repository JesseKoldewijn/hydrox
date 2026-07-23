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
  const [creating, setCreating] = useState(false);

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
      <div class="board-columns" data-testid="board-loading">
        <SkeletonBlock class="h-80" />
        <SkeletonBlock class="h-80" />
        <SkeletonBlock class="h-80" />
      </div>
    );
  }

  return (
    <div data-testid="board-view">
      <h1 class="panel-title">Board</h1>
      <form
        class="composer"
        data-testid="create-issue-form"
        onSubmit={(e: any) => {
          e.preventDefault();
          if (!title.trim() || !statuses[0] || creating) return;
          setCreating(true);
          void createIssueLocally({
            projectId: props.projectId,
            type: "story",
            title: title.trim(),
            statusId: statuses[0].id,
          })
            .then(() => setTitle(""))
            .finally(() => setCreating(false));
        }}
      >
        <input
          class="toolbar-input"
          data-testid="issue-title-input"
          placeholder={t("issue.create")}
          value={title}
          onInput={(e: any) => setTitle(e.currentTarget.value)}
        />
        <button
          class={buttonVariants.default}
          type="submit"
          data-testid="create-issue-submit"
          disabled={creating}
        >
          {t("issue.create")}
        </button>
      </form>
      <div class="board-columns" data-testid="board-columns">
        {statuses.map((status) => (
          <section
            key={status.id}
            class="board-column"
            data-testid={`column-${status.name}`}
            onDragOver={(e: any) => e.preventDefault()}
            onDrop={(e: any) => {
              e.preventDefault();
              const issueId = e.dataTransfer.getData("text/issue-id");
              if (issueId) void onDrop(status.id, issueId);
            }}
          >
            <h2 class="board-column-title">{status.name}</h2>
            <div class="space-y-1.5">
              {issues
                .filter((i) => i.statusId === status.id)
                .map((issue) => (
                  <article
                    key={issue.id}
                    class="issue-card"
                    data-testid="issue-card"
                    data-issue-key={issue.key}
                    data-pending={issue.pending ? "true" : "false"}
                    draggable
                    onDragStart={(e: any) => {
                      e.dataTransfer.setData("text/issue-id", issue.id);
                    }}
                  >
                    <div class="issue-key">{issue.key}</div>
                    <div class="issue-title">{issue.title}</div>
                    {issue.pending ? (
                      <span class="sync-pill" data-testid="syncing-pill">
                        Syncing
                      </span>
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
