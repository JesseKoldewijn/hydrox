import { applyConflictResolutions } from "@hydrox/sync";
import { db, type LocalIssue } from "./db";
import { trpc } from "./trpc";

function toLocalIssue(
  entityId: string,
  version: number,
  fields: Record<string, unknown>,
  fallback?: Partial<LocalIssue>,
): LocalIssue {
  const labelIds = Array.isArray(fields.labelIds)
    ? (fields.labelIds as string[])
    : (fallback?.labelIds ?? []);
  const componentIds = Array.isArray(fields.componentIds)
    ? (fields.componentIds as string[])
    : (fallback?.componentIds ?? []);
  const dueRaw = fields.dueDate ?? fallback?.dueDate ?? null;
  return {
    id: entityId,
    projectId: String(fields.projectId ?? fallback?.projectId ?? ""),
    key: String(fields.key ?? fallback?.key ?? ""),
    type: String(fields.type ?? fallback?.type ?? "task"),
    title: String(fields.title ?? fallback?.title ?? ""),
    description: (fields.description as string | null | undefined) ?? fallback?.description ?? null,
    statusId: String(fields.statusId ?? fallback?.statusId ?? ""),
    assigneeId: (fields.assigneeId as string | null | undefined) ?? fallback?.assigneeId ?? null,
    reporterId: (fields.reporterId as string | null | undefined) ?? fallback?.reporterId ?? null,
    epicId: (fields.epicId as string | null | undefined) ?? fallback?.epicId ?? null,
    parentIssueId:
      (fields.parentIssueId as string | null | undefined) ?? fallback?.parentIssueId ?? null,
    sprintId: (fields.sprintId as string | null | undefined) ?? fallback?.sprintId ?? null,
    priority: String(fields.priority ?? fallback?.priority ?? "medium"),
    backlogRank: String(fields.backlogRank ?? fallback?.backlogRank ?? "m"),
    storyPoints: (fields.storyPoints as number | null | undefined) ?? fallback?.storyPoints ?? null,
    dueDate: dueRaw
      ? typeof dueRaw === "string"
        ? dueRaw
        : new Date(dueRaw as Date).toISOString()
      : null,
    originalEstimateMinutes:
      (fields.originalEstimateMinutes as number | null | undefined) ??
      fallback?.originalEstimateMinutes ??
      null,
    remainingEstimateMinutes:
      (fields.remainingEstimateMinutes as number | null | undefined) ??
      fallback?.remainingEstimateMinutes ??
      null,
    fixVersionId:
      (fields.fixVersionId as string | null | undefined) ?? fallback?.fixVersionId ?? null,
    labelIds,
    componentIds,
    version,
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    pending: false,
  };
}

export async function upsertLocalIssue(issue: LocalIssue) {
  await db.issues.put(issue);
}

export async function createIssueLocally(input: {
  projectId: string;
  type: string;
  title: string;
  statusId: string;
  priority?: string;
  parentIssueId?: string | null;
  epicId?: string | null;
  sprintId?: string | null;
  storyPoints?: number | null;
  assigneeId?: string | null;
  componentIds?: string[];
}) {
  const id = crypto.randomUUID();
  const componentIds = input.componentIds ?? [];
  const issue: LocalIssue = {
    id,
    projectId: input.projectId,
    key: "LOCAL-pending",
    type: input.type,
    title: input.title,
    description: null,
    statusId: input.statusId,
    assigneeId: input.assigneeId ?? null,
    reporterId: null,
    epicId: input.epicId ?? null,
    parentIssueId: input.parentIssueId ?? null,
    sprintId: input.sprintId ?? null,
    priority: input.priority ?? "medium",
    backlogRank: `z${Date.now()}`,
    storyPoints: input.storyPoints ?? null,
    dueDate: null,
    originalEstimateMinutes: null,
    remainingEstimateMinutes: null,
    fixVersionId: null,
    labelIds: [],
    componentIds,
    version: 0,
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    pending: true,
  };
  await db.issues.put(issue);
  await db.syncQueue.add({
    opId: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    entityType: "issue",
    entityId: id,
    op: "create",
    patches: [],
    payload: {
      projectId: input.projectId,
      type: input.type,
      title: input.title,
      statusId: input.statusId,
      backlogRank: issue.backlogRank,
      priority: issue.priority,
      parentIssueId: issue.parentIssueId,
      epicId: issue.epicId,
      sprintId: issue.sprintId,
      storyPoints: issue.storyPoints,
      assigneeId: issue.assigneeId,
      componentIds,
    },
    clientTimestamp: new Date().toISOString(),
  });
  await flushSyncQueue();
  return issue;
}

