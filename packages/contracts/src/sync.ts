import { z } from "zod";
import { entityIdSchema, idempotencyKeySchema } from "./common.js";

export const syncOpTypeSchema = z.enum([
  "create",
  "update",
  "delete",
  "restore",
]);

export const syncEntityTypeSchema = z.enum([
  "organization",
  "workspace",
  "project",
  "initiative",
  "epic",
  "issue",
  "issue_link",
  "comment",
  "sprint",
  "workflow_status",
  "attachment",
  "notification",
  "saved_filter",
  "custom_role",
  "membership",
]);

export const fieldPatchSchema = z.object({
  field: z.string(),
  value: z.unknown(),
  baseVersion: z.number().int().nonnegative(),
});

export const syncOpSchema = z.object({
  id: entityIdSchema,
  idempotencyKey: idempotencyKeySchema,
  entityType: syncEntityTypeSchema,
  entityId: entityIdSchema,
  op: syncOpTypeSchema,
  patches: z.array(fieldPatchSchema).default([]),
  payload: z.record(z.string(), z.unknown()).optional(),
  clientTimestamp: z.coerce.date(),
  workspaceId: entityIdSchema.optional(),
  projectId: entityIdSchema.optional(),
});

export type SyncOp = z.infer<typeof syncOpSchema>;

export const syncPushRequestSchema = z.object({
  protocolVersion: z.literal(1),
  ops: z.array(syncOpSchema).min(1).max(100),
});

export const fieldConflictSchema = z.object({
  field: z.string(),
  localValue: z.unknown(),
  serverValue: z.unknown(),
  localVersion: z.number().int(),
  serverVersion: z.number().int(),
});

export const syncConflictSchema = z.object({
  entityType: syncEntityTypeSchema,
  entityId: entityIdSchema,
  conflicts: z.array(fieldConflictSchema).min(1),
});

export type SyncConflict = z.infer<typeof syncConflictSchema>;

export const syncPushResultSchema = z.object({
  applied: z.array(entityIdSchema),
  merged: z.array(
    z.object({
      opId: entityIdSchema,
      entityId: entityIdSchema,
      version: z.number().int(),
      fields: z.record(z.string(), z.unknown()),
    }),
  ),
  conflicts: z.array(syncConflictSchema),
  serverTime: z.coerce.date(),
});

export type SyncPushResult = z.infer<typeof syncPushResultSchema>;

export const syncPullRequestSchema = z.object({
  protocolVersion: z.literal(1),
  since: z.coerce.date().nullable(),
  cursor: z.string().nullish(),
  limit: z.number().int().min(1).max(500).default(100),
  projectIds: z.array(entityIdSchema).optional(),
});

export const syncPatchEventSchema = z.object({
  type: z.literal("entity.patch"),
  entityType: syncEntityTypeSchema,
  entityId: entityIdSchema,
  version: z.number().int(),
  fields: z.record(z.string(), z.unknown()),
  deletedAt: z.coerce.date().nullable().optional(),
  updatedAt: z.coerce.date(),
  updatedById: entityIdSchema.nullable(),
});

export type SyncPatchEvent = z.infer<typeof syncPatchEventSchema>;
