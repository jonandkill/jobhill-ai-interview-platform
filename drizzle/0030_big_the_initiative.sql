CREATE TABLE `tts_error_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`errorMessage` text NOT NULL,
	`errorType` varchar(50) NOT NULL,
	`questionText` text,
	`voiceType` varchar(20),
	`sessionId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tts_error_logs_id` PRIMARY KEY(`id`)
);
