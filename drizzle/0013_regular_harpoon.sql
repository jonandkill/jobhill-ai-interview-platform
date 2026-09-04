CREATE TABLE `shared_list_feedbacks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sharedListId` int NOT NULL,
	`userId` int,
	`authorName` varchar(100),
	`content` text NOT NULL,
	`rating` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shared_list_feedbacks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shared_question_lists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`shareCode` varchar(32) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`questions` text NOT NULL,
	`targetCompany` varchar(255),
	`targetPosition` varchar(255),
	`viewCount` int DEFAULT 0,
	`isPublic` boolean DEFAULT true,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shared_question_lists_id` PRIMARY KEY(`id`),
	CONSTRAINT `shared_question_lists_shareCode_unique` UNIQUE(`shareCode`)
);
--> statement-breakpoint
ALTER TABLE `interview_qa` ADD `answerDuration` int;--> statement-breakpoint
ALTER TABLE `interview_qa` ADD `revisedAnswer` text;--> statement-breakpoint
ALTER TABLE `interview_qa` ADD `revisedFeedback` text;--> statement-breakpoint
ALTER TABLE `interview_qa` ADD `revisedScore` int;