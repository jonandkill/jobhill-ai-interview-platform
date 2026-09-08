-- 쿠폰 시스템 테이블 추가

-- 쿠폰 마스터 테이블
CREATE TABLE IF NOT EXISTS `coupons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL UNIQUE,
  `description` text,
  `discountType` enum('fixed', 'percentage') NOT NULL DEFAULT 'fixed',
  `discountValue` decimal(10, 2) NOT NULL,
  `maxDiscountAmount` decimal(10, 2),
  `minPurchaseAmount` decimal(10, 2),
  `usageLimit` int,
  `usageCount` int DEFAULT 0,
  `perUserLimit` int DEFAULT 1,
  `validFrom` datetime NOT NULL,
  `validUntil` datetime NOT NULL,
  `isActive` boolean DEFAULT true,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code_idx` (`code`),
  KEY `validFrom_idx` (`validFrom`),
  KEY `validUntil_idx` (`validUntil`),
  KEY `isActive_idx` (`isActive`)
);

-- 쿠폰 사용 내역 테이블
CREATE TABLE IF NOT EXISTS `couponUsages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `couponId` int NOT NULL,
  `userId` int NOT NULL,
  `paymentId` int,
  `discountAmount` decimal(10, 2) NOT NULL,
  `usedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE SET NULL,
  KEY `couponId_idx` (`couponId`),
  KEY `userId_idx` (`userId`),
  KEY `usedAt_idx` (`usedAt`)
);
