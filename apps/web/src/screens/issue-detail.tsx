/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { buttonVariants } from "@hydrox/ui";
import type { LocalIssue } from "../lib/db";
import { trpc } from "../lib/trpc";
import {
  softDeleteIssueLocally,
  updateIssueLocally,
} from "../lib/sync-engine";
import { t } from "../i18n";

export function IssueDetailPanel(props: {
  issue: LocalIssue;
  organizationId: string;
  projectId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(props.issue.title);
  const [description, setDescription] = useState(props.issue.description ?? "");
  const [comments, setComments] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refreshSide() {
    const [c, a] = await Promise.all([
      (trpc as any).work.comments.query({ issueId: props.issue.id }),
      (trpc as any).work.attachments.query({ issueId: props.issue.id }),
    ]);
    setComments(c);
    setAttachments(a);
  }

  useEffect(() => {
    setTitle(props.issue.title);
    setDescription(props.issue.description ?? "");
    void refreshSide();
  }, [props.issue.id]);

  async function save() {
    setBusy(true);
    try {
      await updateIssueLocally(props.issue.id, {
        title: title.trim() || props.issue.title,
        description: description.trim() || null,
      });
      setMessage("Saved");
    } finally {
      setBusy(false);
    }
  }

  async function addComment() {
    if (!commentBody.trim()) return;
    setBusy(true);
    try {
      await (trpc as any).work.addComment.mutate({
        issueId: props.issue.id,
        body: commentBody.trim(),
      });
      setCommentBody("");
      await refreshSide();
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File) {
    setBusy(true);
    setMessage(null);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
      const dataBase64 = btoa(binary);
      await (trpc as any).work.uploadAttachment.mutate({
        issueId: props.issue.id,
        organizationId: props.organizationId,
        projectId: props.projectId,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        dataBase64,
      });
      await refreshSide();
      setMessage(`Uploaded ${file.name}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function download(attachmentId: string, fileName: string) {
    const res = await (trpc as any).work.attachmentDownload.query({
      attachmentId,
    });
    const bin = atob(res.dataBase64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <aside class="issue-detail" data-testid="issue-detail">
      <div class="issue-detail-header">
        <div>
          <div class="issue-key" data-testid="issue-detail-key">
            {props.issue.key}
          </div>
          <div class="text-xs uppercase tracking-wide text-muted-foreground">
            {props.issue.type}
          </div>
        </div>
        <button
          class={buttonVariants.ghost}
          type="button"
          data-testid="issue-detail-close"
          onClick={props.onClose}
        >
          Close
        </button>
      </div>

      <label class="field">
        Title
        <input
          data-testid="issue-detail-title"
          value={title}
          onInput={(e: any) => setTitle(e.currentTarget.value)}
        />
      </label>
      <label class="field">
        Description
        <textarea
          data-testid="issue-detail-description"
          rows={4}
          value={description}
          onInput={(e: any) => setDescription(e.currentTarget.value)}
        />
      </label>

      <div class="flex flex-wrap gap-2">
        <button
          class={buttonVariants.default}
          type="button"
          data-testid="issue-detail-save"
          disabled={busy}
          onClick={() => void save()}
        >
          {t("issue.save")}
        </button>
        <button
          class={buttonVariants.destructive}
          type="button"
          data-testid="issue-detail-delete"
          disabled={busy}
          onClick={() =>
            void softDeleteIssueLocally(props.issue.id).then(props.onClose)
          }
        >
          {t("issue.delete")}
        </button>
      </div>
      {message ? (
        <p class="text-sm text-muted-foreground" data-testid="issue-detail-message">
          {message}
        </p>
      ) : null}

      <section class="issue-detail-section">
        <h3 class="text-sm font-semibold">{t("issue.comments")}</h3>
        <ul class="space-y-2" data-testid="issue-comments">
          {comments.map((c) => (
            <li key={c.id} class="rounded-md border border-border px-2 py-1.5 text-sm">
              {c.body}
            </li>
          ))}
        </ul>
        <div class="mt-2 flex gap-2">
          <input
            class="toolbar-input flex-1"
            data-testid="issue-comment-input"
            placeholder="Add a comment"
            value={commentBody}
            onInput={(e: any) => setCommentBody(e.currentTarget.value)}
          />
          <button
            class={buttonVariants.secondary}
            type="button"
            data-testid="issue-comment-submit"
            disabled={busy}
            onClick={() => void addComment()}
          >
            Post
          </button>
        </div>
      </section>

      <section class="issue-detail-section">
        <h3 class="text-sm font-semibold">{t("issue.attachments")}</h3>
        <ul class="space-y-1" data-testid="issue-attachments">
          {attachments.map((a) => (
            <li key={a.id} class="flex items-center justify-between text-sm">
              <span>{a.fileName}</span>
              <button
                class={buttonVariants.ghost}
                type="button"
                data-testid="attachment-download"
                onClick={() => void download(a.id, a.fileName)}
              >
                Download
              </button>
            </li>
          ))}
        </ul>
        <label class="mt-2 block text-sm">
          <span class="sr-only">Upload</span>
          <input
            type="file"
            data-testid="attachment-upload"
            onChange={(e: any) => {
              const file = e.currentTarget.files?.[0];
              if (file) void onFile(file);
              e.currentTarget.value = "";
            }}
          />
        </label>
      </section>
    </aside>
  );
}
