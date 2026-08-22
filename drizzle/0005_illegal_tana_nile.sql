CREATE TABLE `cover_letter_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`userId` int NOT NULL,
	`itemOrder` int NOT NULL,
	`itemTitle` varchar(500) NOT NULL,
	`maxLength` int,
	`content` text,
	`currentLength` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cover_letter_items_id` PRIMARY KEY(`id`)
);
