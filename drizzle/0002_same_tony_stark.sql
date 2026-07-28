CREATE TABLE `animation_template` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`title_en` text NOT NULL,
	`title_zh` text NOT NULL,
	`description_en` text NOT NULL,
	`description_zh` text NOT NULL,
	`math_object_type` text NOT NULL,
	`preview_formula` text NOT NULL,
	`parameter_schema` text NOT NULL,
	`spec` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `animation_template_slug_unique` ON `animation_template` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_animation_template_status` ON `animation_template` (`status`);