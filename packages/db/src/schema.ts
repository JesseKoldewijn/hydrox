import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  index,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

const softDelete = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedById: uuid("deleted_by_id"),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 320 }).notNull(),
  username: varchar("username", { length: 64 }).notNull(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  avatarUrl: text("avatar_url"),
  passwordHash: text("password_hash"),
  ...timestamps,
  ...softDelete,
}, (t) => [
  uniqueIndex("users_email_uidx").on(t.email),
  uniqueIndex("users_username_uidx").on(t.username),
]);

export const identities = pgTable(
  "identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    provider: varchar("provider", { length: 32 }).notNull(),
    externalId: varchar("external_id", { length: 255 }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("identities_provider_external_uidx").on(
      t.provider,
      t.externalId,
    ),
  ],
);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
});

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 48 }).notNull(),
    workosOrganizationId: varchar("workos_organization_id", { length: 255 }),
    version: integer("version").notNull().default(1),
    updatedById: uuid("updated_by_id"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [uniqueIndex("organizations_slug_uidx").on(t.slug)],
);

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: varchar("role", { length: 32 }).notNull().default("member"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("org_memberships_uidx").on(t.organizationId, t.userId),
  ],
);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  name: varchar("name", { length: 120 }).notNull(),
  key: varchar("key", { length: 32 }).notNull(),
  version: integer("version").notNull().default(1),
  updatedById: uuid("updated_by_id"),
  ...timestamps,
  ...softDelete,
});

export const workspaceMemberships = pgTable(
  "workspace_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: varchar("role", { length: 32 }).notNull().default("member"),
    workosDirectoryGroupId: varchar("workos_directory_group_id", {
      length: 255,
    }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("workspace_memberships_uidx").on(t.workspaceId, t.userId),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: varchar("name", { length: 120 }).notNull(),
    key: varchar("key", { length: 16 }).notNull(),
    description: text("description"),
    issueCounter: integer("issue_counter").notNull().default(0),
    version: integer("version").notNull().default(1),
    updatedById: uuid("updated_by_id"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("projects_org_key_uidx").on(t.organizationId, t.key),
  ],
);

export const projectMemberships = pgTable(
  "project_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: varchar("role", { length: 32 }).notNull().default("member"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("project_memberships_uidx").on(t.projectId, t.userId),
  ],
);

export const customRoles = pgTable("custom_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  name: varchar("name", { length: 80 }).notNull(),
  capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
  version: integer("version").notNull().default(1),
  updatedById: uuid("updated_by_id"),
  ...timestamps,
  ...softDelete,
});

export const projectPermissionOverrides = pgTable(
  "project_permission_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
    customRoleId: uuid("custom_role_id").references(() => customRoles.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("project_overrides_uidx").on(t.projectId, t.userId),
  ],
);

export const workflowStatuses = pgTable("workflow_statuses", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  name: varchar("name", { length: 80 }).notNull(),
  category: varchar("category", { length: 32 }).notNull(),
  position: integer("position").notNull().default(0),
  color: varchar("color", { length: 32 }),
  version: integer("version").notNull().default(1),
  updatedById: uuid("updated_by_id"),
  ...timestamps,
  ...softDelete,
});

export const initiatives = pgTable("initiatives", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  projectId: uuid("project_id").references(() => projects.id),
  scope: varchar("scope", { length: 32 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  version: integer("version").notNull().default(1),
  updatedById: uuid("updated_by_id"),
  ...timestamps,
  ...softDelete,
});

export const epics = pgTable("epics", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  initiativeId: uuid("initiative_id").references(() => initiatives.id),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  statusId: uuid("status_id").references(() => workflowStatuses.id),
  version: integer("version").notNull().default(1),
  updatedById: uuid("updated_by_id"),
  ...timestamps,
  ...softDelete,
});

export const sprints = pgTable("sprints", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  name: varchar("name", { length: 120 }).notNull(),
  goal: text("goal"),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  state: varchar("state", { length: 32 }).notNull().default("future"),
  version: integer("version").notNull().default(1),
  updatedById: uuid("updated_by_id"),
  ...timestamps,
  ...softDelete,
});

export const issues = pgTable(
  "issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    epicId: uuid("epic_id").references(() => epics.id),
    parentIssueId: uuid("parent_issue_id"),
    key: varchar("key", { length: 32 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    statusId: uuid("status_id")
      .notNull()
      .references(() => workflowStatuses.id),
    assigneeId: uuid("assignee_id").references(() => users.id),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id),
    sprintId: uuid("sprint_id").references(() => sprints.id),
    backlogRank: varchar("backlog_rank", { length: 64 }).notNull().default("m"),
    storyPoints: integer("story_points"),
    version: integer("version").notNull().default(1),
    updatedById: uuid("updated_by_id"),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex("issues_project_key_uidx").on(t.projectId, t.key),
    index("issues_project_idx").on(t.projectId),
    index("issues_sprint_idx").on(t.sprintId),
  ],
);

export const issueLinks = pgTable("issue_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceIssueId: uuid("source_issue_id")
    .notNull()
    .references(() => issues.id),
  targetIssueId: uuid("target_issue_id")
    .notNull()
    .references(() => issues.id),
  linkType: varchar("link_type", { length: 32 }).notNull(),
  version: integer("version").notNull().default(1),
  updatedById: uuid("updated_by_id"),
  ...timestamps,
  ...softDelete,
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueId: uuid("issue_id")
    .notNull()
    .references(() => issues.id),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  version: integer("version").notNull().default(1),
  updatedById: uuid("updated_by_id"),
  ...timestamps,
  ...softDelete,
});

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueId: uuid("issue_id")
    .notNull()
    .references(() => issues.id),
  uploadedById: uuid("uploaded_by_id")
    .notNull()
    .references(() => users.id),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  contentType: varchar("content_type", { length: 128 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  s3Key: text("s3_key").notNull(),
  version: integer("version").notNull().default(1),
  updatedById: uuid("updated_by_id"),
  ...timestamps,
  ...softDelete,
});

export const savedFilters = pgTable("saved_filters", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 120 }).notNull(),
  query: jsonb("query").$type<Record<string, unknown>>().notNull(),
  version: integer("version").notNull().default(1),
  updatedById: uuid("updated_by_id"),
  ...timestamps,
  ...softDelete,
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body"),
  entityType: varchar("entity_type", { length: 64 }),
  entityId: uuid("entity_id"),
  readAt: timestamp("read_at", { withTimezone: true }),
  ...timestamps,
  ...softDelete,
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  ...timestamps,
});

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    actorId: uuid("actor_id"),
    action: varchar("action", { length: 64 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("audit_events_created_idx").on(t.createdAt)],
);

export const syncIdempotency = pgTable(
  "sync_idempotency",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    idempotencyKey: uuid("idempotency_key").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    result: jsonb("result").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("sync_idempotency_uidx").on(t.userId, t.idempotencyKey),
  ],
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
  issueLinks,
  comments,
  attachments,
  savedFilters,
  notifications,
  pushSubscriptions,
  auditEvents,
  syncIdempotency,
};
