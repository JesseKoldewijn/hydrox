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
const schema_work_project_input_13 = z.object({ projectId: z.string() });
const schema_work_statuses_input_14 = z.object({ projectId: z.string() });
const schema_work_createInitiative_input_15 = z.object({ organizationId: z.string(), projectId: z.string().nullable().optional(), scope: z.enum(["organization","project"]), name: z.string(), description: z.string().nullable().optional() });
const schema_work_initiatives_input_16 = z.object({ organizationId: z.string() });
const schema_work_createEpic_input_17 = z.object({ projectId: z.string(), initiativeId: z.string().nullable().optional(), name: z.string(), description: z.string().nullable().optional() });
const schema_work_epics_input_18 = z.object({ projectId: z.string() });
const schema_work_createIssue_input_19 = z.object({ projectId: z.string(), type: z.enum(["story","bug","task","sub_task"]), title: z.string(), description: z.string().nullable().optional(), epicId: z.string().nullable().optional(), parentIssueId: z.string().nullable().optional(), statusId: z.string().optional(), assigneeId: z.string().nullable().optional(), sprintId: z.string().nullable().optional(), priority: z.enum(["highest","high","medium","low","lowest"]).optional(), storyPoints: z.number().nullable().optional(), dueDate: z.date().nullable().optional(), originalEstimateMinutes: z.number().nullable().optional(), remainingEstimateMinutes: z.number().nullable().optional(), fixVersionId: z.string().nullable().optional(), labelIds: z.array(z.string()).optional(), componentIds: z.array(z.string()).optional(), templateId: z.string().optional() });
const schema_work_issues_input_20 = z.object({ projectId: z.string() });
const schema_work_updateIssue_input_21 = z.object({ id: z.string(), baseVersion: z.number(), title: z.string().optional(), description: z.string().nullable().optional(), type: z.enum(["story","bug","task","sub_task"]).optional(), statusId: z.string().optional(), assigneeId: z.string().nullable().optional(), epicId: z.string().nullable().optional(), parentIssueId: z.string().nullable().optional(), sprintId: z.string().nullable().optional(), priority: z.enum(["highest","high","medium","low","lowest"]).optional(), backlogRank: z.string().optional(), storyPoints: z.number().nullable().optional(), dueDate: z.date().nullable().optional(), originalEstimateMinutes: z.number().nullable().optional(), remainingEstimateMinutes: z.number().nullable().optional(), fixVersionId: z.string().nullable().optional(), labelIds: z.array(z.string()).optional(), componentIds: z.array(z.string()).optional() });
const schema_work_createSprint_input_22 = z.object({ projectId: z.string(), name: z.string(), goal: z.string().nullable().optional() });
const schema_work_startSprint_input_23 = z.object({ id: z.string() });
const schema_work_completeSprint_input_24 = z.object({ id: z.string(), moveIncompleteToSprintId: z.string().nullable().optional() });
const schema_work_updateSprint_input_25 = z.object({ id: z.string(), name: z.string().optional(), goal: z.string().nullable().optional(), startDate: z.date().nullable().optional(), endDate: z.date().nullable().optional() });
const schema_work_sprints_input_26 = z.object({ projectId: z.string() });
const schema_work_addComment_input_27 = z.object({ issueId: z.string(), body: z.string() });
const schema_work_comments_input_28 = z.object({ issueId: z.string() });
const schema_work_attachments_input_29 = z.object({ issueId: z.string() });
const schema_work_softDeleteIssue_input_30 = z.object({ id: z.string() });
const schema_work_listCustomRoles_input_31 = z.object({ organizationId: z.string() });
const schema_work_linkIssues_input_32 = z.object({ sourceIssueId: z.string(), targetIssueId: z.string(), linkType: z.enum(["blocks","is_blocked_by","relates_to","duplicates"]) });
const schema_work_saveFilter_input_33 = z.object({ projectId: z.string(), name: z.string(), query: z.record(z.string(), z.unknown()) });
const schema_work_createCustomRole_input_34 = z.object({ organizationId: z.string(), name: z.string(), capabilities: z.array(z.enum(["project.view","project.edit","board.edit","issue.create","issue.edit","issue.delete","sprint.manage","workflow.manage","members.manage","roles.manage","attachments.manage","purge.trigger"])) });
const schema_work_setProjectOverrides_input_35 = z.object({ projectId: z.string(), targetUserId: z.string(), capabilities: z.array(z.enum(["project.view","project.edit","board.edit","issue.create","issue.edit","issue.delete","sprint.manage","workflow.manage","members.manage","roles.manage","attachments.manage","purge.trigger"])), customRoleId: z.string().nullable().optional() });
const schema_work_uploadAttachment_input_36 = z.object({ issueId: z.string(), organizationId: z.string(), projectId: z.string(), fileName: z.string(), contentType: z.string(), sizeBytes: z.number(), dataBase64: z.string() });
const schema_work_attachmentDownload_input_37 = z.object({ attachmentId: z.string() });
const schema_work_activity_input_38 = z.object({ organizationId: z.string() });
const schema_work_listIssueLinks_input_39 = z.object({ issueId: z.string() });
const schema_work_deleteIssueLink_input_40 = z.object({ id: z.string() });
const schema_work_listLabels_input_41 = z.object({ projectId: z.string() });
const schema_work_createLabel_input_42 = z.object({ projectId: z.string(), name: z.string(), color: z.string().nullable().optional() });
const schema_work_setIssueLabels_input_43 = z.object({ issueId: z.string(), labelIds: z.array(z.string()) });
const schema_work_listProjectMembers_input_44 = z.object({ projectId: z.string() });
const schema_work_listOrgUsers_input_45 = z.object({ organizationId: z.string() });
const schema_work_addProjectMember_input_46 = z.object({ projectId: z.string(), userId: z.string(), role: z.enum(["admin","member","viewer"]) });
const schema_work_removeProjectMember_input_47 = z.object({ projectId: z.string(), userId: z.string() });
const schema_work_createWorkflowStatus_input_48 = z.object({ projectId: z.string(), name: z.string(), category: z.enum(["todo","in_progress","done"]), color: z.string().nullable().optional() });
const schema_work_updateWorkflowStatus_input_49 = z.object({ id: z.string(), name: z.string().optional(), category: z.enum(["todo","in_progress","done"]).optional(), color: z.string().nullable().optional() });
const schema_work_reorderWorkflowStatuses_input_50 = z.object({ projectId: z.string(), orderedIds: z.array(z.string()) });
const schema_work_softDeleteWorkflowStatus_input_51 = z.object({ id: z.string() });
const schema_work_updateProject_input_52 = z.object({ id: z.string(), name: z.string().optional(), key: z.string().optional(), description: z.string().nullable().optional() });
const schema_work_listSavedFilters_input_53 = z.object({ projectId: z.string() });
const schema_work_applySavedFilter_input_54 = z.object({ filterId: z.string() });
const schema_work_deleteSavedFilter_input_55 = z.object({ id: z.string() });
const schema_work_searchIssues_input_56 = z.object({ q: z.string().optional(), projectId: z.string().optional(), statusId: z.string().optional(), type: z.string().optional(), assigneeId: z.string().nullable().optional(), labelId: z.string().optional() });
const schema_work_epicIssueCounts_input_57 = z.object({ projectId: z.string() });
const schema_work_updateEpic_input_58 = z.object({ id: z.string(), name: z.string().optional(), description: z.string().nullable().optional(), initiativeId: z.string().nullable().optional(), statusId: z.string().nullable().optional(), startDate: z.date().nullable().optional(), targetDate: z.date().nullable().optional() });
const schema_work_listComponents_input_59 = z.object({ projectId: z.string() });
const schema_work_createComponent_input_60 = z.object({ projectId: z.string(), name: z.string(), description: z.string().nullable().optional(), leadUserId: z.string().nullable().optional() });
const schema_work_updateComponent_input_61 = z.object({ id: z.string(), name: z.string().optional(), description: z.string().nullable().optional(), leadUserId: z.string().nullable().optional() });
const schema_work_setIssueComponents_input_62 = z.object({ issueId: z.string(), componentIds: z.array(z.string()) });
const schema_work_listProjectVersions_input_63 = z.object({ projectId: z.string() });
const schema_work_createProjectVersion_input_64 = z.object({ projectId: z.string(), name: z.string(), description: z.string().nullable().optional(), releaseDate: z.date().nullable().optional(), startDate: z.date().nullable().optional() });
const schema_work_updateProjectVersion_input_65 = z.object({ id: z.string(), name: z.string().optional(), description: z.string().nullable().optional(), releaseDate: z.date().nullable().optional(), startDate: z.date().nullable().optional(), released: z.boolean().optional(), archived: z.boolean().optional() });
const schema_work_listIssueTemplates_input_66 = z.object({ projectId: z.string() });
const schema_work_createIssueTemplate_input_67 = z.object({ projectId: z.string(), name: z.string(), description: z.string().nullable().optional(), defaults: z.record(z.string(), z.unknown()) });
const schema_work_deleteIssueTemplate_input_68 = z.object({ id: z.string() });
const schema_work_bulkUpdateIssues_input_69 = z.object({ ids: z.array(z.string()), patch: z.object({ statusId: z.string().optional(), assigneeId: z.string().nullable().optional(), sprintId: z.string().nullable().optional(), priority: z.enum(["highest","high","medium","low","lowest"]).optional(), epicId: z.string().nullable().optional(), fixVersionId: z.string().nullable().optional(), labelIds: z.array(z.string()).optional(), componentIds: z.array(z.string()).optional() }) });
const schema_work_listDashboards_input_70 = z.object({ projectId: z.string() });
const schema_work_createDashboard_input_71 = z.object({ projectId: z.string(), name: z.string() });
const schema_work_listDashboardGadgets_input_72 = z.object({ dashboardId: z.string() });
const schema_work_gadgetData_input_73 = z.object({ projectId: z.string(), type: z.string(), organizationId: z.string().optional() });
const schema_work_roadmapData_input_74 = z.object({ projectId: z.string() });
const schema_notify_vapidPublicKey_output_75 = z.object({ publicKey: z.string().nullable() });
const schema_notify_subscribePush_input_76 = z.object({ endpoint: z.string(), keys: z.object({ p256dh: z.string(), auth: z.string() }) });
const schema_notify_sendInApp_input_77 = z.object({ userId: z.string(), organizationId: z.string(), title: z.string(), body: z.string().optional(), type: z.string().default("info") });
const schema_admin_triggerPurge_input_78 = z.object({ force: z.boolean().default(false) });
const schema_admin_runRetention_input_79 = z.object({ force: z.boolean().default(false) });

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
    project: t.procedure.input(schema_work_project_input_13).query(() => undefined as unknown),
    statuses: t.procedure.input(schema_work_statuses_input_14).query(() => undefined as unknown),
    createInitiative: t.procedure.input(schema_work_createInitiative_input_15).mutation(() => undefined as unknown),
    initiatives: t.procedure.input(schema_work_initiatives_input_16).query(() => undefined as unknown),
    createEpic: t.procedure.input(schema_work_createEpic_input_17).mutation(() => undefined as unknown),
    epics: t.procedure.input(schema_work_epics_input_18).query(() => undefined as unknown),
    createIssue: t.procedure.input(schema_work_createIssue_input_19).mutation(() => undefined as unknown),
    issues: t.procedure.input(schema_work_issues_input_20).query(() => undefined as unknown),
    updateIssue: t.procedure.input(schema_work_updateIssue_input_21).mutation(() => undefined as unknown),
    createSprint: t.procedure.input(schema_work_createSprint_input_22).mutation(() => undefined as unknown),
    startSprint: t.procedure.input(schema_work_startSprint_input_23).mutation(() => undefined as unknown),
    completeSprint: t.procedure.input(schema_work_completeSprint_input_24).mutation(() => undefined as unknown),
    updateSprint: t.procedure.input(schema_work_updateSprint_input_25).mutation(() => undefined as unknown),
    sprints: t.procedure.input(schema_work_sprints_input_26).query(() => undefined as unknown),
    addComment: t.procedure.input(schema_work_addComment_input_27).mutation(() => undefined as unknown),
    comments: t.procedure.input(schema_work_comments_input_28).query(() => undefined as unknown),
    attachments: t.procedure.input(schema_work_attachments_input_29).query(() => undefined as unknown),
    softDeleteIssue: t.procedure.input(schema_work_softDeleteIssue_input_30).mutation(() => undefined as unknown),
    listCustomRoles: t.procedure.input(schema_work_listCustomRoles_input_31).query(() => undefined as unknown),
    linkIssues: t.procedure.input(schema_work_linkIssues_input_32).mutation(() => undefined as unknown),
    saveFilter: t.procedure.input(schema_work_saveFilter_input_33).mutation(() => undefined as unknown),
    createCustomRole: t.procedure.input(schema_work_createCustomRole_input_34).mutation(() => undefined as unknown),
    setProjectOverrides: t.procedure.input(schema_work_setProjectOverrides_input_35).mutation(() => undefined as unknown),
    uploadAttachment: t.procedure.input(schema_work_uploadAttachment_input_36).mutation(() => undefined as unknown),
    attachmentDownload: t.procedure.input(schema_work_attachmentDownload_input_37).query(() => undefined as unknown),
    activity: t.procedure.input(schema_work_activity_input_38).query(() => undefined as unknown),
    listIssueLinks: t.procedure.input(schema_work_listIssueLinks_input_39).query(() => undefined as unknown),
    deleteIssueLink: t.procedure.input(schema_work_deleteIssueLink_input_40).mutation(() => undefined as unknown),
    listLabels: t.procedure.input(schema_work_listLabels_input_41).query(() => undefined as unknown),
    createLabel: t.procedure.input(schema_work_createLabel_input_42).mutation(() => undefined as unknown),
    setIssueLabels: t.procedure.input(schema_work_setIssueLabels_input_43).mutation(() => undefined as unknown),
    listProjectMembers: t.procedure.input(schema_work_listProjectMembers_input_44).query(() => undefined as unknown),
    listOrgUsers: t.procedure.input(schema_work_listOrgUsers_input_45).query(() => undefined as unknown),
    addProjectMember: t.procedure.input(schema_work_addProjectMember_input_46).mutation(() => undefined as unknown),
    removeProjectMember: t.procedure.input(schema_work_removeProjectMember_input_47).mutation(() => undefined as unknown),
    createWorkflowStatus: t.procedure.input(schema_work_createWorkflowStatus_input_48).mutation(() => undefined as unknown),
    updateWorkflowStatus: t.procedure.input(schema_work_updateWorkflowStatus_input_49).mutation(() => undefined as unknown),
    reorderWorkflowStatuses: t.procedure.input(schema_work_reorderWorkflowStatuses_input_50).mutation(() => undefined as unknown),
    softDeleteWorkflowStatus: t.procedure.input(schema_work_softDeleteWorkflowStatus_input_51).mutation(() => undefined as unknown),
    updateProject: t.procedure.input(schema_work_updateProject_input_52).mutation(() => undefined as unknown),
    listSavedFilters: t.procedure.input(schema_work_listSavedFilters_input_53).query(() => undefined as unknown),
    applySavedFilter: t.procedure.input(schema_work_applySavedFilter_input_54).query(() => undefined as unknown),
    deleteSavedFilter: t.procedure.input(schema_work_deleteSavedFilter_input_55).mutation(() => undefined as unknown),
    searchIssues: t.procedure.input(schema_work_searchIssues_input_56).query(() => undefined as unknown),
    epicIssueCounts: t.procedure.input(schema_work_epicIssueCounts_input_57).query(() => undefined as unknown),
    updateEpic: t.procedure.input(schema_work_updateEpic_input_58).mutation(() => undefined as unknown),
    listComponents: t.procedure.input(schema_work_listComponents_input_59).query(() => undefined as unknown),
    createComponent: t.procedure.input(schema_work_createComponent_input_60).mutation(() => undefined as unknown),
    updateComponent: t.procedure.input(schema_work_updateComponent_input_61).mutation(() => undefined as unknown),
    setIssueComponents: t.procedure.input(schema_work_setIssueComponents_input_62).mutation(() => undefined as unknown),
    listProjectVersions: t.procedure.input(schema_work_listProjectVersions_input_63).query(() => undefined as unknown),
    createProjectVersion: t.procedure.input(schema_work_createProjectVersion_input_64).mutation(() => undefined as unknown),
    updateProjectVersion: t.procedure.input(schema_work_updateProjectVersion_input_65).mutation(() => undefined as unknown),
    listIssueTemplates: t.procedure.input(schema_work_listIssueTemplates_input_66).query(() => undefined as unknown),
    createIssueTemplate: t.procedure.input(schema_work_createIssueTemplate_input_67).mutation(() => undefined as unknown),
    deleteIssueTemplate: t.procedure.input(schema_work_deleteIssueTemplate_input_68).mutation(() => undefined as unknown),
    bulkUpdateIssues: t.procedure.input(schema_work_bulkUpdateIssues_input_69).mutation(() => undefined as unknown),
    listDashboards: t.procedure.input(schema_work_listDashboards_input_70).query(() => undefined as unknown),
    createDashboard: t.procedure.input(schema_work_createDashboard_input_71).mutation(() => undefined as unknown),
    listDashboardGadgets: t.procedure.input(schema_work_listDashboardGadgets_input_72).query(() => undefined as unknown),
    gadgetData: t.procedure.input(schema_work_gadgetData_input_73).query(() => undefined as unknown),
    roadmapData: t.procedure.input(schema_work_roadmapData_input_74).query(() => undefined as unknown),
  }),
  notify: t.router({
    vapidPublicKey: t.procedure.output(schema_notify_vapidPublicKey_output_75).query(() => null as unknown as z.infer<typeof schema_notify_vapidPublicKey_output_75>),
    subscribePush: t.procedure.input(schema_notify_subscribePush_input_76).mutation(() => undefined as unknown),
    list: t.procedure.query(() => undefined as unknown),
    sendInApp: t.procedure.input(schema_notify_sendInApp_input_77).mutation(() => undefined as unknown),
  }),
  admin: t.router({
    triggerPurge: t.procedure.input(schema_admin_triggerPurge_input_78).mutation(() => undefined as unknown),
    runRetention: t.procedure.input(schema_admin_runRetention_input_79).mutation(() => undefined as unknown),
  })
});

export type AppRouter = typeof appRouter;
