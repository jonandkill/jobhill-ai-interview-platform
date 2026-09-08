CREATE TABLE `game_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`gameType` enum('rps','rotation','numberClick','pathMaking') NOT NULL,
	`score` int NOT NULL,
	`timeSpent` int,
	`level` int DEFAULT 1,
	`mistakes` int DEFAULT 0,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_results_id` PRIMARY KEY(`id`)
);
