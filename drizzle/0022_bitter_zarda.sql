ALTER TABLE `notification_logs` ADD `isRead` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_logs` ADD `readAt` timestamp;