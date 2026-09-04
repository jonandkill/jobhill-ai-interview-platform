CREATE TABLE `admin_learning_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dataType` enum('interview_qa','company_info','job_info','feedback_template') NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`companyName` varchar(255),
	`positionType` varchar(255),
	`tags` text,
	`isActive` boolean DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_learning_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_practices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` int,
	`title` varchar(255) NOT NULL,
	`companyName` varchar(255),
	`positionName` varchar(255),
	`practiceType` enum('mock_interview','difficult_question','custom') DEFAULT 'mock_interview',
	`content` text NOT NULL,
	`overallScore` int,
	`notes` text,
	`isFavorite` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_practices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `userType` enum('new_grad','experienced','career_change','return') DEFAULT 'new_grad';--> statement-breakpoint
ALTER TABLE `users` ADD `freeTrialStartedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `freeTrialEndsAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `firstVisitAt` timestamp;