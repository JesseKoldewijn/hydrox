/** @jsxImportSource octane */
import { useEffect, useState } from "octane";
import { liveQuery } from "dexie";
import { buttonVariants } from "@hydrox/ui";
import { db, type LocalIssue } from "../lib/db";
import { trpc } from "../lib/trpc";
import { createIssueLocally, softDeleteIssueLocally, updateIssueLocally } from "../lib/sync-engine";
import { t } from "../i18n";
import {
  ISSUE_TYPES,
  PRIORITIES,
  PriorityIcon,
  TypeChip,
  AssigneeBadge,
} from "../components/issue-meta";
import { FieldError, FormError, labelize } from "../components/form";

export function IssueDetailPanel(props: {
  issue: LocalIssue;
  organizationId: string;
  projectId: string;
  onClose: () => void;
  onOpenIssue?: (id: string) => void;
}) {
  const [title, setTitle] = useState(props.issue.title);
  const [description, setDescription] = useState(props.issue.description ?? "");
  const [priority, setPriority] = useState(props.issue.priority ?? "medium");
  const [type, setType] = useState(props.issue.type);
  const [statusId, setStatusId] = useState(props.issue.statusId);
  const [assigneeId, setAssigneeId] = useState(props.issue.assigneeId ?? "");
  const [epicId, setEpicId] = useState(props.issue.epicId ?? "");
  const [sprintId, setSprintId] = useState(props.issue.sprintId ?? "");
  const [storyPoints, setStoryPoints] = useState(
    props.issue.storyPoints != null ? String(props.issue.storyPoints) : "",
  );
  const [dueDate, setDueDate] = useState(
    props.issue.dueDate ? props.issue.dueDate.slice(0, 10) : "",
  );
  const [originalEstimate, setOriginalEstimate] = useState(
    props.issue.originalEstimateMinutes != null ? String(props.issue.originalEstimateMinutes) : "",
  );
  const [remainingEstimate, setRemainingEstimate] = useState(
    props.issue.remainingEstimateMinutes != null
      ? String(props.issue.remainingEstimateMinutes)
      : "",
  );
  const [fixVersionId, setFixVersionId] = useState(props.issue.fixVersionId ?? "");
  const [selectedLabels, setSelectedLabels] = useState<string[]>(props.issue.labelIds ?? []);
  const [selectedComponents, setSelectedComponents] = useState<string[]>(
    props.issue.componentIds ?? [],
  );
  const [statuses, setStatuses] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [epics, setEpics] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<LocalIssue[]>([]);
  const [allIssues, setAllIssues] = useState<LocalIssue[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [linkTargetId, setLinkTargetId] = useState("");
  const [linkType, setLinkType] = useState("relates_to");
  const [newLabelName, setNewLabelName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);

  async function refreshSide() {
    const [c, a, l] = await Promise.all([
      (trpc as any).work.comments.query({ issueId: props.issue.id }),
      (trpc as any).work.attachments.query({ issueId: props.issue.id }),
      (trpc as any).work.listIssueLinks.query({ issueId: props.issue.id }),
    ]);
    setComments(c);
    setAttachments(a);
    setLinks(l);
  }

  useEffect(() => {
    setTitle(props.issue.title);
    setDescription(props.issue.description ?? "");
    setPriority(props.issue.priority ?? "medium");
    setType(props.issue.type);
    setStatusId(props.issue.statusId);
    setAssigneeId(props.issue.assigneeId ?? "");
    setEpicId(props.issue.epicId ?? "");
    setSprintId(props.issue.sprintId ?? "");
    setStoryPoints(props.issue.storyPoints != null ? String(props.issue.storyPoints) : "");
    setDueDate(props.issue.dueDate ? props.issue.dueDate.slice(0, 10) : "");
    setOriginalEstimate(
      props.issue.originalEstimateMinutes != null
        ? String(props.issue.originalEstimateMinutes)
        : "",
    );
    setRemainingEstimate(
      props.issue.remainingEstimateMinutes != null
        ? String(props.issue.remainingEstimateMinutes)
        : "",
    );
    setFixVersionId(props.issue.fixVersionId ?? "");
    setSelectedLabels(props.issue.labelIds ?? []);
    setSelectedComponents(props.issue.componentIds ?? []);
    void refreshSide();
  }, [props.issue.id]);

  useEffect(() => {
    void (async () => {
      const [s, m, e, sp, lb, comps, vers] = await Promise.all([
        (trpc as any).work.statuses.query({ projectId: props.projectId }),
        (trpc as any).work.listProjectMembers.query({
          projectId: props.projectId,
        }),
        (trpc as any).work.epics.query({ projectId: props.projectId }),
        (trpc as any).work.sprints.query({ projectId: props.projectId }),
        (trpc as any).work.listLabels.query({ projectId: props.projectId }),
        (trpc as any).work.listComponents.query({ projectId: props.projectId }),
        (trpc as any).work.listProjectVersions.query({
          projectId: props.projectId,
        }),
      ]);
      setStatuses(s);
      setMembers(m);
      setEpics(e);
      setSprints(sp);
      setLabels(lb);
      setComponents(comps);
      setVersions(vers);
    })();
  }, [props.projectId]);

  useEffect(() => {
    const sub = liveQuery(() =>
      db.issues.where("projectId").equals(props.projectId).toArray(),
    ).subscribe({
      next: (rows) => {
        const live = rows.filter((r) => !r.deletedAt);
        setAllIssues(live);
        setSubtasks(live.filter((r) => r.parentIssueId === props.issue.id));
      },
    });
    return () => sub.unsubscribe();
  }, [props.projectId, props.issue.id]);

  async function save() {
    setFormError(null);
    if (!title.trim()) {
      setTitleError("Title is required");
      return;
    }
    setTitleError(null);
    setBusy(true);
    try {
      const pts = storyPoints.trim() === "" ? null : Number(storyPoints);
      const orig = originalEstimate.trim() === "" ? null : Number(originalEstimate);
      const rem = remainingEstimate.trim() === "" ? null : Number(remainingEstimate);
      await updateIssueLocally(props.issue.id, {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        type,
        statusId,
        assigneeId: assigneeId || null,
        epicId: epicId || null,
        sprintId: sprintId || null,
        storyPoints: Number.isFinite(pts as number) ? (pts as number) : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        originalEstimateMinutes: Number.isFinite(orig as number) ? (orig as number) : null,
        remainingEstimateMinutes: Number.isFinite(rem as number) ? (rem as number) : null,
        fixVersionId: fixVersionId || null,
        labelIds: selectedLabels,
        componentIds: selectedComponents,
      });
      await Promise.all([
        (trpc as any).work.setIssueLabels.mutate({
          issueId: props.issue.id,
          labelIds: selectedLabels,
        }),
        (trpc as any).work.setIssueComponents.mutate({
          issueId: props.issue.id,
          componentIds: selectedComponents,
        }),
      ]);
      setMessage("Saved");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function addComment() {
    if (!commentBody.trim()) {
      setCommentError("Comment cannot be empty");
      return;
    }
    setCommentError(null);
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

  async function addSubtask() {
    if (!subtaskTitle.trim() || !statuses[0]) return;
    setBusy(true);
    try {
      await createIssueLocally({
        projectId: props.projectId,
        type: "sub_task",
        title: subtaskTitle.trim(),
        statusId: statuses[0].id,
        parentIssueId: props.issue.id,
        epicId: props.issue.epicId,
      });
      setSubtaskTitle("");
    } finally {
      setBusy(false);
    }
  }

  async function addLink() {
    if (!linkTargetId) return;
    setBusy(true);
    try {
      await (trpc as any).work.linkIssues.mutate({
        sourceIssueId: props.issue.id,
        targetIssueId: linkTargetId,
        linkType,
      });
      setLinkTargetId("");
      await refreshSide();
    } finally {
      setBusy(false);
    }
  }

  async function createLabel() {
    if (!newLabelName.trim()) return;
    const created = await (trpc as any).work.createLabel.mutate({
      projectId: props.projectId,
      name: newLabelName.trim(),
    });
    setLabels((prev) => [...prev, created]);
    setSelectedLabels((prev) => [...prev, created.id]);
    setNewLabelName("");
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

  const parent = allIssues.find((i) => i.id === props.issue.parentIssueId);
  const issueById = (id: string) => allIssues.find((i) => i.id === id);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [props.issue.id]);

  return (
    <div
      class="issue-modal-root"
      data-testid="issue-detail"
      role="presentation"
      onClick={(e: any) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div
        class="issue-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="issue-modal-title"
        onClick={(e: any) => e.stopPropagation()}
      >
        <div class="issue-detail-header">
          <div class="flex min-w-0 items-center gap-2">
            <TypeChip type={type} />
            <PriorityIcon priority={priority} />
            <div class="min-w-0">
              <div class="issue-key" data-testid="issue-detail-key">
                {props.issue.key}
              </div>
              {parent ? (
                <button
                  type="button"
                  class="text-xs text-muted-foreground underline"
                  onClick={() => props.onOpenIssue?.(parent.id)}
                >
                  Parent {parent.key}
                </button>
              ) : null}
            </div>
          </div>
          <div class="issue-detail-header-aside">
            <AssigneeBadge
              name={members.find((m) => m.userId === assigneeId)?.user?.displayName ?? null}
            />
            <button
              class={buttonVariants.ghost}
              type="button"
              data-testid="issue-detail-close"
              onClick={props.onClose}
            >
              Close
            </button>
          </div>
        </div>

        <div class="issue-modal-body">
          <FormError message={formError} />
          <label class="control-field">
            <span class="control-label required">Title</span>
            <input
              class={"control" + (titleError ? " is-invalid" : "")}
              data-testid="issue-detail-title"
              required
              value={title}
              onInput={(e: any) => {
                setTitle(e.currentTarget.value);
                setTitleError(null);
              }}
            />
            <FieldError message={titleError} />
          </label>
          <label class="control-field">
            <span class="control-label">Description</span>
            <textarea
              class="control"
              data-testid="issue-detail-description"
              rows={4}
              value={description}
              onInput={(e: any) => setDescription(e.currentTarget.value)}
            />
          </label>

          <div class="issue-fields-grid">
            <label class="control-field">
              <span class="control-label">Type</span>
              <select
                class="control"
                data-testid="issue-detail-type"
                value={type}
                onChange={(e: any) => setType(e.currentTarget.value)}
              >
                {ISSUE_TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {labelize(ty)}
                  </option>
                ))}
              </select>
            </label>
            <label class="control-field">
              <span class="control-label">Priority</span>
              <select
                class="control"
                data-testid="issue-detail-priority"
                value={priority}
                onChange={(e: any) => setPriority(e.currentTarget.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {labelize(p)}
                  </option>
                ))}
              </select>
            </label>
            <label class="control-field">
              <span class="control-label">Status</span>
              <select
                class="control"
                data-testid="issue-detail-status"
                value={statusId}
                onChange={(e: any) => setStatusId(e.currentTarget.value)}
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label class="control-field">
              <span class="control-label">Assignee</span>
              <select
                class="control"
                data-testid="issue-detail-assignee"
                value={assigneeId}
                onChange={(e: any) => setAssigneeId(e.currentTarget.value)}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.displayName ?? m.userId}
                  </option>
                ))}
              </select>
            </label>
            <label class="control-field">
              <span class="control-label">Epic</span>
              <select
                class="control"
                data-testid="issue-detail-epic"
                value={epicId}
                onChange={(e: any) => setEpicId(e.currentTarget.value)}
              >
                <option value="">None</option>
                {epics.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <label class="control-field">
              <span class="control-label">Sprint</span>
              <select
                class="control"
                data-testid="issue-detail-sprint"
                value={sprintId}
                onChange={(e: any) => setSprintId(e.currentTarget.value)}
              >
                <option value="">Backlog</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({labelize(String(s.state))})
                  </option>
                ))}
              </select>
            </label>
            <label class="control-field">
              <span class="control-label">Story points</span>
              <input
                class="control"
                data-testid="issue-detail-points"
                type="number"
                min={0}
                value={storyPoints}
                onInput={(e: any) => setStoryPoints(e.currentTarget.value)}
              />
            </label>
            <label class="control-field">
              <span class="control-label">Due date</span>
              <input
                class="control"
                data-testid="issue-detail-due"
                type="date"
                value={dueDate}
                onInput={(e: any) => setDueDate(e.currentTarget.value)}
              />
            </label>
            <label class="control-field">
              <span class="control-label">Original estimate (min)</span>
              <input
                class="control"
                data-testid="issue-detail-estimate"
                type="number"
                min={0}
                value={originalEstimate}
                onInput={(e: any) => setOriginalEstimate(e.currentTarget.value)}
              />
            </label>
            <label class="control-field">
              <span class="control-label">Remaining (min)</span>
              <input
                class="control"
                data-testid="issue-detail-remaining"
                type="number"
                min={0}
                value={remainingEstimate}
                onInput={(e: any) => setRemainingEstimate(e.currentTarget.value)}
              />
            </label>
            <label class="control-field">
              <span class="control-label">Fix version</span>
              <select
                class="control"
                data-testid="issue-detail-version"
                value={fixVersionId}
                onChange={(e: any) => setFixVersionId(e.currentTarget.value)}
              >
                <option value="">None</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <section class="issue-detail-section">
            <h3 class="text-sm font-semibold">Components</h3>
            {components.length === 0 ? (
              <p class="text-sm text-muted-foreground" data-testid="issue-components-empty">
                No components in this project yet. Create them under Releases.
              </p>
            ) : (
              <div class="flex flex-wrap gap-2" data-testid="issue-components">
                {components.map((c) => {
                  const on = selectedComponents.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      class={on ? "label-chip active" : "label-chip"}
                      data-testid="issue-component-chip"
                      onClick={() =>
                        setSelectedComponents((prev) =>
                          on ? prev.filter((id) => id !== c.id) : [...prev, c.id],
                        )
                      }
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section class="issue-detail-section">
            <h3 class="text-sm font-semibold">Labels</h3>
            <div class="flex flex-wrap gap-2" data-testid="issue-labels">
              {labels.map((lb) => {
                const on = selectedLabels.includes(lb.id);
                return (
                  <button
                    key={lb.id}
                    type="button"
                    class={on ? "label-chip active" : "label-chip"}
                    onClick={() =>
                      setSelectedLabels((prev) =>
                        on ? prev.filter((id) => id !== lb.id) : [...prev, lb.id],
                      )
                    }
                  >
                    {lb.name}
                  </button>
                );
              })}
            </div>
            <div class="mt-2 flex gap-2">
              <input
                class="toolbar-input flex-1"
                data-testid="new-label-input"
                placeholder="New label"
                value={newLabelName}
                onInput={(e: any) => setNewLabelName(e.currentTarget.value)}
              />
              <button
                class={buttonVariants.secondary}
                type="button"
                data-testid="create-label-submit"
                onClick={() => void createLabel()}
              >
                Add
              </button>
            </div>
          </section>

          <section class="issue-detail-section">
            <h3 class="text-sm font-semibold">Sub-tasks</h3>
            <ul class="space-y-1" data-testid="issue-subtasks">
              {subtasks.map((st) => (
                <li key={st.id}>
                  <button
                    type="button"
                    class="issue-row-link"
                    onClick={() => props.onOpenIssue?.(st.id)}
                  >
                    <span class="issue-key">{st.key}</span> {st.title}
                  </button>
                </li>
              ))}
            </ul>
            <div class="mt-2 flex gap-2">
              <input
                class="toolbar-input flex-1"
                data-testid="subtask-title-input"
                placeholder="Add sub-task"
                value={subtaskTitle}
                onInput={(e: any) => setSubtaskTitle(e.currentTarget.value)}
              />
              <button
                class={buttonVariants.secondary}
                type="button"
                data-testid="subtask-create"
                disabled={busy}
                onClick={() => void addSubtask()}
              >
                Add
              </button>
            </div>
          </section>

          <section class="issue-detail-section">
            <h3 class="text-sm font-semibold">Links</h3>
            <ul class="space-y-1" data-testid="issue-links">
              {links.map((lnk) => {
                const otherId =
                  lnk.sourceIssueId === props.issue.id ? lnk.targetIssueId : lnk.sourceIssueId;
                const other = issueById(otherId);
                return (
                  <li key={lnk.id} class="flex items-center justify-between text-sm">
                    <span>
                      {lnk.linkType} → {other?.key ?? otherId}
                    </span>
                    <button
                      class={buttonVariants.ghost}
                      type="button"
                      onClick={() =>
                        void (trpc as any).work.deleteIssueLink
                          .mutate({ id: lnk.id })
                          .then(refreshSide)
                      }
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
            <div class="mt-2 form-row">
              <label class="control-field">
                <span class="control-label">Type</span>
                <select
                  class="control"
                  data-testid="link-type"
                  value={linkType}
                  onChange={(e: any) => setLinkType(e.currentTarget.value)}
                >
                  <option value="relates_to">relates to</option>
                  <option value="blocks">blocks</option>
                  <option value="is_blocked_by">is blocked by</option>
                  <option value="duplicates">duplicates</option>
                </select>
              </label>
              <label class="control-field grow">
                <span class="control-label">Issue</span>
                <select
                  class="control"
                  data-testid="link-target"
                  value={linkTargetId}
                  onChange={(e: any) => setLinkTargetId(e.currentTarget.value)}
                >
                  <option value="">Select issue</option>
                  {allIssues
                    .filter((i) => i.id !== props.issue.id)
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.key} · {i.title}
                      </option>
                    ))}
                </select>
              </label>
              <button
                class={buttonVariants.secondary}
                type="button"
                data-testid="link-create"
                disabled={busy}
                onClick={() => void addLink()}
              >
                Link
              </button>
            </div>
          </section>

          <section class="issue-detail-section">
            <h3 class="text-sm font-semibold">{t("issue.comments")}</h3>
            <ul class="space-y-2" data-testid="issue-comments">
              {comments.map((c) => (
                <li key={c.id} class="rounded-md border border-border px-2 py-1.5 text-sm">
                  {c.body}
                </li>
              ))}
            </ul>
            <div class="mt-2 flex flex-col gap-2">
              <div class="flex gap-2">
                <input
                  class={"control toolbar-input flex-1" + (commentError ? " is-invalid" : "")}
                  data-testid="issue-comment-input"
                  placeholder="Add a comment"
                  value={commentBody}
                  onInput={(e: any) => {
                    setCommentBody(e.currentTarget.value);
                    setCommentError(null);
                  }}
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
              <FieldError message={commentError} />
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
            <label class="control-field mt-2">
              <span class="control-label">Upload</span>
              <input
                class="control"
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
        </div>
        <div class="issue-modal-footer">
          {message ? (
            <p class="mb-2 text-sm text-muted-foreground" data-testid="issue-detail-message">
              {message}
            </p>
          ) : null}
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
              onClick={() => void softDeleteIssueLocally(props.issue.id).then(props.onClose)}
            >
              {t("issue.delete")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
