import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, isNull, like, or, sql } from "drizzle-orm";
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
  labels,
  issueLabels,
  users,
  organizationMemberships,
  components,
  issueComponents,
  projectVersions,
  issueTemplates,
  dashboards,
  dashboardGadgets,
  type HydroxDb,
} from "@hydrox/db";
import { DEFAULT_WORKFLOW_STATUSES, formatIssueKey, rankBetween } from "@hydrox/domain";
import { DB } from "../db/db.module.js";
import { SyncBusService } from "../sync/sync-bus.service.js";
import type { SyncPatchEvent } from "@hydrox/contracts";

@Injectable()
export class WorkService {
  constructor(
    @Inject(DB) private readonly db: HydroxDb,
    @Inject(SyncBusService) private readonly bus: SyncBusService,
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
      .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)));
  }

  async listStatuses(projectId: string) {
    return this.db
      .select()
      .from(workflowStatuses)
      .where(and(eq(workflowStatuses.projectId, projectId), isNull(workflowStatuses.deletedAt)))
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
      projectId: input.scope === "project" ? (input.projectId ?? null) : null,
      scope: input.scope,
      name: input.name,
      description: input.description ?? null,
      updatedById: input.userId,
    });
    await this.audit(input.organizationId, input.userId, "initiative.create", "initiative", id);
    const [row] = await this.db.select().from(initiatives).where(eq(initiatives.id, id)).limit(1);
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
    await this.audit(project.organizationId, input.userId, "epic.create", "epic", id);
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
    id?: string;
    projectId: string;
    type: string;
    title: string;
    description?: string | null;
    epicId?: string | null;
    parentIssueId?: string | null;
    statusId?: string;
    assigneeId?: string | null;
    sprintId?: string | null;
    priority?: string;
    storyPoints?: number | null;
    backlogRank?: string | null;
    dueDate?: Date | null;
    originalEstimateMinutes?: number | null;
    remainingEstimateMinutes?: number | null;
    fixVersionId?: string | null;
    labelIds?: string[];
    componentIds?: string[];
    templateId?: string;
    userId: string;
  }) {
    let defaults: Record<string, unknown> = {};
    if (input.templateId) {
      const [tpl] = await this.db
        .select()
        .from(issueTemplates)
        .where(and(eq(issueTemplates.id, input.templateId), isNull(issueTemplates.deletedAt)))
        .limit(1);
      if (tpl) defaults = tpl.defaults ?? {};
    }
    const merged = {
      type: input.type ?? (defaults.type as string) ?? "task",
      title: input.title ?? (defaults.title as string) ?? "Untitled",
      description:
        input.description !== undefined
          ? input.description
          : ((defaults.description as string | null) ?? null),
      epicId:
        input.epicId !== undefined ? input.epicId : ((defaults.epicId as string | null) ?? null),
      parentIssueId: input.parentIssueId ?? null,
      statusId: input.statusId ?? (defaults.statusId as string | undefined),
      assigneeId:
        input.assigneeId !== undefined
          ? input.assigneeId
          : ((defaults.assigneeId as string | null) ?? null),
      sprintId: input.sprintId ?? null,
      priority: input.priority ?? (defaults.priority as string | undefined) ?? "medium",
      storyPoints:
        input.storyPoints !== undefined
          ? input.storyPoints
          : ((defaults.storyPoints as number | null) ?? null),
      dueDate:
        input.dueDate !== undefined
          ? input.dueDate
          : defaults.dueDate
            ? new Date(String(defaults.dueDate))
            : null,
      originalEstimateMinutes:
        input.originalEstimateMinutes !== undefined
          ? input.originalEstimateMinutes
          : ((defaults.originalEstimateMinutes as number | null) ?? null),
      remainingEstimateMinutes:
        input.remainingEstimateMinutes !== undefined
          ? input.remainingEstimateMinutes
          : ((defaults.remainingEstimateMinutes as number | null) ?? null),
      fixVersionId:
        input.fixVersionId !== undefined
          ? input.fixVersionId
          : ((defaults.fixVersionId as string | null) ?? null),
      labelIds:
        input.labelIds ?? (Array.isArray(defaults.labelIds) ? (defaults.labelIds as string[]) : []),
      componentIds:
        input.componentIds ??
        (Array.isArray(defaults.componentIds) ? (defaults.componentIds as string[]) : []),
    };

    const project = await this.getProject(input.projectId);
    if (!project) throw new Error("Project not found");
    const statuses = await this.listStatuses(input.projectId);
    const statusId = merged.statusId ?? statuses[0]?.id;
    if (!statusId) throw new Error("No workflow statuses");

    const next = project.issueCounter + 1;
    const key = formatIssueKey(project.key, next);
    const id = input.id ?? crypto.randomUUID();

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
    const backlogRank = input.backlogRank ?? rankBetween(null, existing[0]?.backlogRank ?? null);

    await this.db.insert(issues).values({
      id,
      projectId: input.projectId,
      epicId: merged.epicId,
      parentIssueId: merged.parentIssueId,
      key,
      type: merged.type,
      title: merged.title,
      description: merged.description,
      statusId,
      assigneeId: merged.assigneeId,
      reporterId: input.userId,
      sprintId: merged.sprintId,
      priority: merged.priority,
      backlogRank,
      storyPoints: merged.storyPoints,
      dueDate: merged.dueDate,
      originalEstimateMinutes: merged.originalEstimateMinutes,
      remainingEstimateMinutes: merged.remainingEstimateMinutes,
      fixVersionId: merged.fixVersionId,
      updatedById: input.userId,
    });

    if (merged.labelIds.length) {
      await this.setIssueLabels(id, merged.labelIds);
    }
    if (merged.componentIds.length) {
      await this.setIssueComponents(id, merged.componentIds);
    }

    await this.audit(project.organizationId, input.userId, "issue.create", "issue", id, {
      key,
      title: merged.title,
    });

    const [row] = await this.db.select().from(issues).where(eq(issues.id, id)).limit(1);
    const labelIds = await this.listIssueLabelIds(id);
    const componentIds = await this.listIssueComponentIds(id);
    await this.publishPatch({
      type: "entity.patch",
      entityType: "issue",
      entityId: id,
      version: row!.version,
      fields: this.issuePatchFields(row!, labelIds, componentIds),
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
    const { labelIds, componentIds, ...columnPatch } = input.patch as Record<string, unknown> & {
      labelIds?: string[];
      componentIds?: string[];
    };
    const nextVersion = current.version + 1;
    await this.db
      .update(issues)
      .set({
        ...columnPatch,
        version: nextVersion,
        updatedAt: new Date(),
        updatedById: input.userId,
      })
      .where(eq(issues.id, input.id));
    if (Array.isArray(labelIds)) {
      await this.setIssueLabels(input.id, labelIds);
    }
    if (Array.isArray(componentIds)) {
      await this.setIssueComponents(input.id, componentIds);
    }
    const [row] = await this.db.select().from(issues).where(eq(issues.id, input.id)).limit(1);
    const ids = await this.listIssueLabelIds(input.id);
    const cids = await this.listIssueComponentIds(input.id);
    await this.publishPatch({
      type: "entity.patch",
      entityType: "issue",
      entityId: input.id,
      version: nextVersion,
      fields: this.issuePatchFields(row!, ids, cids),
      updatedAt: new Date(),
      updatedById: input.userId,
    });
    return { conflict: false as const, issue: row! };
  }

  async softDeleteIssue(id: string, userId: string) {
    const [current] = await this.db.select().from(issues).where(eq(issues.id, id)).limit(1);
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

  async completeSprint(
    id: string,
    userId: string,
    opts?: { moveIncompleteToSprintId?: string | null },
  ) {
    await this.db
      .update(sprints)
      .set({
        state: "closed",
        endDate: new Date(),
        updatedById: userId,
        updatedAt: new Date(),
      })
      .where(eq(sprints.id, id));
    const statuses = await this.db.select().from(workflowStatuses);
    const doneIds = new Set(statuses.filter((s) => s.category === "done").map((s) => s.id));
    const sprintIssues = await this.db
      .select()
      .from(issues)
      .where(and(eq(issues.sprintId, id), isNull(issues.deletedAt)));
    const moveTo =
      opts && "moveIncompleteToSprintId" in (opts ?? {}) ? opts!.moveIncompleteToSprintId : null;
    for (const issue of sprintIssues) {
      if (!doneIds.has(issue.statusId)) {
        await this.db
          .update(issues)
          .set({
            sprintId: moveTo ?? null,
            updatedById: userId,
            updatedAt: new Date(),
          })
          .where(eq(issues.id, issue.id));
      }
    }
    const [row] = await this.db.select().from(sprints).where(eq(sprints.id, id)).limit(1);
    return row!;
  }

  async updateSprint(
    id: string,
    userId: string,
    patch: {
      name?: string;
      goal?: string | null;
      startDate?: Date | null;
      endDate?: Date | null;
    },
  ) {
    await this.db
      .update(sprints)
      .set({ ...patch, updatedById: userId, updatedAt: new Date() })
      .where(eq(sprints.id, id));
    const [row] = await this.db.select().from(sprints).where(eq(sprints.id, id)).limit(1);
    return row!;
  }

  async listSprints(projectId: string) {
    return this.db
      .select()
      .from(sprints)
      .where(and(eq(sprints.projectId, projectId), isNull(sprints.deletedAt)));
  }

  async addComment(input: { issueId: string; body: string; userId: string }) {
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

  async listComments(issueId: string) {
    return this.db
      .select({
        id: comments.id,
        issueId: comments.issueId,
        authorId: comments.authorId,
        body: comments.body,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      })
      .from(comments)
      .where(and(eq(comments.issueId, issueId), isNull(comments.deletedAt)))
      .orderBy(asc(comments.createdAt));
  }

  async listAttachmentsMeta(issueId: string) {
    return this.db
      .select({
        id: attachments.id,
        issueId: attachments.issueId,
        fileName: attachments.fileName,
        contentType: attachments.contentType,
        sizeBytes: attachments.sizeBytes,
        uploadedById: attachments.uploadedById,
        createdAt: attachments.createdAt,
      })
      .from(attachments)
      .where(and(eq(attachments.issueId, issueId), isNull(attachments.deletedAt)));
  }

  async listCustomRoles(organizationId: string) {
    return this.db
      .select()
      .from(customRoles)
      .where(and(eq(customRoles.organizationId, organizationId), isNull(customRoles.deletedAt)));
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
    const [row] = await this.db.select().from(issueLinks).where(eq(issueLinks.id, id)).limit(1);
    return row!;
  }

  async listIssueLinks(issueId: string) {
    return this.db
      .select()
      .from(issueLinks)
      .where(
        and(
          isNull(issueLinks.deletedAt),
          or(eq(issueLinks.sourceIssueId, issueId), eq(issueLinks.targetIssueId, issueId)),
        ),
      );
  }

  async deleteIssueLink(id: string, userId: string) {
    await this.db
      .update(issueLinks)
      .set({
        deletedAt: new Date(),
        deletedById: userId,
        updatedById: userId,
        updatedAt: new Date(),
      })
      .where(eq(issueLinks.id, id));
    return { ok: true as const };
  }

  async listLabels(projectId: string) {
    return this.db
      .select()
      .from(labels)
      .where(and(eq(labels.projectId, projectId), isNull(labels.deletedAt)))
      .orderBy(asc(labels.name));
  }

  async createLabel(input: {
    projectId: string;
    name: string;
    color?: string | null;
    userId: string;
  }) {
    const id = crypto.randomUUID();
    await this.db.insert(labels).values({
      id,
      projectId: input.projectId,
      name: input.name.trim(),
      color: input.color ?? null,
      updatedById: input.userId,
    });
    const [row] = await this.db.select().from(labels).where(eq(labels.id, id)).limit(1);
    return row!;
  }

  async listIssueLabelIds(issueId: string): Promise<string[]> {
    const rows = await this.db
      .select({ labelId: issueLabels.labelId })
      .from(issueLabels)
      .where(eq(issueLabels.issueId, issueId));
    return rows.map((r) => r.labelId);
  }

  async setIssueLabels(issueId: string, labelIds: string[]) {
    await this.db.delete(issueLabels).where(eq(issueLabels.issueId, issueId));
    for (const labelId of labelIds) {
      await this.db.insert(issueLabels).values({
        id: crypto.randomUUID(),
        issueId,
        labelId,
      });
    }
    return this.listIssueLabelIds(issueId);
  }

  async listProjectMembers(projectId: string) {
    const memberships = await this.db
      .select()
      .from(projectMemberships)
      .where(
        and(eq(projectMemberships.projectId, projectId), isNull(projectMemberships.deletedAt)),
      );
    const out = [];
    for (const m of memberships) {
      const [user] = await this.db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, m.userId))
        .limit(1);
      if (user) out.push({ ...m, user });
    }
    return out;
  }

  async addProjectMember(input: {
    projectId: string;
    userId: string;
    role: "admin" | "member" | "viewer";
    actorId: string;
  }) {
    const existing = await this.db
      .select()
      .from(projectMemberships)
      .where(
        and(
          eq(projectMemberships.projectId, input.projectId),
          eq(projectMemberships.userId, input.userId),
        ),
      )
      .limit(1);
    if (existing[0] && !existing[0].deletedAt) {
      await this.db
        .update(projectMemberships)
        .set({ role: input.role })
        .where(eq(projectMemberships.id, existing[0].id));
    } else if (existing[0]) {
      await this.db
        .update(projectMemberships)
        .set({
          role: input.role,
          deletedAt: null,
          deletedById: null,
        })
        .where(eq(projectMemberships.id, existing[0].id));
    } else {
      await this.db.insert(projectMemberships).values({
        projectId: input.projectId,
        userId: input.userId,
        role: input.role,
      });
    }
    return this.listProjectMembers(input.projectId);
  }

  async removeProjectMember(input: { projectId: string; userId: string; actorId: string }) {
    await this.db
      .update(projectMemberships)
      .set({
        deletedAt: new Date(),
        deletedById: input.actorId,
      })
      .where(
        and(
          eq(projectMemberships.projectId, input.projectId),
          eq(projectMemberships.userId, input.userId),
          isNull(projectMemberships.deletedAt),
        ),
      );
    return { ok: true as const };
  }

  async listOrgUsers(organizationId: string) {
    const memberships = await this.db
      .select()
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.organizationId, organizationId),
          isNull(organizationMemberships.deletedAt),
        ),
      );
    const out = [];
    for (const m of memberships) {
      const [user] = await this.db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, m.userId))
        .limit(1);
      if (user) out.push({ ...user, orgRole: m.role });
    }
    return out;
  }

  async createWorkflowStatus(input: {
    projectId: string;
    name: string;
    category: "todo" | "in_progress" | "done";
    color?: string | null;
    userId: string;
  }) {
    const existing = await this.listStatuses(input.projectId);
    const position = existing.length > 0 ? Math.max(...existing.map((s) => s.position)) + 1 : 0;
    const id = crypto.randomUUID();
    await this.db.insert(workflowStatuses).values({
      id,
      projectId: input.projectId,
      name: input.name,
      category: input.category,
      position,
      color: input.color ?? null,
      updatedById: input.userId,
    });
    const [row] = await this.db
      .select()
      .from(workflowStatuses)
      .where(eq(workflowStatuses.id, id))
      .limit(1);
    return row!;
  }

  async updateWorkflowStatus(
    id: string,
    userId: string,
    patch: { name?: string; category?: string; color?: string | null },
  ) {
    await this.db
      .update(workflowStatuses)
      .set({ ...patch, updatedById: userId, updatedAt: new Date() })
      .where(eq(workflowStatuses.id, id));
    const [row] = await this.db
      .select()
      .from(workflowStatuses)
      .where(eq(workflowStatuses.id, id))
      .limit(1);
    return row!;
  }

  async reorderWorkflowStatuses(projectId: string, orderedIds: string[], userId: string) {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.db
        .update(workflowStatuses)
        .set({ position: i, updatedById: userId, updatedAt: new Date() })
        .where(
          and(eq(workflowStatuses.id, orderedIds[i]!), eq(workflowStatuses.projectId, projectId)),
        );
    }
    return this.listStatuses(projectId);
  }

  async softDeleteWorkflowStatus(id: string, userId: string) {
    await this.db
      .update(workflowStatuses)
      .set({
        deletedAt: new Date(),
        deletedById: userId,
        updatedById: userId,
        updatedAt: new Date(),
      })
      .where(eq(workflowStatuses.id, id));
    return { ok: true as const };
  }

  async updateProject(
    id: string,
    userId: string,
    patch: { name?: string; key?: string; description?: string | null },
  ) {
    const data: Record<string, unknown> = {
      updatedById: userId,
      updatedAt: new Date(),
    };
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.key !== undefined) data.key = patch.key.toUpperCase();
    await this.db.update(projects).set(data).where(eq(projects.id, id));
    return this.getProject(id);
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
    const [row] = await this.db.select().from(savedFilters).where(eq(savedFilters.id, id)).limit(1);
    return row!;
  }

  async listSavedFilters(projectId: string) {
    return this.db
      .select()
      .from(savedFilters)
      .where(and(eq(savedFilters.projectId, projectId), isNull(savedFilters.deletedAt)))
      .orderBy(asc(savedFilters.name));
  }

  async applySavedFilter(filterId: string) {
    const [filter] = await this.db
      .select()
      .from(savedFilters)
      .where(and(eq(savedFilters.id, filterId), isNull(savedFilters.deletedAt)))
      .limit(1);
    if (!filter) throw new Error("Filter not found");
    return this.searchIssues({
      projectId: filter.projectId,
      q: typeof filter.query.text === "string" ? filter.query.text : undefined,
      statusId: typeof filter.query.statusId === "string" ? filter.query.statusId : undefined,
      type: typeof filter.query.type === "string" ? filter.query.type : undefined,
      assigneeId:
        typeof filter.query.assigneeId === "string"
          ? filter.query.assigneeId
          : filter.query.assigneeId === null
            ? null
            : undefined,
      labelId: typeof filter.query.labelId === "string" ? filter.query.labelId : undefined,
    });
  }

  async deleteSavedFilter(id: string, userId: string) {
    await this.db
      .update(savedFilters)
      .set({
        deletedAt: new Date(),
        deletedById: userId,
        updatedById: userId,
        updatedAt: new Date(),
      })
      .where(eq(savedFilters.id, id));
    return { ok: true as const };
  }

  async searchIssues(input: {
    q?: string;
    projectId?: string;
    statusId?: string;
    type?: string;
    assigneeId?: string | null;
    labelId?: string;
  }) {
    const conditions = [isNull(issues.deletedAt)];
    if (input.projectId) conditions.push(eq(issues.projectId, input.projectId));
    if (input.statusId) conditions.push(eq(issues.statusId, input.statusId));
    if (input.type) conditions.push(eq(issues.type, input.type));
    if (input.assigneeId === null) {
      conditions.push(sql`${issues.assigneeId} is null`);
    } else if (input.assigneeId) {
      conditions.push(eq(issues.assigneeId, input.assigneeId));
    }
    if (input.q?.trim()) {
      const q = `%${input.q.trim()}%`;
      conditions.push(or(like(issues.key, q), like(issues.title, q))!);
    }
    let rows = await this.db
      .select()
      .from(issues)
      .where(and(...conditions))
      .orderBy(asc(issues.backlogRank))
      .limit(100);

    if (input.labelId) {
      const linked = await this.db
        .select({ issueId: issueLabels.issueId })
        .from(issueLabels)
        .where(eq(issueLabels.labelId, input.labelId));
      const allowed = new Set(linked.map((l) => l.issueId));
      rows = rows.filter((r) => allowed.has(r.id));
    }
    return rows;
  }

  async updateEpic(
    id: string,
    userId: string,
    patch: {
      name?: string;
      description?: string | null;
      initiativeId?: string | null;
      statusId?: string | null;
      startDate?: Date | null;
      targetDate?: Date | null;
    },
  ) {
    await this.db
      .update(epics)
      .set({ ...patch, updatedById: userId, updatedAt: new Date() })
      .where(eq(epics.id, id));
    const [row] = await this.db.select().from(epics).where(eq(epics.id, id)).limit(1);
    return row!;
  }

  async listIssueComponentIds(issueId: string): Promise<string[]> {
    const rows = await this.db
      .select({ componentId: issueComponents.componentId })
      .from(issueComponents)
      .where(eq(issueComponents.issueId, issueId));
    return rows.map((r) => r.componentId);
  }

  async setIssueComponents(issueId: string, componentIds: string[]) {
    await this.db.delete(issueComponents).where(eq(issueComponents.issueId, issueId));
    for (const componentId of componentIds) {
      await this.db.insert(issueComponents).values({
        id: crypto.randomUUID(),
        issueId,
        componentId,
      });
    }
    return this.listIssueComponentIds(issueId);
  }

  async listComponents(projectId: string) {
    return this.db
      .select()
      .from(components)
      .where(and(eq(components.projectId, projectId), isNull(components.deletedAt)))
      .orderBy(asc(components.name));
  }

  async createComponent(input: {
    projectId: string;
    name: string;
    description?: string | null;
    leadUserId?: string | null;
    userId: string;
  }) {
    const id = crypto.randomUUID();
    await this.db.insert(components).values({
      id,
      projectId: input.projectId,
      name: input.name.trim(),
      description: input.description ?? null,
      leadUserId: input.leadUserId ?? null,
      updatedById: input.userId,
    });
    const [row] = await this.db.select().from(components).where(eq(components.id, id)).limit(1);
    return row!;
  }

  async updateComponent(
    id: string,
    userId: string,
    patch: {
      name?: string;
      description?: string | null;
      leadUserId?: string | null;
    },
  ) {
    await this.db
      .update(components)
      .set({ ...patch, updatedById: userId, updatedAt: new Date() })
      .where(eq(components.id, id));
    const [row] = await this.db.select().from(components).where(eq(components.id, id)).limit(1);
    return row!;
  }

  async listProjectVersions(projectId: string) {
    return this.db
      .select()
      .from(projectVersions)
      .where(and(eq(projectVersions.projectId, projectId), isNull(projectVersions.deletedAt)))
      .orderBy(asc(projectVersions.name));
  }

  async createProjectVersion(input: {
    projectId: string;
    name: string;
    description?: string | null;
    releaseDate?: Date | null;
    startDate?: Date | null;
    userId: string;
  }) {
    const id = crypto.randomUUID();
    await this.db.insert(projectVersions).values({
      id,
      projectId: input.projectId,
      name: input.name.trim(),
      description: input.description ?? null,
      releaseDate: input.releaseDate ?? null,
      startDate: input.startDate ?? null,
      updatedById: input.userId,
    });
    const [row] = await this.db
      .select()
      .from(projectVersions)
      .where(eq(projectVersions.id, id))
      .limit(1);
    return row!;
  }

  async updateProjectVersion(
    id: string,
    userId: string,
    patch: {
      name?: string;
      description?: string | null;
      releaseDate?: Date | null;
      startDate?: Date | null;
      released?: boolean;
      archived?: boolean;
    },
  ) {
    const data: Record<string, unknown> = {
      updatedById: userId,
      updatedAt: new Date(),
    };
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.releaseDate !== undefined) data.releaseDate = patch.releaseDate;
    if (patch.startDate !== undefined) data.startDate = patch.startDate;
    if (patch.released !== undefined) data.released = patch.released ? 1 : 0;
    if (patch.archived !== undefined) data.archived = patch.archived ? 1 : 0;
    await this.db.update(projectVersions).set(data).where(eq(projectVersions.id, id));
    const [row] = await this.db
      .select()
      .from(projectVersions)
      .where(eq(projectVersions.id, id))
      .limit(1);
    return row!;
  }

  async listIssueTemplates(projectId: string) {
    return this.db
      .select()
      .from(issueTemplates)
      .where(and(eq(issueTemplates.projectId, projectId), isNull(issueTemplates.deletedAt)))
      .orderBy(asc(issueTemplates.name));
  }

  async createIssueTemplate(input: {
    projectId: string;
    name: string;
    description?: string | null;
    defaults: Record<string, unknown>;
    userId: string;
  }) {
    const id = crypto.randomUUID();
    await this.db.insert(issueTemplates).values({
      id,
      projectId: input.projectId,
      name: input.name.trim(),
      description: input.description ?? null,
      defaults: input.defaults,
      updatedById: input.userId,
    });
    const [row] = await this.db
      .select()
      .from(issueTemplates)
      .where(eq(issueTemplates.id, id))
      .limit(1);
    return row!;
  }

  async deleteIssueTemplate(id: string, userId: string) {
    await this.db
      .update(issueTemplates)
      .set({
        deletedAt: new Date(),
        deletedById: userId,
        updatedById: userId,
        updatedAt: new Date(),
      })
      .where(eq(issueTemplates.id, id));
    return { ok: true as const };
  }

  async bulkUpdateIssues(input: { ids: string[]; userId: string; patch: Record<string, unknown> }) {
    const results = [];
    for (const id of input.ids) {
      const [current] = await this.db
        .select()
        .from(issues)
        .where(and(eq(issues.id, id), isNull(issues.deletedAt)))
        .limit(1);
      if (!current) continue;
      const result = await this.updateIssue({
        id,
        baseVersion: current.version,
        userId: input.userId,
        patch: input.patch,
      });
      results.push({ id, ok: !result.conflict });
    }
    return { results };
  }

  async listDashboards(projectId: string) {
    return this.db
      .select()
      .from(dashboards)
      .where(and(eq(dashboards.projectId, projectId), isNull(dashboards.deletedAt)))
      .orderBy(asc(dashboards.name));
  }

  async createDashboard(input: { projectId: string; ownerId: string; name: string }) {
    const id = crypto.randomUUID();
    await this.db.insert(dashboards).values({
      id,
      projectId: input.projectId,
      ownerId: input.ownerId,
      name: input.name.trim(),
      layout: {},
      updatedById: input.ownerId,
    });
    // Seed default gadgets
    const seeds = [
      { type: "issue_stats", title: "Issue stats", position: 0 },
      { type: "priority_breakdown", title: "By priority", position: 1 },
      { type: "sprint_status", title: "Active sprint", position: 2 },
      { type: "activity_feed", title: "Recent activity", position: 3 },
    ];
    for (const s of seeds) {
      await this.db.insert(dashboardGadgets).values({
        id: crypto.randomUUID(),
        dashboardId: id,
        type: s.type,
        title: s.title,
        config: {},
        position: s.position,
        updatedById: input.ownerId,
      });
    }
    const [row] = await this.db.select().from(dashboards).where(eq(dashboards.id, id)).limit(1);
    return row!;
  }

  async listDashboardGadgets(dashboardId: string) {
    return this.db
      .select()
      .from(dashboardGadgets)
      .where(and(eq(dashboardGadgets.dashboardId, dashboardId), isNull(dashboardGadgets.deletedAt)))
      .orderBy(asc(dashboardGadgets.position));
  }

  async gadgetData(input: { projectId: string; type: string; organizationId?: string }) {
    const projectIssues = await this.listIssues(input.projectId);
    if (input.type === "issue_stats") {
      const byStatus: Record<string, number> = {};
      const byType: Record<string, number> = {};
      for (const i of projectIssues) {
        byStatus[i.statusId] = (byStatus[i.statusId] ?? 0) + 1;
        byType[i.type] = (byType[i.type] ?? 0) + 1;
      }
      return { total: projectIssues.length, byStatus, byType };
    }
    if (input.type === "priority_breakdown") {
      const byPriority: Record<string, number> = {};
      for (const i of projectIssues) {
        byPriority[i.priority] = (byPriority[i.priority] ?? 0) + 1;
      }
      return { byPriority };
    }
    if (input.type === "sprint_status") {
      const sprints = await this.listSprints(input.projectId);
      const active = sprints.find((s) => s.state === "active") ?? null;
      if (!active) return { active: null, issueCount: 0 };
      const count = projectIssues.filter((i) => i.sprintId === active.id).length;
      return { active, issueCount: count };
    }
    if (input.type === "activity_feed" && input.organizationId) {
      const events = await this.listActivity(input.organizationId);
      return { events: events.slice(0, 15) };
    }
    return {};
  }

  async roadmapData(projectId: string) {
    const projectEpics = await this.listEpics(projectId);
    const statuses = await this.listStatuses(projectId);
    const doneIds = new Set(statuses.filter((s) => s.category === "done").map((s) => s.id));
    const out = [];
    for (const epic of projectEpics) {
      const children = await this.db
        .select()
        .from(issues)
        .where(and(eq(issues.epicId, epic.id), isNull(issues.deletedAt)));
      const done = children.filter((c) => doneIds.has(c.statusId)).length;
      out.push({
        ...epic,
        issueCount: children.length,
        doneCount: done,
        progress: children.length ? done / children.length : 0,
      });
    }
    return out;
  }

  async epicIssueCounts(projectId: string) {
    const projectEpics = await this.listEpics(projectId);
    const counts: Record<string, number> = {};
    for (const epic of projectEpics) {
      const rows = await this.db
        .select({ id: issues.id })
        .from(issues)
        .where(and(eq(issues.epicId, epic.id), isNull(issues.deletedAt)));
      counts[epic.id] = rows.length;
    }
    return counts;
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
    const [row] = await this.db.select().from(customRoles).where(eq(customRoles.id, id)).limit(1);
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
    data: Buffer;
  }) {
    const id = crypto.randomUUID();
    await this.db.insert(attachments).values({
      id,
      issueId: input.issueId,
      uploadedById: input.uploadedById,
      fileName: input.fileName,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      data: input.data,
      updatedById: input.uploadedById,
    });
    const [row] = await this.db
      .select({
        id: attachments.id,
        issueId: attachments.issueId,
        uploadedById: attachments.uploadedById,
        fileName: attachments.fileName,
        contentType: attachments.contentType,
        sizeBytes: attachments.sizeBytes,
        version: attachments.version,
        updatedById: attachments.updatedById,
        createdAt: attachments.createdAt,
        updatedAt: attachments.updatedAt,
        deletedAt: attachments.deletedAt,
        deletedById: attachments.deletedById,
      })
      .from(attachments)
      .where(eq(attachments.id, id))
      .limit(1);
    return row!;
  }

  async getAttachmentBlob(id: string) {
    const [row] = await this.db
      .select()
      .from(attachments)
      .where(and(eq(attachments.id, id), isNull(attachments.deletedAt)))
      .limit(1);
    return row ?? null;
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
      .where(and(eq(notifications.userId, userId), isNull(notifications.deletedAt)));
  }

  async listActivity(organizationId: string) {
    const events = await this.db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.organizationId, organizationId))
      .orderBy(desc(auditEvents.createdAt))
      .limit(100);
    const out = [];
    for (const e of events) {
      let actorName: string | null = null;
      if (e.actorId) {
        const [u] = await this.db
          .select({ displayName: users.displayName, username: users.username })
          .from(users)
          .where(eq(users.id, e.actorId))
          .limit(1);
        actorName = u?.displayName ?? u?.username ?? null;
      }
      let entityKey: string | null = null;
      let entityTitle: string | null = null;
      const meta = (e.metadata ?? {}) as Record<string, unknown>;
      if (typeof meta.key === "string") entityKey = meta.key;
      if (typeof meta.title === "string") entityTitle = meta.title;
      if (e.entityType === "issue" && e.entityId && !entityKey) {
        const [issue] = await this.db
          .select({ key: issues.key, title: issues.title })
          .from(issues)
          .where(eq(issues.id, e.entityId))
          .limit(1);
        if (issue) {
          entityKey = issue.key;
          entityTitle = issue.title;
        }
      }
      out.push({
        ...e,
        actorName,
        entityKey,
        entityTitle,
        summary: this.formatActivitySummary(e.action, actorName, entityKey, entityTitle),
      });
    }
    return out;
  }

  private formatActivitySummary(
    action: string,
    actorName: string | null,
    entityKey: string | null,
    entityTitle: string | null,
  ) {
    const who = actorName ?? "Someone";
    const what = entityKey
      ? `${entityKey}${entityTitle ? ` · ${entityTitle}` : ""}`
      : (entityTitle ?? "an item");
    const map: Record<string, string> = {
      "issue.create": `${who} created ${what}`,
      "issue.update": `${who} updated ${what}`,
      "issue.delete": `${who} deleted ${what}`,
      "project.create": `${who} created project ${what}`,
      "epic.create": `${who} created epic ${what}`,
      "initiative.create": `${who} created initiative ${what}`,
      "sprint.start": `${who} started sprint ${what}`,
      "sprint.complete": `${who} completed sprint ${what}`,
    };
    return map[action] ?? `${who} · ${action} · ${what}`;
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
      .where(and(eq(initiatives.organizationId, organizationId), isNull(initiatives.deletedAt)));
  }

  private async audit(
    organizationId: string,
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.db.insert(auditEvents).values({
      organizationId,
      actorId,
      action,
      entityType,
      entityId,
      metadata: metadata ?? null,
    });
  }

  private issuePatchFields(
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

  private async publishPatch(event: SyncPatchEvent) {
    await this.bus.publish(event);
  }
}
