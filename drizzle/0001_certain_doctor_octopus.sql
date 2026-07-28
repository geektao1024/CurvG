CREATE TABLE `animation_generation_lease` (
	`slot_id` text PRIMARY KEY NOT NULL,
	`lease_token` text,
	`user_id` text,
	`expires_at` integer,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `animation_generation_lease_user_id_unique` ON `animation_generation_lease` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_animation_lease_expires` ON `animation_generation_lease` (`expires_at`);--> statement-breakpoint
CREATE TABLE `payment_checkout_lease` (
	`user_id` text PRIMARY KEY NOT NULL,
	`lease_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
DROP INDEX `idx_subscription_provider_id`;--> statement-breakpoint
CREATE UNIQUE INDEX `uidx_subscription_provider_id` ON `subscription` (`payment_provider`,`subscription_id`);