CREATE TABLE `feedback_ratings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`qaId` int NOT NULL,
	`userId` int NOT NULL,
	`rating` enum('helpful','needs_improvement') NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_ratings_id` PRIMARY KEY(`id`)
);
