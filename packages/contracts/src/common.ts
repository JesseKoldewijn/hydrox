import { z } from "zod";

export const PROTOCOL_VERSION = 1 as const;

export const ErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION: "VALIDATION",
  CONFLICT: "CONFLICT",
  SYNC_CONFLICT: "SYNC_CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const apiErrorSchema = z.object({
  code: z.enum([
    "UNAUTHORIZED",
    "FORBIDDEN",
    "NOT_FOUND",
    "VALIDATION",
    "CONFLICT",
    "SYNC_CONFLICT",
    "RATE_LIMITED",
    "INTERNAL",
  ]),
  message: z.string(),
  details: z.unknown().optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const paginationSchema = z.object({
  cursor: z.string().nullish(),
  limit: z.number().int().min(1).max(100).default(25),
});

export const paginatedMetaSchema = z.object({
  nextCursor: z.string().nullable(),
  total: z.number().int().optional(),
});

export const idempotencyKeySchema = z.string().uuid();
export const entityIdSchema = z.string().uuid();

export const issueKeySchema = z
  .string()
  .regex(/^[A-Z][A-Z0-9]+-\d+$/, "Issue key must match Jira format PROJ-123");

export const issueTypeSchema = z.enum(["story", "bug", "task", "sub_task"]);
export type IssueType = z.infer<typeof issueTypeSchema>;

export const issueLinkTypeSchema = z.enum([
  "blocks",
  "is_blocked_by",
  "relates_to",
  "duplicates",
]);

export const initiativeScopeSchema = z.enum(["organization", "project"]);

export const orgRoleSchema = z.enum(["owner", "admin", "member"]);
export const workspaceRoleSchema = z.enum(["admin", "member"]);
export const projectRoleSchema = z.enum(["admin", "member", "viewer"]);

export const capabilitySchema = z.enum([
  "project.view",
  "project.edit",
  "board.edit",
  "issue.create",
  "issue.edit",
  "issue.delete",
  "sprint.manage",
  "workflow.manage",
  "members.manage",
  "roles.manage",
  "attachments.manage",
  "purge.trigger",
]);

export type Capability = z.infer<typeof capabilitySchema>;

export const softDeleteFieldsSchema = z.object({
  deletedAt: z.coerce.date().nullable(),
  deletedById: entityIdSchema.nullable(),
});

export const versionedEntitySchema = z.object({
  id: entityIdSchema,
  version: z.number().int().positive(),
  updatedAt: z.coerce.date(),
  updatedById: entityIdSchema.nullable(),
});
