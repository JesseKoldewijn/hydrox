CREATE TABLE `attachments` (
	`id` char(36) NOT NULL,
	`issue_id` char(36) NOT NULL,
	`uploaded_by_id` char(36) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`content_type` varchar(128) NOT NULL,
	`size_bytes` int NOT NULL,
	`data` longblob NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`updated_by_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` char(36) NOT NULL,
	`organization_id` char(36) NOT NULL,
	`actor_id` char(36),
	`action` varchar(64) NOT NULL,
	`entity_type` varchar(64) NOT NULL,
	`entity_id` char(36),
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` char(36) NOT NULL,
	`issue_id` char(36) NOT NULL,
	`author_id` char(36) NOT NULL,
	`body` text NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`updated_by_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_roles` (
	`id` char(36) NOT NULL,
	`organization_id` char(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`capabilities` json NOT NULL DEFAULT (JSON_ARRAY()),
	`version` int NOT NULL DEFAULT 1,
	`updated_by_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `custom_roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `epics` (
	`id` char(36) NOT NULL,
	`project_id` char(36) NOT NULL,
	`initiative_id` char(36),
	`name` varchar(200) NOT NULL,
	`description` text,
	`status_id` char(36),
	`version` int NOT NULL DEFAULT 1,
	`updated_by_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `epics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `identities` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`provider` varchar(32) NOT NULL,
	`external_id` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `identities_id` PRIMARY KEY(`id`),
	CONSTRAINT `identities_provider_external_uidx` UNIQUE(`provider`,`external_id`)
);
--> statement-breakpoint
CREATE TABLE `initiatives` (
	`id` char(36) NOT NULL,
	`organization_id` char(36) NOT NULL,
	`project_id` char(36),
	`scope` varchar(32) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`version` int NOT NULL DEFAULT 1,
	`updated_by_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `initiatives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `issue_links` (
	`id` char(36) NOT NULL,
	`source_issue_id` char(36) NOT NULL,
	`target_issue_id` char(36) NOT NULL,
	`link_type` varchar(32) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`updated_by_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `issue_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `issues` (
	`id` char(36) NOT NULL,
	`project_id` char(36) NOT NULL,
	`epic_id` char(36),
	`parent_issue_id` char(36),
	`key` varchar(32) NOT NULL,
	`type` varchar(32) NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`status_id` char(36) NOT NULL,
	`assignee_id` char(36),
	`reporter_id` char(36) NOT NULL,
	`sprint_id` char(36),
	`backlog_rank` varchar(64) NOT NULL DEFAULT 'm',
	`story_points` int,
	`version` int NOT NULL DEFAULT 1,
	`updated_by_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `issues_id` PRIMARY KEY(`id`),
	CONSTRAINT `issues_project_key_uidx` UNIQUE(`project_id`,`key`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`organization_id` char(36) NOT NULL,
	`type` varchar(64) NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` text,
	`entity_type` varchar(64),
	`entity_id` char(36),
	`read_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organization_memberships` (
	`id` char(36) NOT NULL,
	`organization_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`role` varchar(32) NOT NULL DEFAULT 'member',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `organization_memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_memberships_uidx` UNIQUE(`organization_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` char(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`slug` varchar(48) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`updated_by_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_uidx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `project_memberships` (
	`id` char(36) NOT NULL,
	`project_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`role` varchar(32) NOT NULL DEFAULT 'member',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `project_memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_memberships_uidx` UNIQUE(`project_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `project_permission_overrides` (
	`id` char(36) NOT NULL,
	`project_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`capabilities` json NOT NULL DEFAULT (JSON_ARRAY()),
	`custom_role_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_permission_overrides_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_overrides_uidx` UNIQUE(`project_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` char(36) NOT NULL,
	`workspace_id` char(36) NOT NULL,
	`organization_id` char(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`key` varchar(16) NOT NULL,
	`description` text,
	`issue_counter` int NOT NULL DEFAULT 0,
	`version` int NOT NULL DEFAULT 1,
	`updated_by_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_org_key_uidx` UNIQUE(`organization_id`,`key`)
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_filters` (
	`id` char(36) NOT NULL,
	`project_id` char(36) NOT NULL,
	`owner_id` char(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`query` json NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`updated_by_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `saved_filters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sprints` (
	`id` char(36) NOT NULL,
	`project_id` char(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`goal` text,
	`start_date` timestamp,
	`end_date` timestamp,
	`state` varchar(32) NOT NULL DEFAULT 'future',
	`version` int NOT NULL DEFAULT 1,
	`updated_by_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `sprints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sync_idempotency` (
	`id` char(36) NOT NULL,
	`idempotency_key` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`result` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sync_idempotency_id` PRIMARY KEY(`id`),
	CONSTRAINT `sync_idempotency_uidx` UNIQUE(`user_id`,`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` char(36) NOT NULL,
	`email` varchar(320) NOT NULL,
	`username` varchar(64) NOT NULL,
	`display_name` varchar(120) NOT NULL,
	`avatar_url` text,
	`password_hash` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_uidx` UNIQUE(`email`),
	CONSTRAINT `users_username_uidx` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `workflow_statuses` (
	`id` char(36) NOT NULL,
	`project_id` char(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`category` varchar(32) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`color` varchar(32),
	`version` int NOT NULL DEFAULT 1,
	`updated_by_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `workflow_statuses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspace_memberships` (
	`id` char(36) NOT NULL,
	`workspace_id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`role` varchar(32) NOT NULL DEFAULT 'member',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `workspace_memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspace_memberships_uidx` UNIQUE(`workspace_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` char(36) NOT NULL,
	`organization_id` char(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`key` varchar(32) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`updated_by_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_issue_id_issues_id_fk` FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_uploaded_by_id_users_id_fk` FOREIGN KEY (`uploaded_by_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_events` ADD CONSTRAINT `audit_events_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_issue_id_issues_id_fk` FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_roles` ADD CONSTRAINT `custom_roles_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `epics` ADD CONSTRAINT `epics_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `epics` ADD CONSTRAINT `epics_initiative_id_initiatives_id_fk` FOREIGN KEY (`initiative_id`) REFERENCES `initiatives`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `epics` ADD CONSTRAINT `epics_status_id_workflow_statuses_id_fk` FOREIGN KEY (`status_id`) REFERENCES `workflow_statuses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `identities` ADD CONSTRAINT `identities_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `initiatives` ADD CONSTRAINT `initiatives_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `initiatives` ADD CONSTRAINT `initiatives_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issue_links` ADD CONSTRAINT `issue_links_source_issue_id_issues_id_fk` FOREIGN KEY (`source_issue_id`) REFERENCES `issues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issue_links` ADD CONSTRAINT `issue_links_target_issue_id_issues_id_fk` FOREIGN KEY (`target_issue_id`) REFERENCES `issues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issues` ADD CONSTRAINT `issues_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issues` ADD CONSTRAINT `issues_epic_id_epics_id_fk` FOREIGN KEY (`epic_id`) REFERENCES `epics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issues` ADD CONSTRAINT `issues_status_id_workflow_statuses_id_fk` FOREIGN KEY (`status_id`) REFERENCES `workflow_statuses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issues` ADD CONSTRAINT `issues_assignee_id_users_id_fk` FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issues` ADD CONSTRAINT `issues_reporter_id_users_id_fk` FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issues` ADD CONSTRAINT `issues_sprint_id_sprints_id_fk` FOREIGN KEY (`sprint_id`) REFERENCES `sprints`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_memberships` ADD CONSTRAINT `organization_memberships_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_memberships` ADD CONSTRAINT `organization_memberships_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_memberships` ADD CONSTRAINT `project_memberships_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_memberships` ADD CONSTRAINT `project_memberships_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_permission_overrides` ADD CONSTRAINT `project_permission_overrides_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_permission_overrides` ADD CONSTRAINT `project_permission_overrides_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_permission_overrides` ADD CONSTRAINT `project_permission_overrides_custom_role_id_custom_roles_id_fk` FOREIGN KEY (`custom_role_id`) REFERENCES `custom_roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `push_subscriptions` ADD CONSTRAINT `push_subscriptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_filters` ADD CONSTRAINT `saved_filters_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_filters` ADD CONSTRAINT `saved_filters_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sprints` ADD CONSTRAINT `sprints_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_idempotency` ADD CONSTRAINT `sync_idempotency_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workflow_statuses` ADD CONSTRAINT `workflow_statuses_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_memberships` ADD CONSTRAINT `workspace_memberships_workspace_id_workspaces_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_memberships` ADD CONSTRAINT `workspace_memberships_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspaces` ADD CONSTRAINT `workspaces_organization_id_organizations_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_events_created_idx` ON `audit_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `issues_project_idx` ON `issues` (`project_id`);--> statement-breakpoint
CREATE INDEX `issues_sprint_idx` ON `issues` (`sprint_id`);