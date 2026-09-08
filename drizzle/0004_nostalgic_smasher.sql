ALTER TABLE `subscriptions` MODIFY COLUMN `status` enum('active','trialing','cancelled','past_due','expired') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `subscriptions` MODIFY COLUMN `planType` enum('monthly','basic','premium','premium_plus') NOT NULL DEFAULT 'monthly';--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `trialEndDate` timestamp;