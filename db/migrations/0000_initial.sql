CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`tamagitchi_id` text NOT NULL,
	`type` text NOT NULL,
	`subtype` text NOT NULL,
	`points` integer DEFAULT 0 NOT NULL,
	`experience_gained` integer DEFAULT 0 NOT NULL,
	`happiness_change` real DEFAULT 0 NOT NULL,
	`energy_change` real DEFAULT 0 NOT NULL,
	`hunger_change` real DEFAULT 0 NOT NULL,
	`timestamp` integer NOT NULL,
	`issue_number` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tamagitchi_id`) REFERENCES `tamagitchis`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tamagitchis` (
	`id` text PRIMARY KEY NOT NULL,
	`colo` text NOT NULL,
	`name` text NOT NULL,
	`health` real DEFAULT 100 NOT NULL,
	`happiness` real DEFAULT 100 NOT NULL,
	`energy` real DEFAULT 100 NOT NULL,
	`hunger` real DEFAULT 0 NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`experience` integer DEFAULT 0 NOT NULL,
	`total_interactions` integer DEFAULT 0 NOT NULL,
	`last_fed` integer,
	`last_played` integer,
	`state` text DEFAULT 'happy' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`github_username` text NOT NULL,
	`display_name` text,
	`avatar_url` text,
	`created_at` integer NOT NULL,
	`last_activity` integer,
	`last_seen` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_github_username_unique` ON `users` (`github_username`);