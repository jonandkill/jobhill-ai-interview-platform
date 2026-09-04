CREATE TABLE `credit_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('purchase','use','bonus','refund','expire') NOT NULL,
	`amount` int NOT NULL,
	`balance` int NOT NULL,
	`description` varchar(255),
	`relatedPaymentId` int,
	`relatedSessionId` int,
	`isFirstPurchase` boolean DEFAULT false,
	`bonusCredits` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_history_id` PRIMARY KEY(`id`)
);
