import { z } from "zod";
import {
  entityIdSchema,
  initiativeScopeSchema,
  issueKeySchema,
  issueLinkTypeSchema,
  issuePrioritySchema,
  issueTypeSchema,
  softDeleteFieldsSchema,
  versionedEntitySchema,
} from "./common.js";

export const organizationSchema = versionedEntitySchema.merge(softDeleteFieldsSchema).extend({
  name: z.string(),
  slug: z.string(),
});

export const workspaceSchema = versionedEntitySchema.merge(softDeleteFieldsSchema).extend({
  organizationId: entityIdSchema,
  name: z.string(),
  key: z.string(),
});

export const projectSchema = versionedEntitySchema.merge(softDeleteFieldsSchema).extend({
  workspaceId: entityIdSchema,
  organizationId: entityIdSchema,
  name: z.string(),
  key: z.string().regex(/^[A-Z][A-Z0-9]+$/, "Project key must be uppercase like PROJ"),
  description: z.string().nullable(),
  issueCounter: z.number().int().nonnegative(),
});

export const initiativeSchema = versionedEntitySchema.merge(softDeleteFieldsSchema).extend({
  organizationId: entityIdSchema,
  projectId: entityIdSchema.nullable(),
  scope: initiativeScopeSchema,
  name: z.string(),
  description: z.string().nullable(),
});

export const epicSchema = versionedEntitySchema.merge(softDeleteFieldsSchema).extend({
  projectId: entityIdSchema,
  initiativeId: entityIdSchema.nullable(),
  name: z.string(),
  description: z.string().nullable(),
  statusId: entityIdSchema.nullable(),
  startDate: z.coerce.date().nullable().optional(),
  targetDate: z.coerce.date().nullable().optional(),
});

export const issueSchema = versionedEntitySchema.merge(softDeleteFieldsSchema).extend({
  projectId: entityIdSchema,
  epicId: entityIdSchema.nullable(),
  parentIssueId: entityIdSchema.nullable(),
  key: issueKeySchema,
  type: issueTypeSchema,
  title: z.string().min(1).max(500),
  description: z.string().nullable(),
  statusId: entityIdSchema,
  assigneeId: entityIdSchema.nullable(),
  reporterId: entityIdSchema,
  sprintId: entityIdSchema.nullable(),
  priority: issuePrioritySchema,
  backlogRank: z.string(),
  storyPoints: z.number().nullable(),
  dueDate: z.coerce.date().nullable().optional(),
  originalEstimateMinutes: z.number().int().nullable().optional(),
  remainingEstimateMinutes: z.number().int().nullable().optional(),
  fixVersionId: entityIdSchema.nullable().optional(),
});

export const labelSchema = z.object({
  id: entityIdSchema,
  projectId: entityIdSchema,
  name: z.string().min(1).max(64),
  color: z.string().nullable().optional(),
});

export const componentSchema = z.object({
  id: entityIdSchema,
  projectId: entityIdSchema,
  name: z.string().min(1).max(120),
  description: z.string().nullable().optional(),
  leadUserId: entityIdSchema.nullable().optional(),
});

export const projectVersionSchema = z.object({
  id: entityIdSchema,
  projectId: entityIdSchema,
  name: z.string().min(1).max(120),
  description: z.string().nullable().optional(),
  releaseDate: z.coerce.date().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  released: z.boolean(),
  archived: z.boolean(),
});

export const issueTemplateSchema = z.object({
  id: entityIdSchema,
  projectId: entityIdSchema,
  name: z.string().min(1).max(120),
  description: z.string().nullable().optional(),
  defaults: z.record(z.string(), z.unknown()),
});

export const dashboardSchema = z.object({
  id: entityIdSchema,
  projectId: entityIdSchema,
  ownerId: entityIdSchema,
  name: z.string().min(1).max(120),
  layout: z.record(z.string(), z.unknown()),
});

