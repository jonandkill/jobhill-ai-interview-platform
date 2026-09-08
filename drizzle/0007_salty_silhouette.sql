CREATE TABLE `interview_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`positionName` varchar(255),
	`interviewDate` timestamp NOT NULL,
	`interviewType` enum('phone','video','onsite','other') DEFAULT 'onsite',
	`location` varchar(500),
	`notes` text,
	`reminderDays` int DEFAULT 3,
	`reminderSent` boolean DEFAULT false,
	`status` enum('scheduled','completed','cancelled') DEFAULT 'scheduled',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `interview_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailNotification` boolean DEFAULT true,
	`inAppNotification` boolean DEFAULT true,
	`subscriptionReminder` boolean DEFAULT true,
	`interviewReminder` boolean DEFAULT true,
	`reminderDaysBefore` int DEFAULT 3,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_settings_userId_unique` UNIQUE(`userId`)
);
