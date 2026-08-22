ALTER TABLE `payments` ADD `refundedAmount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `payments` ADD `refundedAt` timestamp;--> statement-breakpoint
ALTER TABLE `payments` ADD `kiwoompayRefundTransactionId` varchar(255);--> statement-breakpoint
ALTER TABLE `payments` ADD `refundReason` varchar(200);