CREATE TABLE `access_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`code` text NOT NULL,
	`kind` text DEFAULT 'shared' NOT NULL,
	`max_uses` integer,
	`used_count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_codes_code_unique` ON `access_codes` (`code`);--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`specialist_id` text NOT NULL,
	`kind` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`status` text DEFAULT 'booked' NOT NULL,
	`recurrence_id` text,
	`video_provider` text,
	`video_room_url` text,
	`video_host_url` text,
	`price_cents` integer DEFAULT 0 NOT NULL,
	`payment_source` text DEFAULT 'free' NOT NULL,
	`hold_until` integer,
	`cancelled_at` integer,
	`cancelled_by` text,
	`outcome_note` text,
	`reminded_24` integer DEFAULT false NOT NULL,
	`reminded_1` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`specialist_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `appt_slot_unique` ON `appointments` (`specialist_id`,`starts_at`) WHERE status in ('booked','pending_payment');--> statement-breakpoint
CREATE INDEX `appt_user_idx` ON `appointments` (`user_id`);--> statement-breakpoint
CREATE INDEX `appt_specialist_idx` ON `appointments` (`specialist_id`,`starts_at`);--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`filename` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`storage_key` text NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`actor_role` text,
	`action` text NOT NULL,
	`subject_type` text,
	`subject_id` text,
	`reason` text,
	`ip` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `auth_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_tokens_token_hash_unique` ON `auth_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `availability_exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`specialist_id` text NOT NULL,
	`day` text NOT NULL,
	`note` text,
	FOREIGN KEY (`specialist_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `availability_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`specialist_id` text NOT NULL,
	`weekday` integer NOT NULL,
	`start_min` integer NOT NULL,
	`end_min` integer NOT NULL,
	`kind` text NOT NULL,
	FOREIGN KEY (`specialist_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `care_relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`specialist_id` text NOT NULL,
	`status` text DEFAULT 'intro_booked' NOT NULL,
	`change_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`specialist_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `care_unique` ON `care_relationships` (`user_id`,`specialist_id`);--> statement-breakpoint
CREATE TABLE `clinical_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`specialist_id` text NOT NULL,
	`user_id` text,
	`severity` text DEFAULT 'info' NOT NULL,
	`body_enc` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`handled_by` text,
	`outcome` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`vat_number` text,
	`sdi_code` text,
	`pec` text,
	`covered_employees` integer DEFAULT 0 NOT NULL,
	`included_sessions` integer DEFAULT 3 NOT NULL,
	`discount_pct` integer DEFAULT 0 NOT NULL,
	`covered_specialties` text NOT NULL,
	`family_max` integer DEFAULT 0 NOT NULL,
	`family_discount_pct` integer DEFAULT 0 NOT NULL,
	`allowed_domains` text NOT NULL,
	`allow_personal_email` integer DEFAULT false NOT NULL,
	`annual_fee_cents` integer DEFAULT 0 NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`pipeline_stage` text DEFAULT 'lancio' NOT NULL,
	`contract_value_cents` integer DEFAULT 0 NOT NULL,
	`account_owner` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `companies_slug_unique` ON `companies` (`slug`);--> statement-breakpoint
CREATE TABLE `company_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`number` text NOT NULL,
	`kind` text DEFAULT 'invoice' NOT NULL,
	`amount_cents` integer NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'issued' NOT NULL,
	`issued_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `company_invoices_number_unique` ON `company_invoices` (`number`);--> statement-breakpoint
CREATE TABLE `consents` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`version` text NOT NULL,
	`granted_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `counters` (
	`name` text PRIMARY KEY NOT NULL,
	`value` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `credit_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`user_id` text,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`appointment_id` text,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `credit_company_idx` ON `credit_ledger` (`company_id`);--> statement-breakpoint
CREATE INDEX `credit_user_idx` ON `credit_ledger` (`user_id`);--> statement-breakpoint
CREATE TABLE `email_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`to_email` text NOT NULL,
	`template_key` text,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'sent' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `email_templates` (
	`key` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pseudonym` text NOT NULL,
	`type` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`meta` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ev_pseudo_idx` ON `events` (`pseudonym`);--> statement-breakpoint
CREATE INDEX `ev_type_idx` ON `events` (`type`);--> statement-breakpoint
CREATE TABLE `family_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`employee_id` text NOT NULL,
	`company_id` text NOT NULL,
	`used_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `family_invites_code_unique` ON `family_invites` (`code`);--> statement-breakpoint
CREATE TABLE `gdpr_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`user_email` text,
	`kind` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`note` text,
	`due_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`closed_at` integer
);
--> statement-breakpoint
CREATE TABLE `intake_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`data_enc` text NOT NULL,
	`step` integer DEFAULT 0 NOT NULL,
	`completed_at` integer,
	`safety_flag` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`kind` text DEFAULT 'invoice' NOT NULL,
	`payment_id` text,
	`user_id` text,
	`bill_to_name` text,
	`bill_to_email` text,
	`description` text NOT NULL,
	`total_cents` integer NOT NULL,
	`issued_at` integer NOT NULL,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_number_unique` ON `invoices` (`number`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`body_enc` text NOT NULL,
	`created_at` integer NOT NULL,
	`read_at` integer,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `msg_thread_idx` ON `messages` (`thread_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`text` text NOT NULL,
	`href` text,
	`read_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notif_user_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`appointment_id` text,
	`specialist_id` text,
	`amount_cents` integer NOT NULL,
	`discount_cents` integer DEFAULT 0 NOT NULL,
	`fee_cents` integer DEFAULT 0 NOT NULL,
	`specialist_net_cents` integer DEFAULT 0 NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`provider` text DEFAULT 'mock' NOT NULL,
	`provider_ref` text,
	`refunded_cents` integer DEFAULT 0 NOT NULL,
	`failure_reason` text,
	`created_at` integer NOT NULL,
	`paid_at` integer,
	`payout_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`specialist_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `pay_user_idx` ON `payments` (`user_id`);--> statement-breakpoint
CREATE INDEX `pay_specialist_idx` ON `payments` (`specialist_id`);--> statement-breakpoint
CREATE TABLE `payouts` (
	`id` text PRIMARY KEY NOT NULL,
	`specialist_id` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`sessions_count` integer NOT NULL,
	`gross_cents` integer NOT NULL,
	`fee_cents` integer NOT NULL,
	`net_cents` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`provider_ref` text,
	`paid_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`specialist_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pseudonym_map` (
	`user_id` text PRIMARY KEY NOT NULL,
	`pseudonym` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pseudo_unique` ON `pseudonym_map` (`pseudonym`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`definitions_version` text NOT NULL,
	`k_min` integer NOT NULL,
	`payload` text NOT NULL,
	`sample_size` integer NOT NULL,
	`supersedes_id` text,
	`created_by` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pseudonym` text NOT NULL,
	`instrument` text NOT NULL,
	`version` text NOT NULL,
	`moment` text NOT NULL,
	`score` real,
	`items` text NOT NULL,
	`answered_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `resp_pseudo_idx` ON `responses` (`pseudonym`);--> statement-breakpoint
CREATE TABLE `safety_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`trigger` text NOT NULL,
	`created_at` integer NOT NULL,
	`cleared_at` integer,
	`cleared_by` text
);
--> statement-breakpoint
CREATE TABLE `session_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`appointment_id` text NOT NULL,
	`specialist_id` text NOT NULL,
	`user_id` text,
	`content_enc` text NOT NULL,
	`retained` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_notes_appointment_id_unique` ON `session_notes` (`appointment_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `specialist_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`specialist_id` text NOT NULL,
	`kind` text NOT NULL,
	`filename` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`storage_key` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`specialist_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `specialist_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`title` text,
	`bio` text,
	`approach` text,
	`specializations` text NOT NULL,
	`languages` text NOT NULL,
	`gender` text,
	`age_groups` text NOT NULL,
	`photo_url` text,
	`registry_name` text,
	`registry_number` text,
	`rc_policy_number` text,
	`cv_text` text,
	`response_hours` text,
	`session_minutes` integer DEFAULT 50 NOT NULL,
	`price_cents` integer DEFAULT 4900 NOT NULL,
	`weekly_capacity` integer DEFAULT 15 NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`pending_changes` text,
	`pending_submitted_at` integer,
	`status_note` text,
	`approved_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`pseudonym` text PRIMARY KEY NOT NULL,
	`company_id` text,
	`gender` text,
	`age_band` text,
	`children_count` integer,
	`children_age_band` text,
	`site` text,
	`job_level` text,
	`area` text,
	`first_path` integer,
	`consent_aggregate` integer DEFAULT false NOT NULL,
	`registered_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `subj_company_idx` ON `subjects` (`company_id`);--> statement-breakpoint
CREATE TABLE `threads` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`specialist_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `thread_unique` ON `threads` (`user_id`,`specialist_id`);--> statement-breakpoint
CREATE TABLE `ticket_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL,
	`sender_id` text,
	`from_staff` integer DEFAULT false NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`subject` text NOT NULL,
	`category` text DEFAULT 'general' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`related_appointment_id` text,
	`first_response_at` integer,
	`created_at` integer NOT NULL,
	`closed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`full_name` text,
	`phone` text,
	`role` text DEFAULT 'user' NOT NULL,
	`timezone` text DEFAULT 'Europe/Rome' NOT NULL,
	`email_verified_at` integer,
	`totp_secret_enc` text,
	`totp_enabled` integer DEFAULT false NOT NULL,
	`company_id` text,
	`coverage_kind` text,
	`onboarding_path` text,
	`family_of_user_id` text,
	`access_code_id` text,
	`gender` text,
	`birth_year` integer,
	`site` text,
	`job_level` text,
	`status` text DEFAULT 'active' NOT NULL,
	`failed_logins` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`last_login_at` integer,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_company_idx` ON `users` (`company_id`);