CREATE TABLE `event_bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`company_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `training_events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_company_unique` ON `event_bookings` (`event_id`,`company_id`);--> statement-breakpoint
CREATE TABLE `training_events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`topic` text NOT NULL,
	`description` text NOT NULL,
	`starts_at` integer NOT NULL,
	`duration_min` integer DEFAULT 60 NOT NULL,
	`created_at` integer NOT NULL
);
