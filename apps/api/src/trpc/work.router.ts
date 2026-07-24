import { Inject, Injectable } from "@nestjs/common";
import { Input, Mutation, Query, Router, TrpcContext } from "@nest-native/trpc";
import { z } from "zod";
import {
  createIssueInputSchema,
  updateIssueInputSchema,
  issueLinkTypeSchema,
  capabilitySchema,
  projectRoleSchema,
} from "@hydrox/contracts";
import { WorkService } from "../work/work.service.js";
import { PermissionsService } from "../auth/permissions.service.js";
import { StorageService } from "../storage/storage.module.js";
import type { TrpcContext as Ctx } from "./context.js";
import { organizations, workspaces, organizationMemberships } from "@hydrox/db";
import { and, eq, isNull } from "drizzle-orm";
import { DB } from "../db/db.module.js";
import type { HydroxDb } from "@hydrox/db";

@Router("work")
@Injectable()
export class WorkRouter {
  constructor(
    @Inject(WorkService) private readonly work: WorkService,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(DB) private readonly db: HydroxDb,
  ) {}

  @Query()
  async myOrgs(@TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    const memberships = await this.db
      .select()
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.userId, ctx.user.id),
          isNull(organizationMemberships.deletedAt),
        ),
      );
    const orgs = [];
    for (const m of memberships) {
      const [org] = await this.db
        .select()
        .from(organizations)
        .where(eq(organizations.id, m.organizationId))
        .limit(1);
      if (org) orgs.push({ ...org, role: m.role });
    }
    return orgs;
  }

  @Query({ input: z.object({ organizationId: z.string().uuid() }) })
  async workspaces(@Input() input: { organizationId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.db
      .select()
      .from(workspaces)
      .where(
        and(eq(workspaces.organizationId, input.organizationId), isNull(workspaces.deletedAt)),
      );
  }

  @Mutation({
    input: z.object({
      workspaceId: z.string().uuid(),
      organizationId: z.string().uuid(),
      name: z.string().min(1),
      key: z.string().min(2).max(16),
      description: z.string().nullable().optional(),
    }),
  })
  async createProject(
    @Input()
    input: {
      workspaceId: string;
      organizationId: string;
      name: string;
      key: string;
      description?: string | null;
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.createProject({ ...input, userId: ctx.user.id });
  }

  @Query({ input: z.object({ workspaceId: z.string().uuid() }) })
  async projects(@Input() input: { workspaceId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listProjects(input.workspaceId);
  }

  @Query({ input: z.object({ projectId: z.string().uuid() }) })
  async project(@Input() input: { projectId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.getProject(input.projectId);
  }

  @Query({ input: z.object({ projectId: z.string().uuid() }) })
  async statuses(@Input() input: { projectId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listStatuses(input.projectId);
  }

  @Mutation({
    input: z.object({
      organizationId: z.string().uuid(),
      projectId: z.string().uuid().nullable().optional(),
      scope: z.enum(["organization", "project"]),
      name: z.string().min(1),
      description: z.string().nullable().optional(),
    }),
  })
  async createInitiative(
    @Input()
    input: {
      organizationId: string;
      projectId?: string | null;
      scope: "organization" | "project";
      name: string;
      description?: string | null;
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.createInitiative({ ...input, userId: ctx.user.id });
  }

  @Query({ input: z.object({ organizationId: z.string().uuid() }) })
  async initiatives(@Input() input: { organizationId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listInitiatives(input.organizationId);
  }

  @Mutation({
    input: z.object({
      projectId: z.string().uuid(),
      initiativeId: z.string().uuid().nullable().optional(),
      name: z.string().min(1),
      description: z.string().nullable().optional(),
    }),
  })
  async createEpic(
    @Input()
    input: {
      projectId: string;
      initiativeId?: string | null;
      name: string;
      description?: string | null;
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    await this.permissions.assert(ctx.user.id, input.projectId, "issue.create");
    return this.work.createEpic({ ...input, userId: ctx.user.id });
  }

  @Query({ input: z.object({ projectId: z.string().uuid() }) })
  async epics(@Input() input: { projectId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listEpics(input.projectId);
  }

  @Mutation({ input: createIssueInputSchema })
  async createIssue(
    @Input() input: z.infer<typeof createIssueInputSchema>,
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    await this.permissions.assert(ctx.user.id, input.projectId, "issue.create");
    return this.work.createIssue({ ...input, userId: ctx.user.id });
  }

  @Query({ input: z.object({ projectId: z.string().uuid() }) })
  async issues(@Input() input: { projectId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listIssues(input.projectId);
  }

  @Mutation({ input: updateIssueInputSchema })
  async updateIssue(
    @Input() input: z.infer<typeof updateIssueInputSchema>,
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    const { id, baseVersion, ...patch } = input;
    return this.work.updateIssue({
      id,
      baseVersion,
      userId: ctx.user.id,
      patch,
    });
  }

  @Mutation({
    input: z.object({
      projectId: z.string().uuid(),
      name: z.string().min(1),
      goal: z.string().nullable().optional(),
    }),
  })
  async createSprint(
    @Input() input: { projectId: string; name: string; goal?: string | null },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    await this.permissions.assert(ctx.user.id, input.projectId, "sprint.manage");
    return this.work.createSprint({ ...input, userId: ctx.user.id });
  }

  @Mutation({ input: z.object({ id: z.string().uuid() }) })
  async startSprint(@Input() input: { id: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.startSprint(input.id, ctx.user.id);
  }

  @Mutation({
    input: z.object({
      id: z.string().uuid(),
      moveIncompleteToSprintId: z.string().uuid().nullable().optional(),
    }),
  })
  async completeSprint(
    @Input()
    input: { id: string; moveIncompleteToSprintId?: string | null },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.completeSprint(input.id, ctx.user.id, {
      moveIncompleteToSprintId: input.moveIncompleteToSprintId,
    });
  }

  @Mutation({
    input: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      goal: z.string().nullable().optional(),
      startDate: z.coerce.date().nullable().optional(),
      endDate: z.coerce.date().nullable().optional(),
    }),
  })
  async updateSprint(
    @Input()
    input: {
      id: string;
      name?: string;
      goal?: string | null;
      startDate?: Date | null;
      endDate?: Date | null;
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    const { id, ...patch } = input;
    return this.work.updateSprint(id, ctx.user.id, patch);
  }

  @Query({ input: z.object({ projectId: z.string().uuid() }) })
  async sprints(@Input() input: { projectId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listSprints(input.projectId);
  }

  @Mutation({
    input: z.object({
      issueId: z.string().uuid(),
      body: z.string().min(1),
    }),
  })
  async addComment(@Input() input: { issueId: string; body: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.addComment({ ...input, userId: ctx.user.id });
  }

  @Query({ input: z.object({ issueId: z.string().uuid() }) })
  async comments(@Input() input: { issueId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listComments(input.issueId);
  }

  @Query({ input: z.object({ issueId: z.string().uuid() }) })
  async attachments(@Input() input: { issueId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listAttachmentsMeta(input.issueId);
  }

  @Mutation({ input: z.object({ id: z.string().uuid() }) })
  async softDeleteIssue(@Input() input: { id: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.softDeleteIssue(input.id, ctx.user.id);
  }

  @Query({ input: z.object({ organizationId: z.string().uuid() }) })
  async listCustomRoles(@Input() input: { organizationId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listCustomRoles(input.organizationId);
  }

  @Mutation({
    input: z.object({
      sourceIssueId: z.string().uuid(),
      targetIssueId: z.string().uuid(),
      linkType: issueLinkTypeSchema,
    }),
  })
  async linkIssues(
    @Input()
    input: {
      sourceIssueId: string;
      targetIssueId: string;
      linkType: z.infer<typeof issueLinkTypeSchema>;
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.linkIssues({ ...input, userId: ctx.user.id });
  }

  @Mutation({
    input: z.object({
      projectId: z.string().uuid(),
      name: z.string().min(1),
      query: z.record(z.string(), z.unknown()),
    }),
  })
  async saveFilter(
    @Input()
    input: { projectId: string; name: string; query: Record<string, unknown> },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.saveFilter({
      ...input,
      ownerId: ctx.user.id,
    });
  }

  @Mutation({
    input: z.object({
      organizationId: z.string().uuid(),
      name: z.string().min(1),
      capabilities: z.array(capabilitySchema),
    }),
  })
  async createCustomRole(
    @Input()
    input: {
      organizationId: string;
      name: string;
      capabilities: z.infer<typeof capabilitySchema>[];
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.createCustomRole({ ...input, userId: ctx.user.id });
  }

  @Mutation({
    input: z.object({
      projectId: z.string().uuid(),
      targetUserId: z.string().uuid(),
      capabilities: z.array(capabilitySchema),
      customRoleId: z.string().uuid().nullable().optional(),
    }),
  })
  async setProjectOverrides(
    @Input()
    input: {
      projectId: string;
      targetUserId: string;
      capabilities: z.infer<typeof capabilitySchema>[];
      customRoleId?: string | null;
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    await this.permissions.assert(ctx.user.id, input.projectId, "roles.manage");
    return this.work.setProjectOverrides({
      ...input,
      userId: ctx.user.id,
    });
  }

  @Mutation({
    input: z.object({
      issueId: z.string().uuid(),
      organizationId: z.string().uuid(),
      projectId: z.string().uuid(),
      fileName: z.string().min(1),
      contentType: z.string().min(1),
      sizeBytes: z.number().int().positive(),
      /** Base64-encoded file bytes */
      dataBase64: z.string().min(1),
    }),
  })
  async uploadAttachment(
    @Input()
    input: {
      issueId: string;
      organizationId: string;
      projectId: string;
      fileName: string;
      contentType: string;
      sizeBytes: number;
      dataBase64: string;
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    await this.permissions.assert(ctx.user.id, input.projectId, "attachments.manage");
    const data = Buffer.from(input.dataBase64, "base64");
    if (data.length !== input.sizeBytes) {
      throw new Error("SIZE_MISMATCH");
    }
    const meta = await this.storage.storeAttachment({
      issueId: input.issueId,
      uploadedById: ctx.user.id,
      fileName: input.fileName,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      data,
    });
    return { attachment: meta };
  }

  @Query({ input: z.object({ attachmentId: z.string().uuid() }) })
  async attachmentDownload(@Input() input: { attachmentId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    const row = await this.storage.getAttachment(input.attachmentId);
    if (!row) throw new Error("NOT_FOUND");
    return {
      fileName: row.fileName,
      contentType: row.contentType,
      sizeBytes: row.sizeBytes,
      dataBase64: Buffer.from(row.data).toString("base64"),
    };
  }

  @Query({ input: z.object({ organizationId: z.string().uuid() }) })
  async activity(@Input() input: { organizationId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listActivity(input.organizationId);
  }

  @Query({ input: z.object({ issueId: z.string().uuid() }) })
  async listIssueLinks(@Input() input: { issueId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listIssueLinks(input.issueId);
  }

  @Mutation({ input: z.object({ id: z.string().uuid() }) })
  async deleteIssueLink(@Input() input: { id: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.deleteIssueLink(input.id, ctx.user.id);
  }

  @Query({ input: z.object({ projectId: z.string().uuid() }) })
  async listLabels(@Input() input: { projectId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listLabels(input.projectId);
  }

  @Mutation({
    input: z.object({
      projectId: z.string().uuid(),
      name: z.string().min(1).max(64),
      color: z.string().nullable().optional(),
    }),
  })
  async createLabel(
    @Input()
    input: { projectId: string; name: string; color?: string | null },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    await this.permissions.assert(ctx.user.id, input.projectId, "issue.edit");
    return this.work.createLabel({ ...input, userId: ctx.user.id });
  }

  @Mutation({
    input: z.object({
      issueId: z.string().uuid(),
      labelIds: z.array(z.string().uuid()),
    }),
  })
  async setIssueLabels(
    @Input() input: { issueId: string; labelIds: string[] },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.setIssueLabels(input.issueId, input.labelIds);
  }

  @Query({ input: z.object({ projectId: z.string().uuid() }) })
  async listProjectMembers(@Input() input: { projectId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listProjectMembers(input.projectId);
  }

  @Query({ input: z.object({ organizationId: z.string().uuid() }) })
  async listOrgUsers(@Input() input: { organizationId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listOrgUsers(input.organizationId);
  }

  @Mutation({
    input: z.object({
      projectId: z.string().uuid(),
      userId: z.string().uuid(),
      role: projectRoleSchema,
    }),
  })
  async addProjectMember(
    @Input()
    input: {
      projectId: string;
      userId: string;
      role: z.infer<typeof projectRoleSchema>;
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    await this.permissions.assert(ctx.user.id, input.projectId, "members.manage");
    return this.work.addProjectMember({
      ...input,
      actorId: ctx.user.id,
    });
  }

  @Mutation({
    input: z.object({
      projectId: z.string().uuid(),
      userId: z.string().uuid(),
    }),
  })
  async removeProjectMember(
    @Input() input: { projectId: string; userId: string },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    await this.permissions.assert(ctx.user.id, input.projectId, "members.manage");
    return this.work.removeProjectMember({
      ...input,
      actorId: ctx.user.id,
    });
  }

  @Mutation({
    input: z.object({
      projectId: z.string().uuid(),
      name: z.string().min(1),
      category: z.enum(["todo", "in_progress", "done"]),
      color: z.string().nullable().optional(),
    }),
  })
  async createWorkflowStatus(
    @Input()
    input: {
      projectId: string;
      name: string;
      category: "todo" | "in_progress" | "done";
      color?: string | null;
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    await this.permissions.assert(ctx.user.id, input.projectId, "workflow.manage");
    return this.work.createWorkflowStatus({ ...input, userId: ctx.user.id });
  }

  @Mutation({
    input: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      category: z.enum(["todo", "in_progress", "done"]).optional(),
      color: z.string().nullable().optional(),
    }),
  })
  async updateWorkflowStatus(
    @Input()
    input: {
      id: string;
      name?: string;
      category?: "todo" | "in_progress" | "done";
      color?: string | null;
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    const { id, ...patch } = input;
    return this.work.updateWorkflowStatus(id, ctx.user.id, patch);
  }

  @Mutation({
    input: z.object({
      projectId: z.string().uuid(),
      orderedIds: z.array(z.string().uuid()),
    }),
  })
  async reorderWorkflowStatuses(
    @Input() input: { projectId: string; orderedIds: string[] },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    await this.permissions.assert(ctx.user.id, input.projectId, "workflow.manage");
    return this.work.reorderWorkflowStatuses(input.projectId, input.orderedIds, ctx.user.id);
  }

  @Mutation({ input: z.object({ id: z.string().uuid() }) })
  async softDeleteWorkflowStatus(@Input() input: { id: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.softDeleteWorkflowStatus(input.id, ctx.user.id);
  }

  @Mutation({
    input: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      key: z.string().min(2).max(16).optional(),
      description: z.string().nullable().optional(),
    }),
  })
  async updateProject(
    @Input()
    input: {
      id: string;
      name?: string;
      key?: string;
      description?: string | null;
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    await this.permissions.assert(ctx.user.id, input.id, "project.edit");
    const { id, ...patch } = input;
    return this.work.updateProject(id, ctx.user.id, patch);
  }

  @Query({ input: z.object({ projectId: z.string().uuid() }) })
  async listSavedFilters(@Input() input: { projectId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listSavedFilters(input.projectId);
  }

  @Query({ input: z.object({ filterId: z.string().uuid() }) })
  async applySavedFilter(@Input() input: { filterId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.applySavedFilter(input.filterId);
  }

  @Mutation({ input: z.object({ id: z.string().uuid() }) })
  async deleteSavedFilter(@Input() input: { id: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.deleteSavedFilter(input.id, ctx.user.id);
  }

  @Query({
    input: z.object({
      q: z.string().optional(),
      projectId: z.string().uuid().optional(),
      statusId: z.string().uuid().optional(),
      type: z.string().optional(),
      assigneeId: z.string().uuid().nullable().optional(),
      labelId: z.string().uuid().optional(),
    }),
  })
  async searchIssues(
    @Input()
    input: {
      q?: string;
      projectId?: string;
      statusId?: string;
      type?: string;
      assigneeId?: string | null;
      labelId?: string;
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.searchIssues(input);
  }

  @Query({ input: z.object({ projectId: z.string().uuid() }) })
  async epicIssueCounts(@Input() input: { projectId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.epicIssueCounts(input.projectId);
  }

  @Mutation({
    input: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      initiativeId: z.string().uuid().nullable().optional(),
      statusId: z.string().uuid().nullable().optional(),
      startDate: z.coerce.date().nullable().optional(),
      targetDate: z.coerce.date().nullable().optional(),
    }),
  })
  async updateEpic(
    @Input()
    input: {
      id: string;
      name?: string;
      description?: string | null;
      initiativeId?: string | null;
      statusId?: string | null;
      startDate?: Date | null;
      targetDate?: Date | null;
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    const { id, ...patch } = input;
    return this.work.updateEpic(id, ctx.user.id, patch);
  }

  @Query({ input: z.object({ projectId: z.string().uuid() }) })
  async listComponents(@Input() input: { projectId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listComponents(input.projectId);
  }

  @Mutation({
    input: z.object({
      projectId: z.string().uuid(),
      name: z.string().min(1),
      description: z.string().nullable().optional(),
      leadUserId: z.string().uuid().nullable().optional(),
    }),
  })
  async createComponent(
    @Input()
    input: {
      projectId: string;
      name: string;
      description?: string | null;
      leadUserId?: string | null;
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.createComponent({ ...input, userId: ctx.user.id });
  }

  @Mutation({
    input: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      leadUserId: z.string().uuid().nullable().optional(),
    }),
  })
  async updateComponent(
    @Input()
    input: {
      id: string;
      name?: string;
      description?: string | null;
      leadUserId?: string | null;
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    const { id, ...patch } = input;
    return this.work.updateComponent(id, ctx.user.id, patch);
  }

  @Mutation({
    input: z.object({
      issueId: z.string().uuid(),
      componentIds: z.array(z.string().uuid()),
    }),
  })
  async setIssueComponents(
    @Input() input: { issueId: string; componentIds: string[] },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.setIssueComponents(input.issueId, input.componentIds);
  }

  @Query({ input: z.object({ projectId: z.string().uuid() }) })
  async listProjectVersions(@Input() input: { projectId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listProjectVersions(input.projectId);
  }

  @Mutation({
    input: z.object({
      projectId: z.string().uuid(),
      name: z.string().min(1),
      description: z.string().nullable().optional(),
      releaseDate: z.coerce.date().nullable().optional(),
      startDate: z.coerce.date().nullable().optional(),
    }),
  })
  async createProjectVersion(
    @Input()
    input: {
      projectId: string;
      name: string;
      description?: string | null;
      releaseDate?: Date | null;
      startDate?: Date | null;
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.createProjectVersion({ ...input, userId: ctx.user.id });
  }

  @Mutation({
    input: z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      releaseDate: z.coerce.date().nullable().optional(),
      startDate: z.coerce.date().nullable().optional(),
      released: z.boolean().optional(),
      archived: z.boolean().optional(),
    }),
  })
  async updateProjectVersion(
    @Input()
    input: {
      id: string;
      name?: string;
      description?: string | null;
      releaseDate?: Date | null;
      startDate?: Date | null;
      released?: boolean;
      archived?: boolean;
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    const { id, ...patch } = input;
    return this.work.updateProjectVersion(id, ctx.user.id, patch);
  }

  @Query({ input: z.object({ projectId: z.string().uuid() }) })
  async listIssueTemplates(@Input() input: { projectId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listIssueTemplates(input.projectId);
  }

  @Mutation({
    input: z.object({
      projectId: z.string().uuid(),
      name: z.string().min(1),
      description: z.string().nullable().optional(),
      defaults: z.record(z.string(), z.unknown()),
    }),
  })
  async createIssueTemplate(
    @Input()
    input: {
      projectId: string;
      name: string;
      description?: string | null;
      defaults: Record<string, unknown>;
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.createIssueTemplate({ ...input, userId: ctx.user.id });
  }

  @Mutation({ input: z.object({ id: z.string().uuid() }) })
  async deleteIssueTemplate(@Input() input: { id: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.deleteIssueTemplate(input.id, ctx.user.id);
  }

  @Mutation({
    input: z.object({
      ids: z.array(z.string().uuid()).min(1).max(100),
      patch: z.object({
        statusId: z.string().uuid().optional(),
        assigneeId: z.string().uuid().nullable().optional(),
        sprintId: z.string().uuid().nullable().optional(),
        priority: z.enum(["highest", "high", "medium", "low", "lowest"]).optional(),
        epicId: z.string().uuid().nullable().optional(),
        fixVersionId: z.string().uuid().nullable().optional(),
        labelIds: z.array(z.string().uuid()).optional(),
        componentIds: z.array(z.string().uuid()).optional(),
      }),
    }),
  })
  async bulkUpdateIssues(
    @Input()
    input: {
      ids: string[];
      patch: Record<string, unknown>;
    },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.bulkUpdateIssues({
      ids: input.ids,
      patch: input.patch,
      userId: ctx.user.id,
    });
  }

  @Query({ input: z.object({ projectId: z.string().uuid() }) })
  async listDashboards(@Input() input: { projectId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listDashboards(input.projectId);
  }

  @Mutation({
    input: z.object({
      projectId: z.string().uuid(),
      name: z.string().min(1),
    }),
  })
  async createDashboard(
    @Input() input: { projectId: string; name: string },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.createDashboard({
      projectId: input.projectId,
      name: input.name,
      ownerId: ctx.user.id,
    });
  }

  @Query({ input: z.object({ dashboardId: z.string().uuid() }) })
  async listDashboardGadgets(@Input() input: { dashboardId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listDashboardGadgets(input.dashboardId);
  }

  @Query({
    input: z.object({
      projectId: z.string().uuid(),
      type: z.string(),
      organizationId: z.string().uuid().optional(),
    }),
  })
  async gadgetData(
    @Input()
    input: { projectId: string; type: string; organizationId?: string },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.gadgetData(input);
  }

  @Query({ input: z.object({ projectId: z.string().uuid() }) })
  async roadmapData(@Input() input: { projectId: string }, @TrpcContext() ctx: Ctx) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.roadmapData(input.projectId);
  }
}
