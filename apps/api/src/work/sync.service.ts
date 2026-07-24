import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { mergeFields, toSyncConflict } from "@hydrox/sync";
import type { SyncOp, SyncPushResult } from "@hydrox/contracts";
import { issues, syncIdempotency, type HydroxDb } from "@hydrox/db";
import { DB } from "../db/db.module.js";
import { SyncBusService } from "../sync/sync-bus.service.js";
import { WorkService } from "./work.service.js";

function issueFields(
  row: typeof issues.$inferSelect,
  labelIds: string[] = [],
  componentIds: string[] = [],
): Record<string, unknown> {
  return {
    projectId: row.projectId,
    key: row.key,
    type: row.type,
    title: row.title,
    description: row.description,
    statusId: row.statusId,
    assigneeId: row.assigneeId,
    reporterId: row.reporterId,
    sprintId: row.sprintId,
    priority: row.priority,
    backlogRank: row.backlogRank,
    storyPoints: row.storyPoints,
    epicId: row.epicId,
    parentIssueId: row.parentIssueId,
    dueDate: row.dueDate,
    originalEstimateMinutes: row.originalEstimateMinutes,
    remainingEstimateMinutes: row.remainingEstimateMinutes,
    fixVersionId: row.fixVersionId,
    labelIds,
    componentIds,
  };
}

@Injectable()
export class SyncService {
  constructor(
    @Inject(DB) private readonly db: HydroxDb,
    @Inject(SyncBusService) private readonly bus: SyncBusService,
    @Inject(WorkService) private readonly work: WorkService,
  ) {}

  async push(userId: string, ops: SyncOp[]): Promise<SyncPushResult> {
    const applied: string[] = [];
    const merged: SyncPushResult["merged"] = [];
    const conflicts: SyncPushResult["conflicts"] = [];

    for (const op of ops) {
      const [seen] = await this.db
        .select()
        .from(syncIdempotency)
        .where(
          and(
            eq(syncIdempotency.userId, userId),
            eq(syncIdempotency.idempotencyKey, op.idempotencyKey),
          ),
        )
        .limit(1);
      if (seen) {
        applied.push(op.id);
        const cached = seen.result as {
          merged?: SyncPushResult["merged"][number];
        } | null;
        if (cached?.merged) merged.push(cached.merged);
        continue;
      }

      let mergedEntry: SyncPushResult["merged"][number] | undefined;

      if (op.entityType === "issue" && op.op === "update") {
        const [current] = await this.db
          .select()
          .from(issues)
          .where(and(eq(issues.id, op.entityId), isNull(issues.deletedAt)))
          .limit(1);
        if (!current) continue;
        const existingComponentIds = await this.work.listIssueComponentIds(current.id);
        const serverFields = {
          title: current.title,
          description: current.description,
          type: current.type,
          statusId: current.statusId,
          assigneeId: current.assigneeId,
          epicId: current.epicId,
          parentIssueId: current.parentIssueId,
          sprintId: current.sprintId,
          priority: current.priority,
          backlogRank: current.backlogRank,
          storyPoints: current.storyPoints,
          componentIds: existingComponentIds,
        };
        const result = mergeFields({
          server: serverFields,
          serverVersion: current.version,
          patches: op.patches,
        });
        if (result.kind === "conflict") {
          conflicts.push(toSyncConflict("issue", op.entityId, result.conflicts));
        } else {
          const update = await this.work.updateIssue({
            id: op.entityId,
            baseVersion: current.version,
            userId,
            patch: result.fields,
          });
          if (!update.conflict) {
            applied.push(op.id);
            const labelIds = await this.work.listIssueLabelIds(update.issue.id);
            const componentIds = await this.work.listIssueComponentIds(update.issue.id);
            mergedEntry = {
              opId: op.id,
              entityId: op.entityId,
              version: update.issue.version,
              fields: issueFields(update.issue, labelIds, componentIds),
            };
            merged.push(mergedEntry);
          } else {
            conflicts.push(
              toSyncConflict("issue", op.entityId, [
                {
                  field: "_version",
                  localValue: op.patches,
                  serverValue: update.current,
                  localVersion: current.version,
                  serverVersion: update.current.version,
                },
              ]),
            );
          }
        }
      } else if (op.entityType === "issue" && op.op === "create" && op.payload) {
        const created = await this.work.createIssue({
          id: op.entityId,
          projectId: String(op.payload.projectId),
          type: String(op.payload.type ?? "task"),
          title: String(op.payload.title ?? "Untitled"),
          description: (op.payload.description as string | null) ?? null,
          epicId: (op.payload.epicId as string | null) ?? null,
          parentIssueId: (op.payload.parentIssueId as string | null) ?? null,
          statusId: op.payload.statusId as string | undefined,
          assigneeId: (op.payload.assigneeId as string | null) ?? null,
          sprintId: (op.payload.sprintId as string | null) ?? null,
          priority: (op.payload.priority as string | undefined) ?? "medium",
          storyPoints: (op.payload.storyPoints as number | null) ?? null,
          backlogRank: (op.payload.backlogRank as string | null) ?? null,
          componentIds: Array.isArray(op.payload.componentIds)
            ? (op.payload.componentIds as string[])
            : [],
          userId,
        });
        applied.push(op.id);
        const labelIds = await this.work.listIssueLabelIds(created.id);
        const componentIds = await this.work.listIssueComponentIds(created.id);
        mergedEntry = {
          opId: op.id,
          entityId: created.id,
          version: created.version,
          fields: issueFields(created, labelIds, componentIds),
        };
        merged.push(mergedEntry);
      } else if (op.entityType === "issue" && op.op === "delete") {
        await this.work.softDeleteIssue(op.entityId, userId);
        applied.push(op.id);
      }

      await this.db.insert(syncIdempotency).values({
        idempotencyKey: op.idempotencyKey,
        userId,
        result: { applied: true, merged: mergedEntry },
      });
    }

    return {
      applied,
      merged,
      conflicts,
      serverTime: new Date(),
    };
  }

  async pull(since: Date | null, projectIds?: string[]) {
    const rows = await this.db.select().from(issues).where(isNull(issues.deletedAt));
    const filtered = rows.filter((r) => {
      if (projectIds?.length && !projectIds.includes(r.projectId)) return false;
      if (since && r.updatedAt <= since) return false;
      return true;
    });
    const out = [];
    for (const r of filtered) {
      const labelIds = await this.work.listIssueLabelIds(r.id);
      const componentIds = await this.work.listIssueComponentIds(r.id);
      out.push({
        type: "entity.patch" as const,
        entityType: "issue" as const,
        entityId: r.id,
        version: r.version,
        fields: issueFields(r, labelIds, componentIds),
        updatedAt: r.updatedAt,
        updatedById: r.updatedById,
        deletedAt: r.deletedAt,
      });
    }
    return out;
  }

  onPatches(handler: Parameters<SyncBusService["onPatch"]>[0]) {
    return this.bus.onPatch(handler);
  }
}
