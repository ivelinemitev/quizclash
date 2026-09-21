CREATE TABLE `completed_games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_code` text NOT NULL,
	`quiz_id` integer NOT NULL,
	`started_at` text,
	`finished_at` text,
	FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `game_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`nickname` text NOT NULL,
	`score` integer NOT NULL,
	`rank` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `completed_games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quiz_id` integer NOT NULL,
	`position` integer NOT NULL,
	`text` text NOT NULL,
	`answer_0` text NOT NULL,
	`answer_1` text NOT NULL,
	`answer_2` text NOT NULL,
	`answer_3` text NOT NULL,
	`correct_answer_index` integer NOT NULL,
	FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`topic` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
