import { Inject, Injectable } from "@nestjs/common";
import { Input, Mutation, Query, Router, TrpcContext } from "@nest-native/trpc";
import { z } from "zod";
import {
  createIssueInputSchema,
  issueLinkTypeSchema,
  capabilitySchema,
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
  async workspaces(
    @Input() input: { organizationId: string },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.db
      .select()
      .from(workspaces)
      .where(
        and(
          eq(workspaces.organizationId, input.organizationId),
          isNull(workspaces.deletedAt),
        ),
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
  async projects(
    @Input() input: { workspaceId: string },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listProjects(input.workspaceId);
  }

  @Query({ input: z.object({ projectId: z.string().uuid() }) })
  async statuses(
    @Input() input: { projectId: string },
    @TrpcContext() ctx: Ctx,
  ) {
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
  async initiatives(
    @Input() input: { organizationId: string },
    @TrpcContext() ctx: Ctx,
  ) {
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

  @Mutation({
    input: z.object({
      id: z.string().uuid(),
      baseVersion: z.number().int().positive(),
      title: z.string().optional(),
      description: z.string().nullable().optional(),
      statusId: z.string().uuid().optional(),
      assigneeId: z.string().uuid().nullable().optional(),
      sprintId: z.string().uuid().nullable().optional(),
      backlogRank: z.string().optional(),
      storyPoints: z.number().nullable().optional(),
    }),
  })
  async updateIssue(
    @Input()
    input: {
      id: string;
      baseVersion: number;
      title?: string;
      description?: string | null;
      statusId?: string;
      assigneeId?: string | null;
      sprintId?: string | null;
      backlogRank?: string;
      storyPoints?: number | null;
    },
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

  @Mutation({ input: z.object({ id: z.string().uuid() }) })
  async completeSprint(
    @Input() input: { id: string },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.completeSprint(input.id, ctx.user.id);
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
  async addComment(
    @Input() input: { issueId: string; body: string },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.addComment({ ...input, userId: ctx.user.id });
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
    await this.permissions.assert(
      ctx.user.id,
      input.projectId,
      "attachments.manage",
    );
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
  async attachmentDownload(
    @Input() input: { attachmentId: string },
    @TrpcContext() ctx: Ctx,
  ) {
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
  async activity(
    @Input() input: { organizationId: string },
    @TrpcContext() ctx: Ctx,
  ) {
    if (!ctx.user) throw new Error("UNAUTHORIZED");
    return this.work.listActivity(input.organizationId);
  }
}
