import { applyConflictResolutions } from "@hydrox/sync";
import { db, type LocalIssue } from "./db";
import { trpc } from "./trpc";

export async function upsertLocalIssue(issue: LocalIssue) {
  await db.issues.put(issue);
}

export async function createIssueLocally(input: {
  projectId: string;
  type: string;
  title: string;
  statusId: string;
}) {
  const id = crypto.randomUUID();
  const issue: LocalIssue = {
    id,
    projectId: input.projectId,
    key: "LOCAL-pending",
    type: input.type,
    title: input.title,
    description: null,
    statusId: input.statusId,
    assigneeId: null,
    sprintId: null,
    backlogRank: `z${Date.now()}`,
    storyPoints: null,
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
    },
    clientTimestamp: new Date().toISOString(),
  });
  void flushSyncQueue();
  return issue;
}

export async function updateIssueLocally(
  id: string,
  patch: Partial<LocalIssue>,
) {
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
  void flushSyncQueue();
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
        conflicts: LocalIssue extends never ? never : any[];
      }>;
    };

    for (const m of result.merged) {
      const fields = m.fields as Partial<LocalIssue>;
      await db.issues.put({
        id: m.entityId,
        projectId: String(fields.projectId ?? ""),
        key: String(fields.key ?? "UNKNOWN-0"),
        type: String(fields.type ?? "task"),
        title: String(fields.title ?? ""),
        description: (fields.description as string | null) ?? null,
        statusId: String(fields.statusId ?? ""),
        assigneeId: (fields.assigneeId as string | null) ?? null,
        sprintId: (fields.sprintId as string | null) ?? null,
        backlogRank: String(fields.backlogRank ?? "m"),
        storyPoints: (fields.storyPoints as number | null) ?? null,
        version: m.version,
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        pending: false,
      });
    }

    for (const c of result.conflicts) {
      await db.conflicts.put({
        id: crypto.randomUUID(),
        entityType: c.entityType,
        entityId: c.entityId,
        conflicts: c.conflicts as any,
      });
    }

    await db.syncQueue.clear();
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
    deletedAt?: string | null;
  }>;

  for (const p of patches) {
    if (p.deletedAt) {
      await db.issues.delete(p.entityId);
      continue;
    }
    const f = p.fields;
    await db.issues.put({
      id: p.entityId,
      projectId: String(f.projectId ?? projectId),
      key: String(f.key ?? ""),
      type: String(f.type ?? "task"),
      title: String(f.title ?? ""),
      description: (f.description as string | null) ?? null,
      statusId: String(f.statusId ?? ""),
      assigneeId: (f.assigneeId as string | null) ?? null,
      sprintId: (f.sprintId as string | null) ?? null,
      backlogRank: String(f.backlogRank ?? "m"),
      storyPoints: (f.storyPoints as number | null) ?? null,
      version: p.version,
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      pending: false,
    });
  }

  try {
    const sub = (trpc as any).sync.onPatch.subscribe(undefined, {
      onData: async (event: any) => {
        if (event.entityType !== "issue") return;
        if (event.deletedAt) {
          await db.issues.delete(event.entityId);
          return;
        }
        const f = event.fields ?? {};
        const existing = await db.issues.get(event.entityId);
        await db.issues.put({
          id: event.entityId,
          projectId: String(f.projectId ?? existing?.projectId ?? projectId),
          key: String(f.key ?? existing?.key ?? ""),
          type: String(f.type ?? existing?.type ?? "task"),
          title: String(f.title ?? existing?.title ?? ""),
          description:
            (f.description as string | null) ?? existing?.description ?? null,
          statusId: String(f.statusId ?? existing?.statusId ?? ""),
          assigneeId:
            (f.assigneeId as string | null) ?? existing?.assigneeId ?? null,
          sprintId: (f.sprintId as string | null) ?? existing?.sprintId ?? null,
          backlogRank: String(f.backlogRank ?? existing?.backlogRank ?? "m"),
          storyPoints:
            (f.storyPoints as number | null) ?? existing?.storyPoints ?? null,
          version: event.version,
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          pending: false,
        });
      },
    });
    return () => sub.unsubscribe();
  } catch {
    return () => undefined;
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