export async function updateIssueLocally(id: string, patch: Partial<LocalIssue>) {
  const current = await db.issues.get(id);
  if (!current) return;
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
    pending: true,
  };
  await db.issues.put(next);
  const patches = Object.entries(patch)
    .filter(([k]) => !["id", "pending", "updatedAt", "version"].includes(k))
    .map(([field, value]) => ({
      field,
      value,
      baseVersion: current.version,
    }));
  await db.syncQueue.add({
    opId: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    entityType: "issue",
    entityId: id,
    op: "update",
    patches,
    clientTimestamp: new Date().toISOString(),
  });
  await flushSyncQueue();
}

export async function flushSyncQueue() {
  const items = await db.syncQueue.orderBy("id").toArray();
  if (!items.length) return;
  try {
    const result = (await (trpc as any).sync.push.mutate({
      protocolVersion: 1,
      ops: items.map((i) => ({
        id: i.opId,
        idempotencyKey: i.idempotencyKey,
        entityType: i.entityType,
        entityId: i.entityId,
        op: i.op,
        patches: i.patches,
        payload: i.payload,
        clientTimestamp: i.clientTimestamp,
      })),
    })) as {
      applied: string[];
      merged: Array<{
        opId: string;
        entityId: string;
        version: number;
        fields: Record<string, unknown>;
      }>;
      conflicts: Array<{
        entityType: string;
        entityId: string;
        conflicts: any[];
      }>;
    };

    const byOpId = new Map(result.merged.map((m) => [m.opId, m]));

    for (const item of items) {
      const m = byOpId.get(item.opId);
      if (!m) continue;
      const existing = await db.issues.get(item.entityId);
      // Prefer client entity id (create uses same UUID server-side).
      if (m.entityId !== item.entityId && existing) {
        await db.issues.delete(item.entityId);
      }
      await db.issues.put(toLocalIssue(m.entityId, m.version, m.fields, existing ?? undefined));
    }

    for (const c of result.conflicts) {
      await db.conflicts.put({
        id: crypto.randomUUID(),
        entityType: c.entityType,
        entityId: c.entityId,
        conflicts: c.conflicts as any,
      });
    }

    const applied = new Set(result.applied);
    for (const item of items) {
      if (applied.has(item.opId) || byOpId.has(item.opId)) {
        if (item.id != null) await db.syncQueue.delete(item.id);
      }
    }
  } catch (err) {
    console.warn("sync flush failed; will retry", err);
  }
}

export async function pullAndSubscribe(projectId: string) {
  const patches = (await (trpc as any).sync.pull.query({
    protocolVersion: 1,
    since: null,
    projectIds: [projectId],
  })) as Array<{
    entityId: string;
    version: number;
    fields: Record<string, unknown>;
    deletedAt?: string | Date | null;
  }>;

  for (const p of patches) {
    if (p.deletedAt) {
      await db.issues.delete(p.entityId);
      continue;
    }
    await db.issues.put(toLocalIssue(p.entityId, p.version, p.fields));
  }

  // Drain any offline queue after pull.
  await flushSyncQueue();

  try {
    const sub = (trpc as any).sync.onPatch.subscribe(undefined, {
      onData: async (event: any) => {
        if (!event || event.entityType !== "issue") return;
        if (event.deletedAt) {
          await db.issues.delete(event.entityId);
          return;
        }
        const existing = await db.issues.get(event.entityId);
        await db.issues.put(
          toLocalIssue(
            event.entityId,
            event.version,
            event.fields ?? {},
            existing ?? { projectId },
          ),
        );
      },
      onError: (err: unknown) => {
        console.warn("sync subscription error", err);
      },
    });
    return () => sub.unsubscribe();
  } catch (err) {
    console.warn("sync subscribe failed", err);
    return () => undefined;
  }
}

export async function softDeleteIssueLocally(id: string) {
  const current = await db.issues.get(id);
  if (!current) return;
  await db.issues.put({
    ...current,
    deletedAt: new Date().toISOString(),
    pending: true,
    updatedAt: new Date().toISOString(),
  });
  try {
    await (trpc as any).work.softDeleteIssue.mutate({ id });
    await db.issues.delete(id);
  } catch (err) {
    console.warn("soft delete failed", err);
  }
}

export async function resolveConflict(
  conflictId: string,
  resolutions: Record<string, "local" | "server">,
) {
  const conflict = await db.conflicts.get(conflictId);
  if (!conflict) return;
  const local = await db.issues.get(conflict.entityId);
  if (!local) return;
  const serverFields: Record<string, unknown> = {};
  for (const c of conflict.conflicts) serverFields[c.field] = c.serverValue;
  const localFields: Record<string, unknown> = { ...local };
  const { fields, version } = applyConflictResolutions({
    server: serverFields,
    local: localFields,
    conflicts: conflict.conflicts,
    resolutions,
    serverVersion: Math.max(...conflict.conflicts.map((c) => c.serverVersion)),
  });
  await updateIssueLocally(conflict.entityId, {
    ...(fields as Partial<LocalIssue>),
    version,
  });
  await db.conflicts.delete(conflictId);
}
