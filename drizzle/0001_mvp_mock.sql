CREATE TABLE `company_surveys` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`title` text NOT NULL,
	`token` text NOT NULL,
	`round` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	`closed_at` integer,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_surveys_token_unique` ON `company_surveys` (`token`);--> statement-breakpoint
CREATE TABLE `integration_log` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`ref` text,
	`status` text DEFAULT 'ok' NOT NULL,
	`detail` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `integ_kind_idx` ON `integration_log` (`kind`);--> statement-breakpoint
CREATE INDEX `integ_ref_idx` ON `integration_log` (`ref`);--> statement-breakpoint
CREATE TABLE `ratings` (
	`id` text PRIMARY KEY NOT NULL,
	`appointment_id` text NOT NULL,
	`user_id` text NOT NULL,
	`specialist_id` text NOT NULL,
	`score` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rating_appt_unique` ON `ratings` (`appointment_id`);--> statement-breakpoint
CREATE INDEX `rating_spec_idx` ON `ratings` (`specialist_id`);