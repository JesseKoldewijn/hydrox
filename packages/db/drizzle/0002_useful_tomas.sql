CREATE TABLE `components` (
	`id` char(36) NOT NULL,
	`project_id` char(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`lead_user_id` char(36),
	`version` int NOT NULL DEFAULT 1,
	`updated_by_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `components_id` PRIMARY KEY(`id`),
	CONSTRAINT `components_project_name_uidx` UNIQUE(`project_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `dashboard_gadgets` (
	`id` char(36) NOT NULL,
	`dashboard_id` char(36) NOT NULL,
	`type` varchar(64) NOT NULL,
	`title` varchar(120) NOT NULL,
	`config` json NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`version` int NOT NULL DEFAULT 1,
	`updated_by_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `dashboard_gadgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dashboards` (
	`id` char(36) NOT NULL,
	`project_id` char(36) NOT NULL,
	`owner_id` char(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`layout` json NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`updated_by_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `dashboards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `issue_components` (
	`id` char(36) NOT NULL,
	`issue_id` char(36) NOT NULL,
	`component_id` char(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `issue_components_id` PRIMARY KEY(`id`),
	CONSTRAINT `issue_components_uidx` UNIQUE(`issue_id`,`component_id`)
);
--> statement-breakpoint
CREATE TABLE `issue_templates` (
	`id` char(36) NOT NULL,
	`project_id` char(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`defaults` json NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`updated_by_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `issue_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_versions` (
	`id` char(36) NOT NULL,
	`project_id` char(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`release_date` timestamp,
	`start_date` timestamp,
	`released` int NOT NULL DEFAULT 0,
	`archived` int NOT NULL DEFAULT 0,
	`version` int NOT NULL DEFAULT 1,
	`updated_by_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `project_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_versions_name_uidx` UNIQUE(`project_id`,`name`)
);
--> statement-breakpoint
ALTER TABLE `epics` ADD `start_date` timestamp;--> statement-breakpoint
ALTER TABLE `epics` ADD `target_date` timestamp;--> statement-breakpoint
ALTER TABLE `issues` ADD `due_date` timestamp;--> statement-breakpoint
ALTER TABLE `issues` ADD `original_estimate_minutes` int;--> statement-breakpoint
ALTER TABLE `issues` ADD `remaining_estimate_minutes` int;--> statement-breakpoint
ALTER TABLE `issues` ADD `fix_version_id` char(36);--> statement-breakpoint
ALTER TABLE `components` ADD CONSTRAINT `components_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `components` ADD CONSTRAINT `components_lead_user_id_users_id_fk` FOREIGN KEY (`lead_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dashboard_gadgets` ADD CONSTRAINT `dashboard_gadgets_dashboard_id_dashboards_id_fk` FOREIGN KEY (`dashboard_id`) REFERENCES `dashboards`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dashboards` ADD CONSTRAINT `dashboards_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dashboards` ADD CONSTRAINT `dashboards_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issue_components` ADD CONSTRAINT `issue_components_issue_id_issues_id_fk` FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issue_components` ADD CONSTRAINT `issue_components_component_id_components_id_fk` FOREIGN KEY (`component_id`) REFERENCES `components`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issue_templates` ADD CONSTRAINT `issue_templates_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_versions` ADD CONSTRAINT `project_versions_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `components_project_idx` ON `components` (`project_id`);--> statement-breakpoint
CREATE INDEX `issue_components_issue_idx` ON `issue_components` (`issue_id`);--> statement-breakpoint
CREATE INDEX `project_versions_project_idx` ON `project_versions` (`project_id`);