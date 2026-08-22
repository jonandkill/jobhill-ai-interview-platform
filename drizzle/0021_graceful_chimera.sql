CREATE TABLE `follow_up_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` int,
	`originalQuestion` text NOT NULL,
	`userAnswer` text NOT NULL,
	`followUpQuestion` text NOT NULL,
	`followUpAnswer` text,
	`followUpFeedback` text,
	`followUpScore` int,
	`difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
	`depth` int NOT NULL DEFAULT 1,
	`isBookmarked` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `follow_up_history_id` PRIMARY KEY(`id`)
);
