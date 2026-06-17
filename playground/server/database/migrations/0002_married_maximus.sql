CREATE TABLE `medias` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`filename` text NOT NULL,
	`alt_text` text,
	`filepath` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
