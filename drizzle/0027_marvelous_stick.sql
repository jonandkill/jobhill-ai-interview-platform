CREATE TABLE `payment_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planType` enum('monthly','basic','premium','premium_plus') NOT NULL,
	`externalUrl` varchar(512) NOT NULL,
	`description` varchar(255),
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planType` enum('monthly','basic','premium','premium_plus') NOT NULL,
	`amount` int NOT NULL,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`externalPaymentId` varchar(255),
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectedReason` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user_reviews` ADD `couponIssued` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `user_reviews` ADD `issuedCouponId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `completedInterviews` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lastMilestoneReached` int DEFAULT 0 NOT NULL;