import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull } from "drizzle-orm";
import {
  projects,
  workflowStatuses,
  issues,
  epics,
  initiatives,
  sprints,
  comments,
  issueLinks,
  auditEvents,
  projectMemberships,
  savedFilters,
  attachments,
  notifications,
  customRoles,
  projectPermissionOverrides,
  type HydroxDb,
} from "@hydrox/db";
import { DEFAULT_WORKFLOW_STATUSES, formatIssueKey, rankBetween } from "@hydrox/domain";
import { DB } from "../db/db.module.js";
import { SyncBusService } from "../redis/sync-bus.service.js";
import type { SyncPatchEvent } from "@hydrox/contracts";

@Injectable()
export class WorkService {
  constructor(
    @Inject(DB) private readonly db: HydroxDb,
    private readonly bus: SyncBusService,
  ) {}

  async createProject(input: {
    workspaceId: string;
    organizationId: string;
    name: string;
    key: string;
    userId: string;
    description?: string | null;
  }) {
    const id = crypto.randomUUID();
    await this.db.insert(projects).values({
      id,
      workspaceId: input.workspaceId,
      organizationId: input.organizationId,
      name: input.name,
      key: input.key.toUpperCase(),
      description: input.description ?? null,
      updatedById: input.userId,
    });
    await this.db.insert(projectMemberships).values({
      projectId: id,
      userId: input.userId,
      role: "admin",
    });
    for (const status of DEFAULT_WORKFLOW_STATUSES) {
      await this.db.insert(workflowStatuses).values({
        projectId: id,
        name: status.name,
        category: status.category,
        position: status.position,
        color: status.color,
        updatedById: input.userId,
      });
    }
    await this.audit(input.organizationId, input.userId, "project.create", "project", id);
    return this.getProject(id);
  }

