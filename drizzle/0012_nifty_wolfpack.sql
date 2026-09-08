ALTER TABLE `payments` ADD `kiwoompayTrxId` varchar(255);--> statement-breakpoint
ALTER TABLE `payments` ADD `kiwoompayOrderNo` varchar(255);--> statement-breakpoint
ALTER TABLE `payments` ADD `paymentMethod` varchar(50);--> statement-breakpoint
ALTER TABLE `payments` ADD `cardName` varchar(100);--> statement-breakpoint
ALTER TABLE `payments` ADD `cardNo` varchar(50);--> statement-breakpoint
ALTER TABLE `payments` ADD `installment` int;--> statement-breakpoint
ALTER TABLE `payments` ADD `paymentGateway` enum('stripe','kiwoompay') DEFAULT 'stripe';--> statement-breakpoint
ALTER TABLE `payments` ADD `productType` varchar(50);--> statement-breakpoint
ALTER TABLE `payments` ADD `buyerName` varchar(100);--> statement-breakpoint
ALTER TABLE `payments` ADD `buyerEmail` varchar(255);--> statement-breakpoint
ALTER TABLE `payments` ADD `receiptUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `payments` ADD `receiptSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `payments` ADD `authDate` varchar(20);