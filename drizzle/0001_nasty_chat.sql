CREATE TABLE `company_analysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`companyStage` enum('introduction','growth','maturity','decline') NOT NULL,
	`positionType` varchar(255),
	`situationAnalysis` text,
	`practicalTasks` text,
	`relatedDepartments` text,
	`partners` text,
	`weeklyTasks` text,
	`monthlyTasks` text,
	`quarterlyTasks` text,
	`semiAnnualTasks` text,
	`annualTasks` text,
	`jobFitness` text,
	`jobExpertise` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_analysis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interview_qa` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`questionOrder` int NOT NULL,
	`questionType` enum('personality','experience','technical','situational','company') NOT NULL DEFAULT 'personality',
	`question` text NOT NULL,
	`userAnswer` text,
	`feedback` text,
	`score` int,
	`strengths` text,
	`improvements` text,
	`suggestedAnswer` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `interview_qa_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interview_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyName` varchar(255),
	`positionType` varchar(255),
	`interviewType` varchar(100),
	`questions` text,
	`tips` text,
	`difficulty` enum('easy','medium','hard') DEFAULT 'medium',
	`isPublic` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `interview_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interview_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`profileId` int,
	`sessionType` enum('mock_interview','feedback_only') NOT NULL DEFAULT 'mock_interview',
	`status` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`totalQuestions` int DEFAULT 5,
	`completedQuestions` int DEFAULT 0,
	`overallScore` int,
	`overallFeedback` text,
	`paymentId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `interview_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stripePaymentId` varchar(255),
	`stripeCustomerId` varchar(255),
	`paymentType` enum('single','subscription') NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'KRW',
	`status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stripeSubscriptionId` varchar(255),
	`stripeCustomerId` varchar(255),
	`status` enum('active','cancelled','past_due','expired') NOT NULL DEFAULT 'active',
	`planType` enum('monthly') NOT NULL DEFAULT 'monthly',
	`amount` int NOT NULL DEFAULT 9900,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`cancelledAt` timestamp,
	`cancelNotificationSent` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`resume` text,
	`coverLetter` text,
	`targetCompany` varchar(255),
	`targetPosition` varchar(255),
	`experience` text,
	`education` text,
	`skills` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`)
);