  async getProject(id: string) {
    const [row] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async listProjects(workspaceId: string) {
    return this.db
      .select()
      .from(projects)
      .where(
        and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)),
      );
  }

  async listStatuses(projectId: string) {
    return this.db
      .select()
      .from(workflowStatuses)
      .where(
        and(
          eq(workflowStatuses.projectId, projectId),
          isNull(workflowStatuses.deletedAt),
        ),
      )
      .orderBy(asc(workflowStatuses.position));
  }

  async createInitiative(input: {
    organizationId: string;
    projectId?: string | null;
    scope: "organization" | "project";
    name: string;
    description?: string | null;
    userId: string;
  }) {
    const id = crypto.randomUUID();
    await this.db.insert(initiatives).values({
      id,
      organizationId: input.organizationId,
      projectId: input.scope === "project" ? input.projectId ?? null : null,
      scope: input.scope,
      name: input.name,
      description: input.description ?? null,
      updatedById: input.userId,
    });
    await this.audit(
      input.organizationId,
      input.userId,
      "initiative.create",
      "initiative",
      id,
    );
    const [row] = await this.db
      .select()
      .from(initiatives)
      .where(eq(initiatives.id, id))
      .limit(1);
    return row!;
  }

  async createEpic(input: {
    projectId: string;
    initiativeId?: string | null;
    name: string;
    description?: string | null;
    userId: string;
  }) {
    const project = await this.getProject(input.projectId);
    if (!project) throw new Error("Project not found");
    const id = crypto.randomUUID();
    await this.db.insert(epics).values({
      id,
      projectId: input.projectId,
      initiativeId: input.initiativeId ?? null,
      name: input.name,
      description: input.description ?? null,
      updatedById: input.userId,
    });
    await this.audit(
      project.organizationId,
      input.userId,
      "epic.create",
      "epic",
      id,
    );
    const [row] = await this.db.select().from(epics).where(eq(epics.id, id)).limit(1);
    await this.publishPatch({
      type: "entity.patch",
      entityType: "epic",
      entityId: id,
      version: 1,
      fields: row as unknown as Record<string, unknown>,
      updatedAt: new Date(),
      updatedById: input.userId,
    });
    return row!;
  }

  async createIssue(input: {
    projectId: string;
    type: string;
    title: string;
    description?: string | null;
    epicId?: string | null;
    parentIssueId?: string | null;
    statusId?: string;
    assigneeId?: string | null;
    sprintId?: string | null;
    storyPoints?: number | null;
    userId: string;
  }) {
    const project = await this.getProject(input.projectId);
    if (!project) throw new Error("Project not found");
    const statuses = await this.listStatuses(input.projectId);
    const statusId = input.statusId ?? statuses[0]?.id;
    if (!statusId) throw new Error("No workflow statuses");

    const next = project.issueCounter + 1;
    const key = formatIssueKey(project.key, next);
    const id = crypto.randomUUID();

    await this.db
      .update(projects)
      .set({ issueCounter: next, version: project.version + 1 })
      .where(eq(projects.id, project.id));

    const existing = await this.db
      .select({ backlogRank: issues.backlogRank })
      .from(issues)
      .where(and(eq(issues.projectId, input.projectId), isNull(issues.deletedAt)))
      .orderBy(asc(issues.backlogRank))
      .limit(1);
    const backlogRank = rankBetween(null, existing[0]?.backlogRank ?? null);

    await this.db.insert(issues).values({
      id,
      projectId: input.projectId,
      epicId: input.epicId ?? null,
      parentIssueId: input.parentIssueId ?? null,
      key,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      statusId,
      assigneeId: input.assigneeId ?? null,
      reporterId: input.userId,
      sprintId: input.sprintId ?? null,
      backlogRank,
      storyPoints: input.storyPoints ?? null,
      updatedById: input.userId,
    });

    await this.audit(
      project.organizationId,
      input.userId,
      "issue.create",
      "issue",
      id,
    );

    const [row] = await this.db.select().from(issues).where(eq(issues.id, id)).limit(1);
    await this.publishPatch({
      type: "entity.patch",
      entityType: "issue",
      entityId: id,
      version: 1,
      fields: row as unknown as Record<string, unknown>,
      updatedAt: new Date(),
      updatedById: input.userId,
    });
    return row!;
  }

  async updateIssue(input: {
    id: string;
    baseVersion: number;
    userId: string;
    patch: Record<string, unknown>;
  }) {
    const [current] = await this.db
      .select()
      .from(issues)
      .where(and(eq(issues.id, input.id), isNull(issues.deletedAt)))
      .limit(1);
    if (!current) throw new Error("Issue not found");
    if (current.version !== input.baseVersion) {
      return { conflict: true as const, current };
    }
    const nextVersion = current.version + 1;
    await this.db
      .update(issues)
      .set({
        ...input.patch,
        version: nextVersion,
        updatedAt: new Date(),
        updatedById: input.userId,
      })
      .where(eq(issues.id, input.id));
    const [row] = await this.db.select().from(issues).where(eq(issues.id, input.id)).limit(1);
    await this.publishPatch({
      type: "entity.patch",
      entityType: "issue",
      entityId: input.id,
      version: nextVersion,
      fields: row as unknown as Record<string, unknown>,
      updatedAt: new Date(),
      updatedById: input.userId,
    });
    return { conflict: false as const, issue: row! };
  }

  async softDeleteIssue(id: string, userId: string) {
    const [current] = await this.db
      .select()
      .from(issues)
      .where(eq(issues.id, id))
      .limit(1);
    if (!current) throw new Error("Issue not found");
    await this.db
      .update(issues)
      .set({
        deletedAt: new Date(),
        deletedById: userId,
        version: current.version + 1,
        updatedById: userId,
      })
      .where(eq(issues.id, id));
    await this.publishPatch({
      type: "entity.patch",
      entityType: "issue",
      entityId: id,
      version: current.version + 1,
      fields: {},
      deletedAt: new Date(),
      updatedAt: new Date(),
      updatedById: userId,
    });
    return { ok: true as const };
  }

  async listIssues(projectId: string) {
    return this.db
      .select()
      .from(issues)
      .where(and(eq(issues.projectId, projectId), isNull(issues.deletedAt)))
      .orderBy(asc(issues.backlogRank));
  }

  async createSprint(input: {
    projectId: string;
    name: string;
    goal?: string | null;
    userId: string;
  }) {
    const project = await this.getProject(input.projectId);
    if (!project) throw new Error("Project not found");
    const id = crypto.randomUUID();
    await this.db.insert(sprints).values({
      id,
      projectId: input.projectId,
      name: input.name,
      goal: input.goal ?? null,
      state: "future",
      updatedById: input.userId,
    });
    const [row] = await this.db.select().from(sprints).where(eq(sprints.id, id)).limit(1);
    return row!;
  }

  async startSprint(id: string, userId: string) {
    await this.db
      .update(sprints)
      .set({
        state: "active",
        startDate: new Date(),
        updatedById: userId,
        updatedAt: new Date(),
      })
      .where(eq(sprints.id, id));
    const [row] = await this.db.select().from(sprints).where(eq(sprints.id, id)).limit(1);
    return row!;
  }

  async completeSprint(id: string, userId: string) {
    await this.db
      .update(sprints)
      .set({
        state: "closed",
        endDate: new Date(),
        updatedById: userId,
        updatedAt: new Date(),
      })
      .where(eq(sprints.id, id));
    // Move unfinished issues back to backlog
    const statuses = await this.db.select().from(workflowStatuses);
    const doneIds = new Set(
      statuses.filter((s) => s.category === "done").map((s) => s.id),
    );
    const sprintIssues = await this.db
      .select()
      .from(issues)
      .where(and(eq(issues.sprintId, id), isNull(issues.deletedAt)));
    for (const issue of sprintIssues) {
      if (!doneIds.has(issue.statusId)) {
        await this.db
          .update(issues)
          .set({ sprintId: null, updatedById: userId, updatedAt: new Date() })
          .where(eq(issues.id, issue.id));
      }
    }
    const [row] = await this.db.select().from(sprints).where(eq(sprints.id, id)).limit(1);
    return row!;
  }

  async listSprints(projectId: string) {
    return this.db
      .select()
      .from(sprints)
      .where(and(eq(sprints.projectId, projectId), isNull(sprints.deletedAt)));
  }

  async addComment(input: {
    issueId: string;
    body: string;
    userId: string;
  }) {
    const id = crypto.randomUUID();
    await this.db.insert(comments).values({
      id,
      issueId: input.issueId,
      authorId: input.userId,
      body: input.body,
      updatedById: input.userId,
    });
    const [row] = await this.db.select().from(comments).where(eq(comments.id, id)).limit(1);
    await this.publishPatch({
      type: "entity.patch",
      entityType: "comment",
      entityId: id,
      version: 1,
      fields: row as unknown as Record<string, unknown>,
      updatedAt: new Date(),
      updatedById: input.userId,
    });
    return row!;
  }

  async linkIssues(input: {
    sourceIssueId: string;
    targetIssueId: string;
    linkType: string;
    userId: string;
  }) {
    const id = crypto.randomUUID();
    await this.db.insert(issueLinks).values({
      id,
      sourceIssueId: input.sourceIssueId,
      targetIssueId: input.targetIssueId,
      linkType: input.linkType,
      updatedById: input.userId,
    });
    const [row] = await this.db
      .select()
      .from(issueLinks)
      .where(eq(issueLinks.id, id))
      .limit(1);
    return row!;
  }

  async saveFilter(input: {
    projectId: string;
    ownerId: string;
    name: string;
    query: Record<string, unknown>;
  }) {
    const id = crypto.randomUUID();
    await this.db.insert(savedFilters).values({
      id,
      projectId: input.projectId,
      ownerId: input.ownerId,
      name: input.name,
      query: input.query,
      updatedById: input.ownerId,
    });
    const [row] = await this.db
      .select()
      .from(savedFilters)
      .where(eq(savedFilters.id, id))
      .limit(1);
    return row!;
  }

  async createCustomRole(input: {
    organizationId: string;
    name: string;
    capabilities: string[];
    userId: string;
  }) {
    const id = crypto.randomUUID();
    await this.db.insert(customRoles).values({
      id,
      organizationId: input.organizationId,
      name: input.name,
      capabilities: input.capabilities,
      updatedById: input.userId,
    });
    const [row] = await this.db
      .select()
      .from(customRoles)
      .where(eq(customRoles.id, id))
      .limit(1);
    return row!;
  }

  async setProjectOverrides(input: {
    projectId: string;
    userId: string;
    targetUserId: string;
    capabilities: string[];
    customRoleId?: string | null;
  }) {
    const existing = await this.db
      .select()
      .from(projectPermissionOverrides)
      .where(
        and(
          eq(projectPermissionOverrides.projectId, input.projectId),
          eq(projectPermissionOverrides.userId, input.targetUserId),
        ),
      )
      .limit(1);
    if (existing[0]) {
      await this.db
        .update(projectPermissionOverrides)
        .set({
          capabilities: input.capabilities,
          customRoleId: input.customRoleId ?? null,
        })
        .where(eq(projectPermissionOverrides.id, existing[0].id));
    } else {
      await this.db.insert(projectPermissionOverrides).values({
        projectId: input.projectId,
        userId: input.targetUserId,
        capabilities: input.capabilities,
        customRoleId: input.customRoleId ?? null,
      });
    }
    return { ok: true as const };
  }

  async createAttachmentMeta(input: {
    issueId: string;
    uploadedById: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    s3Key: string;
  }) {
    const id = crypto.randomUUID();
    await this.db.insert(attachments).values({
      id,
      ...input,
      updatedById: input.uploadedById,
    });
    const [row] = await this.db
      .select()
      .from(attachments)
      .where(eq(attachments.id, id))
      .limit(1);
    return row!;
  }

  async createNotification(input: {
    userId: string;
    organizationId: string;
    type: string;
    title: string;
    body?: string | null;
    entityType?: string | null;
    entityId?: string | null;
  }) {
    const id = crypto.randomUUID();
    await this.db.insert(notifications).values({
      id,
      userId: input.userId,
      organizationId: input.organizationId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    });
    return { id };
  }

  async listNotifications(userId: string) {
    return this.db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.deletedAt)),
      );
  }

  async listActivity(organizationId: string) {
    return this.db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.organizationId, organizationId))
      .orderBy(asc(auditEvents.createdAt));
  }

  async listEpics(projectId: string) {
    return this.db
      .select()
      .from(epics)
      .where(and(eq(epics.projectId, projectId), isNull(epics.deletedAt)));
  }

  async listInitiatives(organizationId: string) {
    return this.db
      .select()
      .from(initiatives)
      .where(
        and(
          eq(initiatives.organizationId, organizationId),
          isNull(initiatives.deletedAt),
        ),
      );
  }

  private async audit(
    organizationId: string,
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
  ) {
    await this.db.insert(auditEvents).values({
      organizationId,
      actorId,
      action,
      entityType,
      entityId,
    });
  }

  private async publishPatch(event: SyncPatchEvent) {
    await this.bus.publish(event);
  }
}
