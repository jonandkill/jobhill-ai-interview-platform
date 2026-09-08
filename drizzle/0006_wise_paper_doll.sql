CREATE TABLE `company_info_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`stockCode` varchar(20),
	`industry` varchar(255),
	`foundedYear` int,
	`employeeCount` int,
	`revenue` varchar(100),
	`newsData` text,
	`disclosureData` text,
	`blogData` text,
	`governmentData` text,
	`analyzedStage` enum('introduction','growth','maturity','decline'),
	`stageAnalysisReason` text,
	`lastUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `company_info_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_info_cache_companyName_unique` UNIQUE(`companyName`)
);
--> statement-breakpoint
CREATE TABLE `usage_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`userId` int,
	`featureType` enum('voice_interview','text_interview','company_analysis','difficult_question','feedback') NOT NULL,
	`usageCount` int NOT NULL DEFAULT 0,
	`lastUsedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `usage_tracking_id` PRIMARY KEY(`id`)
);
