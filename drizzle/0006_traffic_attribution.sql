ALTER TABLE `order` ADD `ft_source` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `order` ADD `ft_medium` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `order` ADD `ft_campaign` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `order` ADD `ft_landing_path` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `order` ADD `ft_referrer` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `order` ADD `ft_at` integer;--> statement-breakpoint
ALTER TABLE `order` ADD `lt_source` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `order` ADD `lt_landing_path` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `order` ADD `lt_at` integer;--> statement-breakpoint
CREATE INDEX `idx_order_ft_source` ON `order` (`ft_source`);--> statement-breakpoint
ALTER TABLE `user` ADD `ft_source` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `ft_medium` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `ft_campaign` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `ft_landing_path` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `ft_referrer` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `ft_at` integer;--> statement-breakpoint
CREATE INDEX `idx_user_ft_source` ON `user` (`ft_source`);