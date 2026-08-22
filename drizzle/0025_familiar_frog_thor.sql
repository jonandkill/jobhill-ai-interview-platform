ALTER TABLE `payments` MODIFY COLUMN `paymentGateway` enum('kiwoompay') DEFAULT 'kiwoompay';--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `kiwoompayAutoKey` varchar(255);--> statement-breakpoint
ALTER TABLE `payments` DROP COLUMN `stripePaymentId`;--> statement-breakpoint
ALTER TABLE `payments` DROP COLUMN `stripeCustomerId`;--> statement-breakpoint
ALTER TABLE `subscriptions` DROP COLUMN `stripeSubscriptionId`;--> statement-breakpoint
ALTER TABLE `subscriptions` DROP COLUMN `stripeCustomerId`;