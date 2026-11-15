CREATE TABLE `ri_battles` (
	`owner` text NOT NULL,
	`tag` text NOT NULL,
	`id` text NOT NULL,
	`observed` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`owner`, `tag`, `id`)
);
--> statement-breakpoint
CREATE INDEX `ri_battles_time` ON `ri_battles` (`owner`,`tag`,`observed`);--> statement-breakpoint
CREATE TABLE `ri_choices` (
	`owner` text NOT NULL,
	`tag` text NOT NULL,
	`id` text NOT NULL,
	`observed` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`owner`, `tag`, `id`)
);
--> statement-breakpoint
CREATE INDEX `ri_choices_time` ON `ri_choices` (`owner`,`tag`,`observed`);--> statement-breakpoint
CREATE TABLE `ri_limits` (
	`owner` text PRIMARY KEY NOT NULL,
	`window` integer NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ri_snapshots` (
	`owner` text NOT NULL,
	`tag` text NOT NULL,
	`id` text NOT NULL,
	`observed` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`owner`, `tag`, `id`)
);
--> statement-breakpoint
CREATE INDEX `ri_snapshots_time` ON `ri_snapshots` (`owner`,`tag`,`observed`);