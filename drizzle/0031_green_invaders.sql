ALTER TABLE `users` ADD `freeUnlimitedCount` int DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `voiceInterviewEnabled` boolean DEFAULT false NOT NULL;