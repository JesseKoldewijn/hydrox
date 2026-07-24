import {
  char,
  customType,
  index,
  int,
  json,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

const longblob = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "longblob";
  },
});

const idCol = () =>
  char("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
};

const softDelete = {
  deletedAt: timestamp("deleted_at"),
  deletedById: char("deleted_by_id", { length: 36 }),
};

export const users = mysqlTable(
  "users",
  {
    id: idCol(),
    email: varchar("email", { length: 320 }).notNull(),
    username: varchar("username", { length: 64 }).notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    avatarUrl: text("avatar_url"),
    passwordHash: text("password_hash"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("users_email_uidx").on(t.email),
    uniqueIndex("users_username_uidx").on(t.username),
  ],
);

export const identities = mysqlTable(
  "identities",
  {
    id: idCol(),
    userId: char("user_id", { length: 36 })
      .notNull()
      .references(() => users.id),
    provider: varchar("provider", { length: 32 }).notNull(),
    externalId: varchar("external_id", { length: 255 }),
    ...timestamps,
  },
  (t) => [uniqueIndex("identities_provider_external_uidx").on(t.provider, t.externalId)],
);

export const sessions = mysqlTable("sessions", {
  id: idCol(),
  userId: char("user_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ...timestamps,
});

export const organizations = mysqlTable(
  "organizations",
  {
    id: idCol(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 48 }).notNull(),
    version: int("version").notNull().default(1),
    updatedById: char("updated_by_id", { length: 36 }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [uniqueIndex("organizations_slug_uidx").on(t.slug)],
);

export const organizationMemberships = mysqlTable(
  "organization_memberships",
  {
    id: idCol(),
    organizationId: char("organization_id", { length: 36 })
      .notNull()
      .references(() => organizations.id),
    userId: char("user_id", { length: 36 })
      .notNull()
      .references(() => users.id),
    role: varchar("role", { length: 32 }).notNull().default("member"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [uniqueIndex("org_memberships_uidx").on(t.organizationId, t.userId)],
);

export const workspaces = mysqlTable("workspaces", {
  id: idCol(),
  organizationId: char("organization_id", { length: 36 })
    .notNull()
    .references(() => organizations.id),
  name: varchar("name", { length: 120 }).notNull(),
  key: varchar("key", { length: 32 }).notNull(),
  version: int("version").notNull().default(1),
  updatedById: char("updated_by_id", { length: 36 }),
  ...timestamps,
  ...softDelete,
});

export const workspaceMemberships = mysqlTable(
  "workspace_memberships",
  {
    id: idCol(),
    workspaceId: char("workspace_id", { length: 36 })
      .notNull()
      .references(() => workspaces.id),
    userId: char("user_id", { length: 36 })
      .notNull()
      .references(() => users.id),
    role: varchar("role", { length: 32 }).notNull().default("member"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [uniqueIndex("workspace_memberships_uidx").on(t.workspaceId, t.userId)],
);

export const projects = mysqlTable(
  "projects",
  {
    id: idCol(),
    workspaceId: char("workspace_id", { length: 36 })
      .notNull()
      .references(() => workspaces.id),
    organizationId: char("organization_id", { length: 36 })
      .notNull()
      .references(() => organizations.id),
    name: varchar("name", { length: 120 }).notNull(),
    key: varchar("key", { length: 16 }).notNull(),
    description: text("description"),
    issueCounter: int("issue_counter").notNull().default(0),
    version: int("version").notNull().default(1),
    updatedById: char("updated_by_id", { length: 36 }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [uniqueIndex("projects_org_key_uidx").on(t.organizationId, t.key)],
);

export const projectMemberships = mysqlTable(
  "project_memberships",
  {
    id: idCol(),
    projectId: char("project_id", { length: 36 })
      .notNull()
      .references(() => projects.id),
    userId: char("user_id", { length: 36 })
      .notNull()
      .references(() => users.id),
    role: varchar("role", { length: 32 }).notNull().default("member"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [uniqueIndex("project_memberships_uidx").on(t.projectId, t.userId)],
);

export const customRoles = mysqlTable("custom_roles", {
  id: idCol(),
  organizationId: char("organization_id", { length: 36 })
    .notNull()
    .references(() => organizations.id),
  name: varchar("name", { length: 80 }).notNull(),
  capabilities: json("capabilities")
    .$type<string[]>()
    .notNull()
    .default(sql`(JSON_ARRAY())`),
  version: int("version").notNull().default(1),
  updatedById: char("updated_by_id", { length: 36 }),
  ...timestamps,
  ...softDelete,
});

export const projectPermissionOverrides = mysqlTable(
  "project_permission_overrides",
  {
    id: idCol(),
    projectId: char("project_id", { length: 36 })
      .notNull()
      .references(() => projects.id),
    userId: char("user_id", { length: 36 })
      .notNull()
      .references(() => users.id),
    capabilities: json("capabilities")
      .$type<string[]>()
      .notNull()
      .default(sql`(JSON_ARRAY())`),
    customRoleId: char("custom_role_id", { length: 36 }).references(() => customRoles.id),
    ...timestamps,
  },
  (t) => [uniqueIndex("project_overrides_uidx").on(t.projectId, t.userId)],
);

export const workflowStatuses = mysqlTable("workflow_statuses", {
  id: idCol(),
  projectId: char("project_id", { length: 36 })
    .notNull()
    .references(() => projects.id),
  name: varchar("name", { length: 80 }).notNull(),
  category: varchar("category", { length: 32 }).notNull(),
  position: int("position").notNull().default(0),
  color: varchar("color", { length: 32 }),
  version: int("version").notNull().default(1),
  updatedById: char("updated_by_id", { length: 36 }),
  ...timestamps,
  ...softDelete,
});

export const initiatives = mysqlTable("initiatives", {
  id: idCol(),
  organizationId: char("organization_id", { length: 36 })
    .notNull()
    .references(() => organizations.id),
  projectId: char("project_id", { length: 36 }).references(() => projects.id),
  scope: varchar("scope", { length: 32 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  version: int("version").notNull().default(1),
  updatedById: char("updated_by_id", { length: 36 }),
  ...timestamps,
  ...softDelete,
});

export const epics = mysqlTable("epics", {
  id: idCol(),
  projectId: char("project_id", { length: 36 })
    .notNull()
    .references(() => projects.id),
  initiativeId: char("initiative_id", { length: 36 }).references(() => initiatives.id),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  statusId: char("status_id", { length: 36 }).references(() => workflowStatuses.id),
  startDate: timestamp("start_date"),
  targetDate: timestamp("target_date"),
  version: int("version").notNull().default(1),
  updatedById: char("updated_by_id", { length: 36 }),
  ...timestamps,
  ...softDelete,
});

export const sprints = mysqlTable("sprints", {
  id: idCol(),
  projectId: char("project_id", { length: 36 })
    .notNull()
    .references(() => projects.id),
  name: varchar("name", { length: 120 }).notNull(),
  goal: text("goal"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  state: varchar("state", { length: 32 }).notNull().default("future"),
  version: int("version").notNull().default(1),
  updatedById: char("updated_by_id", { length: 36 }),
  ...timestamps,
  ...softDelete,
});

export const issues = mysqlTable(
  "issues",
  {
    id: idCol(),
    projectId: char("project_id", { length: 36 })
      .notNull()
      .references(() => projects.id),
    epicId: char("epic_id", { length: 36 }).references(() => epics.id),
    parentIssueId: char("parent_issue_id", { length: 36 }),
    key: varchar("key", { length: 32 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    statusId: char("status_id", { length: 36 })
      .notNull()
      .references(() => workflowStatuses.id),
    assigneeId: char("assignee_id", { length: 36 }).references(() => users.id),
    reporterId: char("reporter_id", { length: 36 })
      .notNull()
      .references(() => users.id),
    sprintId: char("sprint_id", { length: 36 }).references(() => sprints.id),
    priority: varchar("priority", { length: 16 }).notNull().default("medium"),
    backlogRank: varchar("backlog_rank", { length: 64 }).notNull().default("m"),
    storyPoints: int("story_points"),
    dueDate: timestamp("due_date"),
    originalEstimateMinutes: int("original_estimate_minutes"),
    remainingEstimateMinutes: int("remaining_estimate_minutes"),
    fixVersionId: char("fix_version_id", { length: 36 }),
    version: int("version").notNull().default(1),
    updatedById: char("updated_by_id", { length: 36 }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("issues_project_key_uidx").on(t.projectId, t.key),
    index("issues_project_idx").on(t.projectId),
    index("issues_sprint_idx").on(t.sprintId),
  ],
);

export const components = mysqlTable(
  "components",
  {
    id: idCol(),
    projectId: char("project_id", { length: 36 })
      .notNull()
      .references(() => projects.id),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    leadUserId: char("lead_user_id", { length: 36 }).references(() => users.id),
    version: int("version").notNull().default(1),
    updatedById: char("updated_by_id", { length: 36 }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("components_project_name_uidx").on(t.projectId, t.name),
    index("components_project_idx").on(t.projectId),
  ],
);

export const issueComponents = mysqlTable(
  "issue_components",
  {
    id: idCol(),
    issueId: char("issue_id", { length: 36 })
      .notNull()
      .references(() => issues.id),
    componentId: char("component_id", { length: 36 })
      .notNull()
      .references(() => components.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("issue_components_uidx").on(t.issueId, t.componentId),
    index("issue_components_issue_idx").on(t.issueId),
  ],
);

export const projectVersions = mysqlTable(
  "project_versions",
  {
    id: idCol(),
    projectId: char("project_id", { length: 36 })
      .notNull()
      .references(() => projects.id),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    releaseDate: timestamp("release_date"),
    startDate: timestamp("start_date"),
    released: int("released").notNull().default(0),
    archived: int("archived").notNull().default(0),
    version: int("version").notNull().default(1),
    updatedById: char("updated_by_id", { length: 36 }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("project_versions_name_uidx").on(t.projectId, t.name),
    index("project_versions_project_idx").on(t.projectId),
  ],
);

export const issueTemplates = mysqlTable("issue_templates", {
  id: idCol(),
  projectId: char("project_id", { length: 36 })
    .notNull()
    .references(() => projects.id),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  defaults: json("defaults").$type<Record<string, unknown>>().notNull(),
  version: int("version").notNull().default(1),
  updatedById: char("updated_by_id", { length: 36 }),
  ...timestamps,
  ...softDelete,
});

export const dashboards = mysqlTable("dashboards", {
  id: idCol(),
  projectId: char("project_id", { length: 36 })
    .notNull()
    .references(() => projects.id),
  ownerId: char("owner_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 120 }).notNull(),
  layout: json("layout").$type<Record<string, unknown>>().notNull(),
  version: int("version").notNull().default(1),
  updatedById: char("updated_by_id", { length: 36 }),
  ...timestamps,
  ...softDelete,
});

export const dashboardGadgets = mysqlTable("dashboard_gadgets", {
  id: idCol(),
  dashboardId: char("dashboard_id", { length: 36 })
    .notNull()
    .references(() => dashboards.id),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 120 }).notNull(),
  config: json("config").$type<Record<string, unknown>>().notNull(),
  position: int("position").notNull().default(0),
  version: int("version").notNull().default(1),
  updatedById: char("updated_by_id", { length: 36 }),
  ...timestamps,
  ...softDelete,
});

export const labels = mysqlTable(
  "labels",
  {
    id: idCol(),
    projectId: char("project_id", { length: 36 })
      .notNull()
      .references(() => projects.id),
    name: varchar("name", { length: 64 }).notNull(),
    color: varchar("color", { length: 32 }),
    version: int("version").notNull().default(1),
    updatedById: char("updated_by_id", { length: 36 }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("labels_project_name_uidx").on(t.projectId, t.name),
    index("labels_project_idx").on(t.projectId),
  ],
);

export const issueLabels = mysqlTable(
  "issue_labels",
  {
    id: idCol(),
    issueId: char("issue_id", { length: 36 })
      .notNull()
      .references(() => issues.id),
    labelId: char("label_id", { length: 36 })
      .notNull()
      .references(() => labels.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("issue_labels_uidx").on(t.issueId, t.labelId),
    index("issue_labels_issue_idx").on(t.issueId),
    index("issue_labels_label_idx").on(t.labelId),
  ],
);

export const issueLinks = mysqlTable("issue_links", {
  id: idCol(),
  sourceIssueId: char("source_issue_id", { length: 36 })
    .notNull()
    .references(() => issues.id),
  targetIssueId: char("target_issue_id", { length: 36 })
    .notNull()
    .references(() => issues.id),
  linkType: varchar("link_type", { length: 32 }).notNull(),
  version: int("version").notNull().default(1),
  updatedById: char("updated_by_id", { length: 36 }),
  ...timestamps,
  ...softDelete,
});

export const comments = mysqlTable("comments", {
  id: idCol(),
  issueId: char("issue_id", { length: 36 })
    .notNull()
    .references(() => issues.id),
  authorId: char("author_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  version: int("version").notNull().default(1),
  updatedById: char("updated_by_id", { length: 36 }),
  ...timestamps,
  ...softDelete,
});

export const attachments = mysqlTable("attachments", {
  id: idCol(),
  issueId: char("issue_id", { length: 36 })
    .notNull()
    .references(() => issues.id),
  uploadedById: char("uploaded_by_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  contentType: varchar("content_type", { length: 128 }).notNull(),
  sizeBytes: int("size_bytes").notNull(),
  data: longblob("data").notNull(),
  version: int("version").notNull().default(1),
  updatedById: char("updated_by_id", { length: 36 }),
  ...timestamps,
  ...softDelete,
});

export const savedFilters = mysqlTable("saved_filters", {
  id: idCol(),
  projectId: char("project_id", { length: 36 })
    .notNull()
    .references(() => projects.id),
  ownerId: char("owner_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 120 }).notNull(),
  query: json("query").$type<Record<string, unknown>>().notNull(),
  version: int("version").notNull().default(1),
  updatedById: char("updated_by_id", { length: 36 }),
  ...timestamps,
  ...softDelete,
});

export const notifications = mysqlTable("notifications", {
  id: idCol(),
  userId: char("user_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  organizationId: char("organization_id", { length: 36 })
    .notNull()
    .references(() => organizations.id),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body"),
  entityType: varchar("entity_type", { length: 64 }),
  entityId: char("entity_id", { length: 36 }),
  readAt: timestamp("read_at"),
  ...timestamps,
  ...softDelete,
});

export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: idCol(),
  userId: char("user_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  ...timestamps,
});

export const auditEvents = mysqlTable(
  "audit_events",
  {
    id: idCol(),
    organizationId: char("organization_id", { length: 36 })
      .notNull()
      .references(() => organizations.id),
    actorId: char("actor_id", { length: 36 }),
    action: varchar("action", { length: 64 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: char("entity_id", { length: 36 }),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_events_created_idx").on(t.createdAt)],
);

export const syncIdempotency = mysqlTable(
  "sync_idempotency",
  {
    id: idCol(),
    idempotencyKey: char("idempotency_key", { length: 36 }).notNull(),
    userId: char("user_id", { length: 36 })
      .notNull()
      .references(() => users.id),
    result: json("result").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sync_idempotency_uidx").on(t.userId, t.idempotencyKey)],
);

export const schema = {
  users,
  identities,
  sessions,
  organizations,
  organizationMemberships,
  workspaces,
  workspaceMemberships,
  projects,
  projectMemberships,
  customRoles,
  projectPermissionOverrides,
  workflowStatuses,
  initiatives,
  epics,
  sprints,
  issues,
  components,
  issueComponents,
  projectVersions,
  issueTemplates,
  dashboards,
  dashboardGadgets,
  labels,
  issueLabels,
  issueLinks,
  comments,
  attachments,
  savedFilters,
  notifications,
  pushSubscriptions,
  auditEvents,
  syncIdempotency,
};
