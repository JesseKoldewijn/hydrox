// ------------------------------------------------------
// THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
// @nest-native/trpc
// ------------------------------------------------------

import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

const schema_health_ping_output_0 = z.object({ ok: z.boolean(), protocolVersion: z.number(), time: z.string() });
const schema_auth_register_input_1 = z.object({ email: z.string(), username: z.string(), password: z.string(), displayName: z.string(), organizationName: z.string().optional() });
const schema_auth_register_output_2 = z.object({ user: z.object({ id: z.string(), email: z.string(), username: z.string(), displayName: z.string(), avatarUrl: z.string().nullable() }), token: z.string() });
const schema_auth_login_input_3 = z.object({ login: z.string(), password: z.string() });
const schema_auth_login_output_4 = z.object({ user: z.object({ id: z.string(), email: z.string(), username: z.string(), displayName: z.string(), avatarUrl: z.string().nullable() }), token: z.string() });
const schema_auth_me_output_5 = z.object({ id: z.string(), email: z.string(), username: z.string(), displayName: z.string(), avatarUrl: z.string().nullable() }).nullable();
const schema_sync_push_input_6 = z.object({ protocolVersion: z.literal(1), ops: z.array(z.object({ id: z.string(), idempotencyKey: z.string(), entityType: z.enum(["organization","workspace","project","initiative","epic","issue","issue_link","comment","sprint","workflow_status","attachment","notification","saved_filter","custom_role","membership"]), entityId: z.string(), op: z.enum(["create","update","delete","restore"]), patches: z.array(z.object({ field: z.string(), value: z.unknown(), baseVersion: z.number() })).default([]), payload: z.record(z.string(), z.unknown()).optional(), clientTimestamp: z.date(), workspaceId: z.string().optional(), projectId: z.string().optional() })) });
const schema_sync_push_output_7 = z.object({ applied: z.array(z.string()), merged: z.array(z.object({ opId: z.string(), entityId: z.string(), version: z.number(), fields: z.record(z.string(), z.unknown()) })), conflicts: z.array(z.object({ entityType: z.enum(["organization","workspace","project","initiative","epic","issue","issue_link","comment","sprint","workflow_status","attachment","notification","saved_filter","custom_role","membership"]), entityId: z.string(), conflicts: z.array(z.object({ field: z.string(), localValue: z.unknown(), serverValue: z.unknown(), localVersion: z.number(), serverVersion: z.number() })) })), serverTime: z.date() });
const schema_sync_pull_input_8 = z.object({ protocolVersion: z.literal(1), since: z.date().nullable(), cursor: z.string().nullable().optional(), limit: z.number().default(100), projectIds: z.array(z.string()).optional() });
const schema_sync_onPatch_output_9 = z.object({ type: z.literal("entity.patch"), entityType: z.enum(["organization","workspace","project","initiative","epic","issue","issue_link","comment","sprint","workflow_status","attachment","notification","saved_filter","custom_role","membership"]), entityId: z.string(), version: z.number(), fields: z.record(z.string(), z.unknown()), deletedAt: z.date().nullable().optional(), updatedAt: z.date(), updatedById: z.string().nullable() });
const schema_work_workspaces_input_10 = z.object({ organizationId: z.string() });
const schema_work_createProject_input_11 = z.object({ workspaceId: z.string(), organizationId: z.string(), name: z.string(), key: z.string(), description: z.string().nullable().optional() });
const schema_work_projects_input_12 = z.object({ workspaceId: z.string() });
const schema_work_statuses_input_13 = z.object({ projectId: z.string() });
const schema_work_createInitiative_input_14 = z.object({ organizationId: z.string(), projectId: z.string().nullable().optional(), scope: z.enum(["organization","project"]), name: z.string(), description: z.string().nullable().optional() });
const schema_work_initiatives_input_15 = z.object({ organizationId: z.string() });
const schema_work_createEpic_input_16 = z.object({ projectId: z.string(), initiativeId: z.string().nullable().optional(), name: z.string(), description: z.string().nullable().optional() });
const schema_work_epics_input_17 = z.object({ projectId: z.string() });
const schema_work_createIssue_input_18 = z.object({ projectId: z.string(), type: z.enum(["story","bug","task","sub_task"]), title: z.string(), description: z.string().nullable().optional(), epicId: z.string().nullable().optional(), parentIssueId: z.string().nullable().optional(), statusId: z.string().optional(), assigneeId: z.string().nullable().optional(), sprintId: z.string().nullable().optional(), storyPoints: z.number().nullable().optional() });
const schema_work_issues_input_19 = z.object({ projectId: z.string() });
const schema_work_updateIssue_input_20 = z.object({ id: z.string(), baseVersion: z.number(), title: z.string().optional(), description: z.string().nullable().optional(), statusId: z.string().optional(), assigneeId: z.string().nullable().optional(), sprintId: z.string().nullable().optional(), backlogRank: z.string().optional(), storyPoints: z.number().nullable().optional() });
const schema_work_createSprint_input_21 = z.object({ projectId: z.string(), name: z.string(), goal: z.string().nullable().optional() });
const schema_work_startSprint_input_22 = z.object({ id: z.string() });
const schema_work_completeSprint_input_23 = z.object({ id: z.string() });
const schema_work_sprints_input_24 = z.object({ projectId: z.string() });
const schema_work_addComment_input_25 = z.object({ issueId: z.string(), body: z.string() });
const schema_work_linkIssues_input_26 = z.object({ sourceIssueId: z.string(), targetIssueId: z.string(), linkType: z.enum(["blocks","is_blocked_by","relates_to","duplicates"]) });
const schema_work_saveFilter_input_27 = z.object({ projectId: z.string(), name: z.string(), query: z.record(z.string(), z.unknown()) });
const schema_work_createCustomRole_input_28 = z.object({ organizationId: z.string(), name: z.string(), capabilities: z.array(z.enum(["project.view","project.edit","board.edit","issue.create","issue.edit","issue.delete","sprint.manage","workflow.manage","members.manage","roles.manage","attachments.manage","purge.trigger"])) });
const schema_work_setProjectOverrides_input_29 = z.object({ projectId: z.string(), targetUserId: z.string(), capabilities: z.array(z.enum(["project.view","project.edit","board.edit","issue.create","issue.edit","issue.delete","sprint.manage","workflow.manage","members.manage","roles.manage","attachments.manage","purge.trigger"])), customRoleId: z.string().nullable().optional() });
const schema_work_uploadAttachment_input_30 = z.object({ issueId: z.string(), organizationId: z.string(), projectId: z.string(), fileName: z.string(), contentType: z.string(), sizeBytes: z.number(), dataBase64: z.string() });
const schema_work_attachmentDownload_input_31 = z.object({ attachmentId: z.string() });
const schema_work_activity_input_32 = z.object({ organizationId: z.string() });
const schema_notify_vapidPublicKey_output_33 = z.object({ publicKey: z.string().nullable() });
const schema_notify_subscribePush_input_34 = z.object({ endpoint: z.string(), keys: z.object({ p256dh: z.string(), auth: z.string() }) });
const schema_notify_sendInApp_input_35 = z.object({ userId: z.string(), organizationId: z.string(), title: z.string(), body: z.string().optional(), type: z.string().default("info") });
const schema_admin_triggerPurge_input_36 = z.object({ force: z.boolean().default(false) });

