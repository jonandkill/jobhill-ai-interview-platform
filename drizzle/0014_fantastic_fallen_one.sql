ALTER TABLE `payments` MODIFY COLUMN `status` enum('pending','completed','failed','refunded','partial_refunded') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `payments` ADD `cancelReason` varchar(200);--> statement-breakpoint
ALTER TABLE `payments` ADD `cancelAmount` int;--> statement-breakpoint
ALTER TABLE `payments` ADD `canceledAt` timestamp;