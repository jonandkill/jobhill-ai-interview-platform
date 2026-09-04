CREATE TABLE `difficult_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`question` text NOT NULL,
	`category` varchar(100),
	`userAnswer` text,
	`aiFeedback` text,
	`practiceCount` int DEFAULT 0,
	`lastPracticedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `difficult_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `interview_sessions` MODIFY COLUMN `sessionType` enum('mock_interview','feedback_only','voice_interview') NOT NULL DEFAULT 'mock_interview';--> statement-breakpoint
ALTER TABLE `subscriptions` MODIFY COLUMN `planType` enum('monthly','basic','premium') NOT NULL DEFAULT 'monthly';--> statement-breakpoint
ALTER TABLE `interview_sessions` ADD `isVoiceMode` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `interview_sessions` ADD `balanceAnalysis` text;--> statement-breakpoint
ALTER TABLE `interview_sessions` ADD `passRate` int;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `resumeFileUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `resumeFileName` varchar(255);--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `coverLetterFileUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `coverLetterFileName` varchar(255);