const appRouter = t.router({
  health: t.router({
    ping: t.procedure.output(schema_health_ping_output_0).query(() => null as unknown as z.infer<typeof schema_health_ping_output_0>),
  }),
  auth: t.router({
    register: t.procedure.input(schema_auth_register_input_1).output(schema_auth_register_output_2).mutation(() => null as unknown as z.infer<typeof schema_auth_register_output_2>),
    login: t.procedure.input(schema_auth_login_input_3).output(schema_auth_login_output_4).mutation(() => null as unknown as z.infer<typeof schema_auth_login_output_4>),
    logout: t.procedure.mutation(() => undefined as unknown),
    me: t.procedure.output(schema_auth_me_output_5).query(() => null as unknown as z.infer<typeof schema_auth_me_output_5>),
  }),
  sync: t.router({
    push: t.procedure.input(schema_sync_push_input_6).output(schema_sync_push_output_7).mutation(() => null as unknown as z.infer<typeof schema_sync_push_output_7>),
    pull: t.procedure.input(schema_sync_pull_input_8).query(() => undefined as unknown),
    onPatch: t.procedure.subscription(async function* () { yield null as unknown as z.infer<typeof schema_sync_onPatch_output_9>; }),
  }),
  work: t.router({
    myOrgs: t.procedure.query(() => undefined as unknown),
    workspaces: t.procedure.input(schema_work_workspaces_input_10).query(() => undefined as unknown),
    createProject: t.procedure.input(schema_work_createProject_input_11).mutation(() => undefined as unknown),
    projects: t.procedure.input(schema_work_projects_input_12).query(() => undefined as unknown),
    statuses: t.procedure.input(schema_work_statuses_input_13).query(() => undefined as unknown),
    createInitiative: t.procedure.input(schema_work_createInitiative_input_14).mutation(() => undefined as unknown),
    initiatives: t.procedure.input(schema_work_initiatives_input_15).query(() => undefined as unknown),
    createEpic: t.procedure.input(schema_work_createEpic_input_16).mutation(() => undefined as unknown),
    epics: t.procedure.input(schema_work_epics_input_17).query(() => undefined as unknown),
    createIssue: t.procedure.input(schema_work_createIssue_input_18).mutation(() => undefined as unknown),
    issues: t.procedure.input(schema_work_issues_input_19).query(() => undefined as unknown),
    updateIssue: t.procedure.input(schema_work_updateIssue_input_20).mutation(() => undefined as unknown),
    createSprint: t.procedure.input(schema_work_createSprint_input_21).mutation(() => undefined as unknown),
    startSprint: t.procedure.input(schema_work_startSprint_input_22).mutation(() => undefined as unknown),
    completeSprint: t.procedure.input(schema_work_completeSprint_input_23).mutation(() => undefined as unknown),
    sprints: t.procedure.input(schema_work_sprints_input_24).query(() => undefined as unknown),
    addComment: t.procedure.input(schema_work_addComment_input_25).mutation(() => undefined as unknown),
    linkIssues: t.procedure.input(schema_work_linkIssues_input_26).mutation(() => undefined as unknown),
    saveFilter: t.procedure.input(schema_work_saveFilter_input_27).mutation(() => undefined as unknown),
    createCustomRole: t.procedure.input(schema_work_createCustomRole_input_28).mutation(() => undefined as unknown),
    setProjectOverrides: t.procedure.input(schema_work_setProjectOverrides_input_29).mutation(() => undefined as unknown),
    uploadAttachment: t.procedure.input(schema_work_uploadAttachment_input_30).mutation(() => undefined as unknown),
    attachmentDownload: t.procedure.input(schema_work_attachmentDownload_input_31).query(() => undefined as unknown),
    activity: t.procedure.input(schema_work_activity_input_32).query(() => undefined as unknown),
  }),
  notify: t.router({
    vapidPublicKey: t.procedure.output(schema_notify_vapidPublicKey_output_33).query(() => null as unknown as z.infer<typeof schema_notify_vapidPublicKey_output_33>),
    subscribePush: t.procedure.input(schema_notify_subscribePush_input_34).mutation(() => undefined as unknown),
    list: t.procedure.query(() => undefined as unknown),
    sendInApp: t.procedure.input(schema_notify_sendInApp_input_35).mutation(() => undefined as unknown),
  }),
  admin: t.router({
    triggerPurge: t.procedure.input(schema_admin_triggerPurge_input_36).mutation(() => undefined as unknown),
  })
});

export type AppRouter = typeof appRouter;
