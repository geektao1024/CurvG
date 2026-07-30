CREATE TABLE `animation_planning_stage` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`user_id` text NOT NULL,
	`run_id` text NOT NULL,
	`stage` text NOT NULL,
	`sequence` integer NOT NULL,
	`status` text NOT NULL,
	`attempt` integer DEFAULT 0 NOT NULL,
	`input_hash` text NOT NULL,
	`output_hash` text,
	`artifact` text,
	`diagnostic` text,
	`error_code` text,
	`error_message` text,
	`request_id` text,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `chat`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_animation_planning_run_stage` ON `animation_planning_stage` (`run_id`,`stage`);--> statement-breakpoint
CREATE INDEX `idx_animation_planning_chat_status` ON `animation_planning_stage` (`chat_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_animation_planning_reuse` ON `animation_planning_stage` (`chat_id`,`stage`,`input_hash`,`status`);