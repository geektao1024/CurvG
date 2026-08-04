CREATE TABLE `animation_planning_attempt` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`user_id` text NOT NULL,
	`run_id` text NOT NULL,
	`stage` text NOT NULL,
	`repair_attempt` integer DEFAULT 0 NOT NULL,
	`attempt_no` integer NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`status` text NOT NULL,
	`error_code` text,
	`error_message` text,
	`latency_ms` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_animation_attempt_run` ON `animation_planning_attempt` (`run_id`,`stage`);--> statement-breakpoint
CREATE INDEX `idx_animation_attempt_provider` ON `animation_planning_attempt` (`provider`,`model`,`created_at`);