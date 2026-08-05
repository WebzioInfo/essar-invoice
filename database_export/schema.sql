-- Essar ERP Live Database Schema DDL Dump
-- Generated: 2026-08-05T20:37:18.690Z
-- Database Engine: MariaDB 10.11.15-MariaDB-log
-- Database Name: db43250

SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `role` ENUM('ADMIN', 'MANAGER', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
  `lastLoginAt` DATETIME(3) NULL,
  `lastLoginIp` VARCHAR(191) NULL,
  `failedLogins` INT NOT NULL DEFAULT 0,
  `isLockedOut` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `users_email_key`(`email`),
  INDEX `users_role_idx`(`role`),
  INDEX `users_deletedAt_idx`(`deletedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `clients` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `gst` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `phone` VARCHAR(191) NULL,
  `address1` VARCHAR(191) NOT NULL,
  `address2` VARCHAR(191) NULL,
  `state` VARCHAR(191) NOT NULL,
  `pinCode` VARCHAR(191) NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  `createdById` VARCHAR(191) NULL,
  `updatedById` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  INDEX `clients_deletedAt_active_idx`(`deletedAt`, `active`),
  INDEX `clients_name_idx`(`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `vendors` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `gst` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `phone` VARCHAR(191) NULL,
  `address1` VARCHAR(191) NOT NULL,
  `address2` VARCHAR(191) NULL,
  `state` VARCHAR(191) NOT NULL,
  `pinCode` VARCHAR(191) NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  `createdById` VARCHAR(191) NULL,
  `updatedById` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  INDEX `vendors_deletedAt_active_idx`(`deletedAt`, `active`),
  INDEX `vendors_name_idx`(`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(191) NOT NULL,
  `sku` VARCHAR(191) NULL,
  `description` TEXT NOT NULL,
  `hsn` VARCHAR(191) NULL,
  `gstRate` DECIMAL(5,2) NOT NULL,
  `unit` VARCHAR(191) NOT NULL DEFAULT 'NOS',
  `notes` TEXT NULL,
  `pkgType` VARCHAR(191) NULL DEFAULT 'BOX',
  `purchaseRate` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `sellingRate` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `qtyPerBox` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `products_sku_key`(`sku`),
  INDEX `products_deletedAt_active_idx`(`deletedAt`, `active`),
  INDEX `products_hsn_idx`(`hsn`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `invoices` (
  `id` VARCHAR(191) NOT NULL,
  `clientId` VARCHAR(191) NOT NULL,
  `sequenceNumber` INT NOT NULL,
  `invoiceNo` VARCHAR(191) NOT NULL,
  `date` DATETIME(3) NOT NULL,
  `gstType` ENUM('CGST_SGST', 'IGST', 'NONE') NOT NULL DEFAULT 'CGST_SGST',
  `subTotal` DECIMAL(12,2) NOT NULL,
  `taxTotal` DECIMAL(12,2) NOT NULL,
  `grandTotal` DECIMAL(12,2) NOT NULL,
  `status` ENUM('DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `isFinalized` TINYINT(1) NOT NULL DEFAULT 0,
  `ewayBill` VARCHAR(191) NULL,
  `ewayBillUrl` VARCHAR(191) NULL,
  `vehicleNo` VARCHAR(191) NULL,
  `dispatchedThrough` VARCHAR(191) NULL,
  `isFreightCollect` TINYINT(1) NOT NULL DEFAULT 0,
  `freightAmount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `freightTaxPercent` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT NULL,
  `billingName` VARCHAR(191) NULL,
  `billingAddress1` VARCHAR(191) NULL,
  `billingAddress2` VARCHAR(191) NULL,
  `billingState` VARCHAR(191) NULL,
  `billingPinCode` VARCHAR(191) NULL,
  `billingPhone` VARCHAR(191) NULL,
  `billingGst` VARCHAR(191) NULL,
  `shippingSameAsBilling` TINYINT(1) NOT NULL DEFAULT 1,
  `shippingName` VARCHAR(191) NULL,
  `shippingAddress1` VARCHAR(191) NULL,
  `shippingAddress2` VARCHAR(191) NULL,
  `shippingState` VARCHAR(191) NULL,
  `shippingPinCode` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `deletedAt` DATETIME(3) NULL,
  `createdById` VARCHAR(191) NULL,
  `updatedById` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `invoices_sequenceNumber_key`(`sequenceNumber`),
  UNIQUE INDEX `invoices_invoiceNo_key`(`invoiceNo`),
  INDEX `invoices_clientId_deletedAt_idx`(`clientId`, `deletedAt`),
  INDEX `invoices_status_date_idx`(`status`, `date`),
  INDEX `invoices_date_idx`(`date`),
  INDEX `invoices_invoiceNo_idx`(`invoiceNo`),
  CONSTRAINT `invoices_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `invoice_line_items` (
  `id` VARCHAR(191) NOT NULL,
  `invoiceId` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NULL,
  `description` TEXT NOT NULL,
  `hsn` VARCHAR(191) NULL,
  `qty` DECIMAL(12,3) NOT NULL,
  `rate` DECIMAL(12,2) NOT NULL,
  `taxPercent` DECIMAL(5,2) NOT NULL,
  `taxAmount` DECIMAL(12,2) NOT NULL,
  `unit` VARCHAR(191) NOT NULL DEFAULT 'NOS',
  `pkgCount` INT NULL DEFAULT 0,
  `pkgType` VARCHAR(191) NULL DEFAULT 'BOX',
  `qtyPerBox` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `totalAmount` DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `invoice_line_items_invoiceId_idx`(`invoiceId`),
  INDEX `invoice_line_items_productId_fkey`(`productId`),
  CONSTRAINT `invoice_line_items_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `invoice_line_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `stocks` (
  `id` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `quantity` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `stocks_productId_key`(`productId`),
  CONSTRAINT `stocks_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `stock_logs` (
  `id` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `type` ENUM('ADD', 'REMOVE', 'UPDATE', 'MANUAL', 'ADJUSTMENT', 'RETURN') NOT NULL DEFAULT 'MANUAL',
  `quantityBefore` DECIMAL(12,3) NOT NULL,
  `quantityChange` DECIMAL(12,3) NOT NULL,
  `quantityAfter` DECIMAL(12,3) NOT NULL,
  `referenceId` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `stock_logs_productId_createdAt_idx`(`productId`, `createdAt`),
  CONSTRAINT `stock_logs_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `accounts` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `type` ENUM('CASH', 'BANK', 'CLIENT', 'SUPPLIER', 'EXPENSE', 'PURCHASE', 'REVENUE', 'LOAN', 'ADVANCE', 'EQUITY') NOT NULL,
  `openingBalance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `clientId` VARCHAR(191) NULL,
  `vendorId` VARCHAR(191) NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `accounts_name_key`(`name`),
  UNIQUE INDEX `accounts_clientId_key`(`clientId`),
  UNIQUE INDEX `accounts_vendorId_key`(`vendorId`),
  INDEX `accounts_type_idx`(`type`),
  CONSTRAINT `accounts_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `accounts_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `ledger_entries` (
  `id` VARCHAR(191) NOT NULL,
  `debitAccountId` VARCHAR(191) NULL,
  `creditAccountId` VARCHAR(191) NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `referenceType` VARCHAR(191) NULL,
  `referenceId` VARCHAR(191) NULL,
  `transactionType` ENUM('PAYMENT_RECEIVED', 'PAYMENT_MADE', 'EXPENSE', 'INVOICE', 'PURCHASE', 'FOUNDER_CONTRIBUTION', 'FOUNDER_WITHDRAWAL', 'TRANSFER') NULL,
  `description` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ledger_entries_debitAccountId_idx`(`debitAccountId`),
  INDEX `ledger_entries_creditAccountId_idx`(`creditAccountId`),
  INDEX `ledger_entries_date_idx`(`date`),
  CONSTRAINT `ledger_entries_debitAccountId_fkey` FOREIGN KEY (`debitAccountId`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ledger_entries_creditAccountId_fkey` FOREIGN KEY (`creditAccountId`) REFERENCES `accounts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS=1;
