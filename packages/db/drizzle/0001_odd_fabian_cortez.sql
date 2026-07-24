CREATE TABLE `issue_labels` (
	`id` char(36) NOT NULL,
	`issue_id` char(36) NOT NULL,
	`label_id` char(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `issue_labels_id` PRIMARY KEY(`id`),
	CONSTRAINT `issue_labels_uidx` UNIQUE(`issue_id`,`label_id`)
);
--> statement-breakpoint
CREATE TABLE `labels` (
	`id` char(36) NOT NULL,
	`project_id` char(36) NOT NULL,
	`name` varchar(64) NOT NULL,
	`color` varchar(32),
	`version` int NOT NULL DEFAULT 1,
	`updated_by_id` char(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	`deleted_by_id` char(36),
	CONSTRAINT `labels_id` PRIMARY KEY(`id`),
	CONSTRAINT `labels_project_name_uidx` UNIQUE(`project_id`,`name`)
);
--> statement-breakpoint
ALTER TABLE `issues` ADD `priority` varchar(16) DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE `issue_labels` ADD CONSTRAINT `issue_labels_issue_id_issues_id_fk` FOREIGN KEY (`issue_id`) REFERENCES `issues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issue_labels` ADD CONSTRAINT `issue_labels_label_id_labels_id_fk` FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `labels` ADD CONSTRAINT `labels_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `issue_labels_issue_idx` ON `issue_labels` (`issue_id`);--> statement-breakpoint
CREATE INDEX `issue_labels_label_idx` ON `issue_labels` (`label_id`);--> statement-breakpoint
CREATE INDEX `labels_project_idx` ON `labels` (`project_id`);