export const dashboardGadgetSchema = z.object({
  id: entityIdSchema,
  dashboardId: entityIdSchema,
  type: z.enum(["issue_stats", "activity_feed", "sprint_status", "priority_breakdown"]),
  title: z.string(),
  config: z.record(z.string(), z.unknown()),
  position: z.number().int(),
});

export const issueLinkSchema = versionedEntitySchema.merge(softDeleteFieldsSchema).extend({
  sourceIssueId: entityIdSchema,
  targetIssueId: entityIdSchema,
  linkType: issueLinkTypeSchema,
});

export const commentSchema = versionedEntitySchema.merge(softDeleteFieldsSchema).extend({
  issueId: entityIdSchema,
  authorId: entityIdSchema,
  body: z.string().min(1),
});

export const sprintSchema = versionedEntitySchema.merge(softDeleteFieldsSchema).extend({
  projectId: entityIdSchema,
  name: z.string(),
  goal: z.string().nullable(),
  startDate: z.coerce.date().nullable(),
  endDate: z.coerce.date().nullable(),
  state: z.enum(["future", "active", "closed"]),
});

export const workflowStatusSchema = versionedEntitySchema.merge(softDeleteFieldsSchema).extend({
  projectId: entityIdSchema,
  name: z.string(),
  category: z.enum(["todo", "in_progress", "done"]),
  position: z.number().int(),
  color: z.string().optional(),
});

export const auditEventSchema = z.object({
  id: entityIdSchema,
  organizationId: entityIdSchema,
  actorId: entityIdSchema.nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: entityIdSchema.nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.coerce.date(),
});

export const AUDIT_RETENTION_DAYS = 30 as const;

export const createIssueInputSchema = z.object({
  projectId: entityIdSchema,
  type: issueTypeSchema,
  title: z.string().min(1).max(500),
  description: z.string().nullable().optional(),
  epicId: entityIdSchema.nullable().optional(),
  parentIssueId: entityIdSchema.nullable().optional(),
  statusId: entityIdSchema.optional(),
  assigneeId: entityIdSchema.nullable().optional(),
  sprintId: entityIdSchema.nullable().optional(),
  priority: issuePrioritySchema.optional(),
  storyPoints: z.number().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  originalEstimateMinutes: z.number().int().nullable().optional(),
  remainingEstimateMinutes: z.number().int().nullable().optional(),
  fixVersionId: entityIdSchema.nullable().optional(),
  labelIds: z.array(entityIdSchema).optional(),
  componentIds: z.array(entityIdSchema).optional(),
  templateId: entityIdSchema.optional(),
});

export const updateIssueInputSchema = z.object({
  id: entityIdSchema,
  baseVersion: z.number().int().positive(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  type: issueTypeSchema.optional(),
  statusId: entityIdSchema.optional(),
  assigneeId: entityIdSchema.nullable().optional(),
  epicId: entityIdSchema.nullable().optional(),
  parentIssueId: entityIdSchema.nullable().optional(),
  sprintId: entityIdSchema.nullable().optional(),
  priority: issuePrioritySchema.optional(),
  backlogRank: z.string().optional(),
  storyPoints: z.number().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  originalEstimateMinutes: z.number().int().nullable().optional(),
  remainingEstimateMinutes: z.number().int().nullable().optional(),
  fixVersionId: entityIdSchema.nullable().optional(),
  labelIds: z.array(entityIdSchema).optional(),
  componentIds: z.array(entityIdSchema).optional(),
});

export const bulkUpdateIssuesInputSchema = z.object({
  ids: z.array(entityIdSchema).min(1).max(100),
  patch: z.object({
    statusId: entityIdSchema.optional(),
    assigneeId: entityIdSchema.nullable().optional(),
    sprintId: entityIdSchema.nullable().optional(),
    priority: issuePrioritySchema.optional(),
    epicId: entityIdSchema.nullable().optional(),
    fixVersionId: entityIdSchema.nullable().optional(),
    labelIds: z.array(entityIdSchema).optional(),
    componentIds: z.array(entityIdSchema).optional(),
  }),
});
