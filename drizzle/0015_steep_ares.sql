ALTER TABLE `subscriptions` ADD `tossBillingKey` varchar(255);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `tossCustomerKey` varchar(300);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `nextBillingDate` timestamp;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `autoRenew` boolean DEFAULT true;