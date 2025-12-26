-- ============================================================================
-- TmsDb_Dev Complete Database Schema
-- MySQL dump 10.13  Distrib 8.0.30, for Win64 (x86_64)
-- Host: localhost    Database: TmsDb_Dev
-- Generated: 2025-12-25
-- ============================================================================

-- ============================================================================
-- DATABASE CREATION
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `TmsDb_Dev` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `TmsDb_Dev`;

-- ============================================================================
-- INITIAL SETTINGS
-- ============================================================================

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- ============================================================================
-- TABLE STRUCTURES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: app_settings
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `app_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `app_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=90 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: customers
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_phone` (`phone`),
  KEY `idx_name` (`name`),
  KEY `idx_phone` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: users
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `photo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('admin','manager','staff','tester','user') COLLATE utf8mb4_unicode_ci DEFAULT 'user',
  `last_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: meal_plans
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `meal_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `meal_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `meal_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `frequency` enum('Daily','Weekly','Monthly') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `days` enum('Mon-Fri','Mon-Sat','Single') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Mon-Fri',
  `price` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_frequency` (`frequency`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: ingredients
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ingredients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: recipes
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `recipes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: recipe_images
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `recipe_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipe_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recipe_id` int NOT NULL,
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_recipe_id` (`recipe_id`),
  KEY `idx_is_primary` (`is_primary`),
  CONSTRAINT `recipe_images_ibfk_1` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: recipe_ingredients
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `recipe_ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipe_ingredients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recipe_id` int NOT NULL,
  `ingredient_id` int NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_recipe_id` (`recipe_id`),
  KEY `idx_ingredient_id` (`ingredient_id`),
  CONSTRAINT `recipe_ingredients_ibfk_1` FOREIGN KEY (`recipe_id`) REFERENCES `recipes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recipe_ingredients_ibfk_2` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: vendors
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ingredient_id` int NOT NULL,
  `vendor_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `weight` decimal(10,2) NOT NULL,
  `package_size` enum('tsp','tbsp','c','pt','qt','gal','fl_oz','oz','lb','g','kg','ml','l','pcs') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ingredient_id` (`ingredient_id`),
  KEY `idx_is_default` (`is_default`),
  CONSTRAINT `vendors_ibfk_1` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: products
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `price` decimal(10,2) NOT NULL,
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stock` int DEFAULT '0',
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_available` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_is_available` (`is_available`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: invoices
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Format: INV-C{CustomerID}-O{OrderID_Month-Year}-{YYYYMMDD}-{Counter}',
  `customer_id` int NOT NULL,
  `invoice_type` enum('individual','combined') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'individual',
  `total_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `amount_paid` decimal(10,2) NOT NULL DEFAULT '0.00',
  `balance_due` decimal(10,2) NOT NULL DEFAULT '0.00',
  `payment_status` enum('unpaid','partial_paid','paid') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unpaid',
  `generated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `generated_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_invoice_number` (`invoice_number`),
  KEY `idx_payment_status` (`payment_status`),
  KEY `idx_generated_at` (`generated_at`),
  CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: payment_records
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `payment_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_type` enum('online','cash') COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_source` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `interac_transaction_id` int DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `payer_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reference_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `total_allocated` decimal(10,2) DEFAULT '0.00',
  `excess_amount` decimal(10,2) DEFAULT '0.00',
  `allocation_status` enum('unallocated','partial','fully_allocated','has_excess') COLLATE utf8mb4_unicode_ci DEFAULT 'unallocated',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `deleted_flag` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` int DEFAULT NULL,
  `delete_reason` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_payment_date` (`payment_date`),
  KEY `idx_deleted` (`deleted_flag`),
  KEY `idx_allocation_status` (`allocation_status`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_payment_type` (`payment_type`),
  KEY `interac_transaction_id` (`interac_transaction_id`),
  CONSTRAINT `payment_records_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: customer_credit
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `customer_credit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_credit` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `payment_record_id` int NOT NULL,
  `original_amount` decimal(10,2) NOT NULL,
  `current_balance` decimal(10,2) NOT NULL,
  `status` enum('available','used','refunded','expired') COLLATE utf8mb4_unicode_ci DEFAULT 'available',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`),
  KEY `idx_payment` (`payment_record_id`),
  CONSTRAINT `customer_credit_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_credit_ibfk_2` FOREIGN KEY (`payment_record_id`) REFERENCES `payment_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: customer_credit_usage
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `customer_credit_usage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_credit_usage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `credit_id` int NOT NULL,
  `payment_record_id` int DEFAULT NULL,
  `billing_id` int NOT NULL,
  `amount_used` decimal(10,2) NOT NULL,
  `used_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `used_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_credit` (`credit_id`),
  KEY `idx_billing` (`billing_id`),
  KEY `idx_payment_record` (`payment_record_id`),
  CONSTRAINT `customer_credit_usage_ibfk_1` FOREIGN KEY (`credit_id`) REFERENCES `customer_credit` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_credit_usage_invoice_fk` FOREIGN KEY (`billing_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_credit_usage_payment_record` FOREIGN KEY (`payment_record_id`) REFERENCES `payment_records` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: customer_name_aliases
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `customer_name_aliases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_name_aliases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `alias_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source` enum('manual','learned') COLLATE utf8mb4_unicode_ci DEFAULT 'manual',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_alias` (`alias_name`),
  KEY `idx_customer` (`customer_id`),
  CONSTRAINT `customer_name_aliases_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: customer_orders
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `customer_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `meal_plan_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `selected_days` json NOT NULL COMMENT 'Array of day names: ["Monday", "Tuesday", ...]',
  `price` decimal(10,2) NOT NULL,
  `payment_id` int DEFAULT NULL,
  `payment_status` enum('calculating','pending','approved','finalized','paid','partial_paid') COLLATE utf8mb4_unicode_ci DEFAULT 'calculating',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `parent_order_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_meal_plan_id` (`meal_plan_id`),
  KEY `idx_start_date` (`start_date`),
  KEY `idx_end_date` (`end_date`),
  KEY `idx_payment_status` (`payment_status`),
  KEY `idx_parent_order_id` (`parent_order_id`),
  CONSTRAINT `customer_orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_orders_ibfk_2` FOREIGN KEY (`meal_plan_id`) REFERENCES `meal_plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_orders_chk_2` CHECK ((`quantity` >= 1))
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: customer_print_order
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `customer_print_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_print_order` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `print_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_customer` (`customer_id`),
  KEY `idx_print_order` (`print_order`),
  CONSTRAINT `customer_print_order_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: delete_authorization_log
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `delete_authorization_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delete_authorization_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `table_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `record_id` int NOT NULL,
  `action_type` enum('soft_delete','restore') COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_verified` tinyint(1) NOT NULL DEFAULT '0',
  `reason` text COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_table_record` (`table_name`,`record_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: gmail_oauth_settings
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `gmail_oauth_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gmail_oauth_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `account_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'primary',
  `email_address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `access_token` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `refresh_token` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `token_expires_at` datetime DEFAULT NULL,
  `last_sync_email_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_sync_email_date` datetime DEFAULT NULL,
  `last_sync_email_subject` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_sync_at` datetime DEFAULT NULL,
  `sync_enabled` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_email` (`email_address`),
  KEY `idx_active` (`is_active`),
  KEY `idx_sync_enabled` (`sync_enabled`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: interac_transactions
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `interac_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `interac_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `gmail_settings_id` int NOT NULL,
  `gmail_message_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_date` datetime NOT NULL,
  `sender_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'CAD',
  `raw_email_body` text COLLATE utf8mb4_unicode_ci,
  `auto_matched_customer_id` int DEFAULT NULL,
  `confirmed_customer_id` int DEFAULT NULL,
  `match_confidence` decimal(3,2) DEFAULT '0.00',
  `status` enum('pending','allocated','ignored','deleted') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_flag` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_gmail_message` (`gmail_message_id`),
  KEY `gmail_settings_id` (`gmail_settings_id`),
  KEY `idx_reference` (`reference_number`),
  KEY `idx_status` (`status`),
  KEY `idx_email_date` (`email_date`),
  KEY `idx_deleted` (`deleted_flag`),
  KEY `idx_auto_matched` (`auto_matched_customer_id`),
  KEY `idx_confirmed` (`confirmed_customer_id`),
  CONSTRAINT `interac_transactions_ibfk_1` FOREIGN KEY (`gmail_settings_id`) REFERENCES `gmail_oauth_settings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- Add FK for payment_records after interac_transactions is created
ALTER TABLE `payment_records`
  ADD CONSTRAINT `payment_records_ibfk_1` FOREIGN KEY (`interac_transaction_id`) REFERENCES `interac_transactions` (`id`) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- Table: invoice_payments
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `invoice_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_id` int NOT NULL,
  `payment_record_id` int NOT NULL,
  `amount_applied` decimal(10,2) NOT NULL,
  `applied_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `applied_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_invoice` (`invoice_id`),
  KEY `idx_payment_record` (`payment_record_id`),
  CONSTRAINT `invoice_payments_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `invoice_payments_ibfk_2` FOREIGN KEY (`payment_record_id`) REFERENCES `payment_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: label_templates
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `label_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `label_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `width_inches` decimal(4,2) NOT NULL,
  `height_inches` decimal(4,2) NOT NULL,
  `template_html` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `custom_placeholders` json DEFAULT NULL,
  `print_settings` json DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_is_default` (`is_default`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: login_audit_log
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `login_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_audit_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `status` enum('success','failed','blocked') COLLATE utf8mb4_unicode_ci NOT NULL,
  `failure_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_email` (`email`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: monthly_billing
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `monthly_billing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `monthly_billing` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `billing_month` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Format: YYYY-MM',
  `total_delivered` int NOT NULL DEFAULT '0',
  `total_absent` int NOT NULL DEFAULT '0',
  `total_extra` int NOT NULL DEFAULT '0',
  `total_days` int NOT NULL DEFAULT '0',
  `base_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `extra_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `breakdown_json` json DEFAULT NULL COMMENT 'JSON array of per-order billing details',
  `amount_paid` decimal(10,2) DEFAULT '0.00',
  `credit_applied` decimal(10,2) DEFAULT '0.00',
  `last_payment_date` date DEFAULT NULL,
  `payment_count` int DEFAULT '0',
  `status` enum('calculating','pending','finalized','paid','partial_paid') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'calculating',
  `calculated_at` timestamp NULL DEFAULT NULL,
  `finalized_at` timestamp NULL DEFAULT NULL,
  `finalized_by` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `payment_method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_customer_month` (`customer_id`,`billing_month`),
  KEY `idx_customer_month` (`customer_id`,`billing_month`),
  KEY `idx_billing_month` (`billing_month`),
  KEY `idx_status` (`status`),
  KEY `idx_calculated_at` (`calculated_at`),
  KEY `idx_amount_paid` (`amount_paid`),
  KEY `idx_last_payment_date` (`last_payment_date`),
  CONSTRAINT `monthly_billing_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=236 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: order_billing
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `order_billing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_billing` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `billing_month` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Format: YYYY-MM',
  `total_delivered` int NOT NULL DEFAULT '0',
  `total_absent` int NOT NULL DEFAULT '0',
  `total_extra` int NOT NULL DEFAULT '0',
  `total_plan_days` int NOT NULL DEFAULT '0' COMMENT 'Total plan days in the month for this order',
  `base_amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Calculated from deliveries',
  `extra_amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Sum of extra tiffin prices',
  `total_amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'base_amount + extra_amount',
  `status` enum('calculating','finalized','approved','invoiced') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'calculating',
  `invoice_id` int DEFAULT NULL,
  `finalized_at` timestamp NULL DEFAULT NULL,
  `finalized_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_order_month` (`order_id`,`billing_month`),
  KEY `idx_customer_month` (`customer_id`,`billing_month`),
  KEY `idx_order_month` (`order_id`,`billing_month`),
  KEY `idx_status` (`status`),
  KEY `idx_invoice_id` (`invoice_id`),
  CONSTRAINT `fk_order_billing_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL,
  CONSTRAINT `order_billing_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `customer_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_billing_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: password_reset_requests
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `password_reset_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','completed','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `admin_notified_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolved_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_email` (`user_email`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: password_reset_tokens
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` timestamp NOT NULL,
  `used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_token` (`token`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: payment_allocations
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `payment_allocations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_allocations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_record_id` int NOT NULL,
  `billing_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `allocation_order` int NOT NULL,
  `allocated_amount` decimal(10,2) NOT NULL,
  `invoice_balance_before` decimal(10,2) NOT NULL,
  `invoice_balance_after` decimal(10,2) NOT NULL,
  `resulting_status` enum('partial_paid','paid') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `deleted_flag` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_payment` (`payment_record_id`),
  KEY `idx_billing` (`billing_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_deleted` (`deleted_flag`),
  CONSTRAINT `payment_allocations_ibfk_1` FOREIGN KEY (`payment_record_id`) REFERENCES `payment_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_allocations_ibfk_3` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_allocations_invoice_fk` FOREIGN KEY (`billing_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: payment_history
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `payment_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `billing_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_date` date NOT NULL,
  `transaction_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_billing_id` (`billing_id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_payment_date` (`payment_date`),
  KEY `idx_transaction_id` (`transaction_id`),
  CONSTRAINT `payment_history_ibfk_1` FOREIGN KEY (`billing_id`) REFERENCES `monthly_billing` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_history_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: payment_notifications
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `payment_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `notification_type` enum('month_end_calculation','payment_received','payment_overdue','billing_pending_approval','order_approved','interac_received','payment_allocated','invoice_paid','excess_payment','refund_request','refund_completed','refund_cancelled') COLLATE utf8mb4_unicode_ci NOT NULL,
  `billing_id` int DEFAULT NULL,
  `order_billing_id` int DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `billing_month` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `is_dismissed` tinyint(1) DEFAULT '0',
  `priority` enum('low','medium','high') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `action_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at` timestamp NULL DEFAULT NULL,
  `dismissed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_billing_id` (`billing_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_notification_type` (`notification_type`),
  KEY `idx_priority` (`priority`),
  KEY `idx_order_billing_id` (`order_billing_id`),
  CONSTRAINT `fk_payment_notifications_order_billing` FOREIGN KEY (`order_billing_id`) REFERENCES `order_billing` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_notifications_ibfk_1` FOREIGN KEY (`billing_id`) REFERENCES `monthly_billing` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_notifications_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=127 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: pricing_rules
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `pricing_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pricing_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `meal_plan_id` int DEFAULT NULL,
  `rule_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `delivered_price` decimal(10,2) NOT NULL,
  `extra_price` decimal(10,2) NOT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_meal_plan_id` (`meal_plan_id`),
  KEY `idx_effective_dates` (`effective_from`,`effective_to`),
  KEY `idx_is_default` (`is_default`),
  CONSTRAINT `pricing_rules_ibfk_1` FOREIGN KEY (`meal_plan_id`) REFERENCES `meal_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: refund_records
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `refund_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refund_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `source_type` enum('credit','payment') COLLATE utf8mb4_unicode_ci NOT NULL,
  `credit_id` int DEFAULT NULL,
  `payment_record_id` int DEFAULT NULL,
  `customer_id` int NOT NULL,
  `refund_amount` decimal(10,2) NOT NULL,
  `refund_method` enum('interac','cash','cheque','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `refund_date` date NOT NULL,
  `reference_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `requested_by` int NOT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_flag` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `credit_id` (`credit_id`),
  KEY `payment_record_id` (`payment_record_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`),
  KEY `idx_deleted` (`deleted_flag`),
  KEY `idx_refund_date` (`refund_date`),
  CONSTRAINT `refund_records_ibfk_1` FOREIGN KEY (`credit_id`) REFERENCES `customer_credit` (`id`) ON DELETE SET NULL,
  CONSTRAINT `refund_records_ibfk_2` FOREIGN KEY (`payment_record_id`) REFERENCES `payment_records` (`id`) ON DELETE SET NULL,
  CONSTRAINT `refund_records_ibfk_3` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: tiffin_calendar_entries
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `tiffin_calendar_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tiffin_calendar_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `order_id` int NOT NULL,
  `delivery_date` date NOT NULL,
  `status` enum('T','A','E') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'T=Delivered, A=Absent/Cancelled, E=Extra',
  `quantity` int NOT NULL DEFAULT '1',
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_order_date` (`order_id`,`delivery_date`),
  KEY `idx_customer_date` (`customer_id`,`delivery_date`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_delivery_date` (`delivery_date`),
  KEY `idx_status` (`status`),
  CONSTRAINT `tiffin_calendar_entries_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tiffin_calendar_entries_ibfk_2` FOREIGN KEY (`order_id`) REFERENCES `customer_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=98 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ----------------------------------------------------------------------------
-- Table: user_roles
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('admin','manager','staff','viewer') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'staff',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_role` (`user_id`),
  KEY `idx_role` (`role`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Triggers for customer_orders
-- ----------------------------------------------------------------------------

/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;

DROP TRIGGER IF EXISTS `trg_customer_orders_date_validation_insert`;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_customer_orders_date_validation_insert` BEFORE INSERT ON `customer_orders` FOR EACH ROW BEGIN
    DECLARE meal_plan_days VARCHAR(50);

    -- Get the days field from the meal plan
    SELECT days INTO meal_plan_days
    FROM meal_plans
    WHERE id = NEW.meal_plan_id;

    -- Validate date range based on meal plan type
    IF meal_plan_days = 'Single' THEN
        -- For 'Single' meal plans, allow same-day orders (start_date = end_date)
        IF NEW.end_date < NEW.start_date THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'end_date cannot be before start_date';
        END IF;
    ELSE
        -- For all other meal plans, require end_date > start_date
        IF NEW.end_date <= NEW.start_date THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'For non-single meal plans, end_date must be greater than start_date';
        END IF;
    END IF;
END */;;
DELIMITER ;

DROP TRIGGER IF EXISTS `trg_customer_orders_date_validation_update`;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_customer_orders_date_validation_update` BEFORE UPDATE ON `customer_orders` FOR EACH ROW BEGIN
    DECLARE meal_plan_days VARCHAR(50);

    -- Get the days field from the meal plan
    SELECT days INTO meal_plan_days
    FROM meal_plans
    WHERE id = NEW.meal_plan_id;

    -- Validate date range based on meal plan type
    IF meal_plan_days = 'Single' THEN
        -- For 'Single' meal plans, allow same-day orders (start_date = end_date)
        IF NEW.end_date < NEW.start_date THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'end_date cannot be before start_date';
        END IF;
    ELSE
        -- For all other meal plans, require end_date > start_date
        IF NEW.end_date <= NEW.start_date THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'For non-single meal plans, end_date must be greater than start_date';
        END IF;
    END IF;
END */;;
DELIMITER ;

/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

-- ----------------------------------------------------------------------------
-- Triggers for tiffin_calendar_entries
-- ----------------------------------------------------------------------------

/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;

DROP TRIGGER IF EXISTS `trg_calendar_entry_after_insert`;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_calendar_entry_after_insert` AFTER INSERT ON `tiffin_calendar_entries` FOR EACH ROW BEGIN
  DECLARE billing_month VARCHAR(7);
  SET billing_month = DATE_FORMAT(NEW.delivery_date, '%Y-%m');
  CALL sp_calculate_monthly_billing(NEW.customer_id, billing_month);
END */;;
DELIMITER ;

DROP TRIGGER IF EXISTS `tr_calendar_entry_after_insert`;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `tr_calendar_entry_after_insert` AFTER INSERT ON `tiffin_calendar_entries` FOR EACH ROW BEGIN
    CALL sp_calculate_order_billing(NEW.order_id, DATE_FORMAT(NEW.delivery_date, '%Y-%m'));
END */;;
DELIMITER ;

DROP TRIGGER IF EXISTS `trg_calendar_entry_after_update`;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_calendar_entry_after_update` AFTER UPDATE ON `tiffin_calendar_entries` FOR EACH ROW BEGIN
  DECLARE billing_month VARCHAR(7);
  SET billing_month = DATE_FORMAT(NEW.delivery_date, '%Y-%m');
  CALL sp_calculate_monthly_billing(NEW.customer_id, billing_month);
END */;;
DELIMITER ;

DROP TRIGGER IF EXISTS `tr_calendar_entry_after_update`;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `tr_calendar_entry_after_update` AFTER UPDATE ON `tiffin_calendar_entries` FOR EACH ROW BEGIN
    CALL sp_calculate_order_billing(NEW.order_id, DATE_FORMAT(NEW.delivery_date, '%Y-%m'));
    IF OLD.order_id != NEW.order_id THEN
        CALL sp_calculate_order_billing(OLD.order_id, DATE_FORMAT(OLD.delivery_date, '%Y-%m'));
    END IF;
END */;;
DELIMITER ;

DROP TRIGGER IF EXISTS `trg_calendar_entry_after_delete`;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_calendar_entry_after_delete` AFTER DELETE ON `tiffin_calendar_entries` FOR EACH ROW BEGIN
  DECLARE billing_month VARCHAR(7);
  SET billing_month = DATE_FORMAT(OLD.delivery_date, '%Y-%m');
  CALL sp_calculate_monthly_billing(OLD.customer_id, billing_month);
END */;;
DELIMITER ;

DROP TRIGGER IF EXISTS `tr_calendar_entry_after_delete`;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `tr_calendar_entry_after_delete` AFTER DELETE ON `tiffin_calendar_entries` FOR EACH ROW BEGIN
    CALL sp_calculate_order_billing(OLD.order_id, DATE_FORMAT(OLD.delivery_date, '%Y-%m'));
END */;;
DELIMITER ;

/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

-- ============================================================================
-- STORED PROCEDURES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Procedure: sp_allocate_payment
-- ----------------------------------------------------------------------------

/*!50003 DROP PROCEDURE IF EXISTS `sp_allocate_payment` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_allocate_payment`(
    IN p_payment_record_id INT,
    IN p_billing_ids TEXT,
    IN p_created_by INT,
    OUT p_excess_amount DECIMAL(10,2),
    OUT p_result_message VARCHAR(255)
)
BEGIN
    DECLARE v_payment_amount DECIMAL(10,2);
    DECLARE v_remaining_amount DECIMAL(10,2);
    DECLARE v_billing_id INT;
    DECLARE v_balance_due DECIMAL(10,2);
    DECLARE v_allocate_amount DECIMAL(10,2);
    DECLARE v_order INT DEFAULT 1;
    DECLARE v_customer_id INT;
    DECLARE v_credit_id INT;
    DECLARE v_total_allocated DECIMAL(10,2) DEFAULT 0;
    DECLARE v_ids_remaining TEXT;
    DECLARE v_current_id VARCHAR(20);
    DECLARE v_comma_pos INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_result_message = 'Error occurred during allocation';
        SET p_excess_amount = 0;
    END;

    START TRANSACTION;

    SELECT amount, customer_id INTO v_payment_amount, v_customer_id
    FROM payment_records
    WHERE id = p_payment_record_id AND deleted_flag = 0;

    IF v_payment_amount IS NULL THEN
        SET p_result_message = 'Payment record not found';
        SET p_excess_amount = 0;
        ROLLBACK;
    ELSE
        SET v_remaining_amount = v_payment_amount;
        SET v_ids_remaining = p_billing_ids;

        WHILE v_remaining_amount > 0 AND LENGTH(v_ids_remaining) > 0 DO
            SET v_comma_pos = LOCATE(',', v_ids_remaining);
            IF v_comma_pos > 0 THEN
                SET v_current_id = SUBSTRING(v_ids_remaining, 1, v_comma_pos - 1);
                SET v_ids_remaining = SUBSTRING(v_ids_remaining, v_comma_pos + 1);
            ELSE
                SET v_current_id = v_ids_remaining;
                SET v_ids_remaining = '';
            END IF;

            SET v_billing_id = CAST(v_current_id AS UNSIGNED);

            IF v_billing_id > 0 THEN
                SELECT
                    (total_amount - COALESCE(amount_paid, 0) - COALESCE(credit_applied, 0)),
                    customer_id
                INTO v_balance_due, v_customer_id
                FROM monthly_billing
                WHERE id = v_billing_id AND status IN ('finalized', 'partial_paid');

                IF v_balance_due IS NOT NULL AND v_balance_due > 0 THEN
                    SET v_allocate_amount = LEAST(v_remaining_amount, v_balance_due);

                    INSERT INTO payment_allocations (
                        payment_record_id, billing_id, customer_id,
                        allocation_order, allocated_amount,
                        invoice_balance_before, invoice_balance_after,
                        resulting_status, created_by
                    ) VALUES (
                        p_payment_record_id, v_billing_id, v_customer_id,
                        v_order, v_allocate_amount,
                        v_balance_due, v_balance_due - v_allocate_amount,
                        IF(v_balance_due - v_allocate_amount <= 0, 'paid', 'partial_paid'),
                        p_created_by
                    );

                    UPDATE monthly_billing SET
                        amount_paid = COALESCE(amount_paid, 0) + v_allocate_amount,
                        status = IF((total_amount - COALESCE(amount_paid, 0) - v_allocate_amount - COALESCE(credit_applied, 0)) <= 0, 'paid', 'partial_paid'),
                        last_payment_date = CURDATE(),
                        payment_count = COALESCE(payment_count, 0) + 1,
                        updated_at = NOW()
                    WHERE id = v_billing_id;

                    SET v_remaining_amount = v_remaining_amount - v_allocate_amount;
                    SET v_total_allocated = v_total_allocated + v_allocate_amount;
                    SET v_order = v_order + 1;
                END IF;
            END IF;
        END WHILE;

        SET p_excess_amount = v_remaining_amount;

        IF v_remaining_amount > 0 THEN
            INSERT INTO customer_credit (
                customer_id, payment_record_id,
                original_amount, current_balance,
                status, notes
            ) VALUES (
                v_customer_id, p_payment_record_id,
                v_remaining_amount, v_remaining_amount,
                'available', 'Auto-created from excess payment'
            );

            SET v_credit_id = LAST_INSERT_ID();

            UPDATE payment_records SET
                total_allocated = v_total_allocated,
                excess_amount = v_remaining_amount,
                allocation_status = 'has_excess',
                updated_at = NOW()
            WHERE id = p_payment_record_id;

            INSERT INTO payment_notifications (
                customer_id, notification_type,
                title, message, priority, action_url
            ) VALUES (
                v_customer_id, 'excess_payment',
                'Excess Payment Recorded',
                CONCAT('Customer has $', v_remaining_amount, ' credit available. Consider refund if needed.'),
                'medium',
                CONCAT('/dashboard/payments/credit/', v_credit_id)
            );

            SET p_result_message = CONCAT('Allocated $', v_total_allocated, '. Excess $', v_remaining_amount, ' added as credit.');
        ELSE
            UPDATE payment_records SET
                total_allocated = v_total_allocated,
                excess_amount = 0,
                allocation_status = 'fully_allocated',
                updated_at = NOW()
            WHERE id = p_payment_record_id;

            SET p_result_message = CONCAT('Successfully allocated $', v_total_allocated, ' to ', v_order - 1, ' invoice(s).');
        END IF;

        COMMIT;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

-- ----------------------------------------------------------------------------
-- Procedure: sp_calculate_monthly_billing
-- ----------------------------------------------------------------------------

/*!50003 DROP PROCEDURE IF EXISTS `sp_calculate_monthly_billing` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_calculate_monthly_billing`(
    IN p_customer_id INT,
    IN p_billing_month VARCHAR(7)
)
BEGIN
    DECLARE v_total_delivered INT DEFAULT 0;
    DECLARE v_total_absent INT DEFAULT 0;
    DECLARE v_total_extra INT DEFAULT 0;
    DECLARE v_total_days INT DEFAULT 0;
    DECLARE v_base_amount DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_extra_amount DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_total_amount DECIMAL(10,2) DEFAULT 0.00;

    -- Count calendar entries for the month
    SELECT
        COALESCE(SUM(CASE WHEN status = 'T' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'E' THEN 1 ELSE 0 END), 0),
        COUNT(*)
    INTO v_total_delivered, v_total_absent, v_total_extra, v_total_days
    FROM tiffin_calendar_entries
    WHERE customer_id = p_customer_id
    AND DATE_FORMAT(delivery_date, '%Y-%m') = p_billing_month;

    -- Calculate base amount
    -- Formula: (order_price / total_selected_days_in_full_month) × delivered_count
    -- Example: Mon-Thu plan in December = 19 days (count all Mon-Thu in month)
    --          $50 / 19 = $2.63 per tiffin
    SELECT COALESCE(SUM(
        (co.price /
            -- Count how many times the selected_days appear in the full billing month
            (SELECT COUNT(*)
             FROM (
                 SELECT DATE_ADD(CONCAT(p_billing_month, '-01'), INTERVAL n DAY) as d
                 FROM (
                     SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
                     UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
                     UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
                     UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
                     UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24
                     UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
                     UNION SELECT 30
                 ) nums
             ) dates
             WHERE MONTH(d) = MONTH(CONCAT(p_billing_month, '-01'))
             AND YEAR(d) = YEAR(CONCAT(p_billing_month, '-01'))
             AND (
                 (JSON_CONTAINS(co.selected_days, '"Monday"') AND DAYNAME(d) = 'Monday') OR
                 (JSON_CONTAINS(co.selected_days, '"Tuesday"') AND DAYNAME(d) = 'Tuesday') OR
                 (JSON_CONTAINS(co.selected_days, '"Wednesday"') AND DAYNAME(d) = 'Wednesday') OR
                 (JSON_CONTAINS(co.selected_days, '"Thursday"') AND DAYNAME(d) = 'Thursday') OR
                 (JSON_CONTAINS(co.selected_days, '"Friday"') AND DAYNAME(d) = 'Friday') OR
                 (JSON_CONTAINS(co.selected_days, '"Saturday"') AND DAYNAME(d) = 'Saturday') OR
                 (JSON_CONTAINS(co.selected_days, '"Sunday"') AND DAYNAME(d) = 'Sunday')
             )
            )
        ) *
        -- Multiply by actual delivered count
        (SELECT COUNT(*)
         FROM tiffin_calendar_entries tce
         WHERE tce.order_id = co.id
         AND DATE_FORMAT(tce.delivery_date, '%Y-%m') = p_billing_month
         AND tce.status = 'T'
        )
    ), 0)
    INTO v_base_amount
    FROM customer_orders co
    WHERE co.customer_id = p_customer_id
    AND EXISTS (
        SELECT 1 FROM tiffin_calendar_entries tce
        WHERE tce.order_id = co.id
        AND DATE_FORMAT(tce.delivery_date, '%Y-%m') = p_billing_month
    );

    -- Calculate extra amount using ACTUAL prices from calendar entries
    SELECT COALESCE(SUM(CASE WHEN status = 'E' THEN price ELSE 0 END), 0)
    INTO v_extra_amount
    FROM tiffin_calendar_entries
    WHERE customer_id = p_customer_id
    AND DATE_FORMAT(delivery_date, '%Y-%m') = p_billing_month;

    SET v_total_amount = v_base_amount + v_extra_amount;

    -- Insert or update monthly billing
    INSERT INTO monthly_billing (
        customer_id, billing_month, total_delivered, total_absent,
        total_extra, total_days, base_amount, extra_amount,
        total_amount, status, calculated_at
    )
    VALUES (
        p_customer_id, p_billing_month, v_total_delivered, v_total_absent,
        v_total_extra, v_total_days, v_base_amount, v_extra_amount,
        v_total_amount, 'calculating', NOW()
    )
    ON DUPLICATE KEY UPDATE
        total_delivered = v_total_delivered,
        total_absent = v_total_absent,
        total_extra = v_total_extra,
        total_days = v_total_days,
        base_amount = v_base_amount,
        extra_amount = v_extra_amount,
        total_amount = v_total_amount,
        calculated_at = NOW(),
        updated_at = NOW();

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

-- ----------------------------------------------------------------------------
-- Procedure: sp_calculate_order_billing
-- ----------------------------------------------------------------------------

/*!50003 DROP PROCEDURE IF EXISTS `sp_calculate_order_billing` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_calculate_order_billing`(
    IN p_order_id INT,
    IN p_billing_month VARCHAR(7)
)
proc_label: BEGIN
    DECLARE v_customer_id INT;
    DECLARE v_order_price DECIMAL(10,2);
    DECLARE v_selected_days JSON;
    DECLARE v_total_delivered INT DEFAULT 0;
    DECLARE v_total_absent INT DEFAULT 0;
    DECLARE v_total_extra INT DEFAULT 0;
    DECLARE v_total_plan_days INT DEFAULT 0;
    DECLARE v_base_amount DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_extra_amount DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_total_amount DECIMAL(10,2) DEFAULT 0.00;

    -- Get order details
    SELECT customer_id, price, selected_days
    INTO v_customer_id, v_order_price, v_selected_days
    FROM customer_orders
    WHERE id = p_order_id;

    -- If order not found, exit silently
    IF v_customer_id IS NULL THEN
        LEAVE proc_label;
    END IF;

    -- Count calendar entries for this order in the billing month
    SELECT
        COALESCE(SUM(CASE WHEN status = 'T' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'E' THEN 1 ELSE 0 END), 0)
    INTO v_total_delivered, v_total_absent, v_total_extra
    FROM tiffin_calendar_entries
    WHERE order_id = p_order_id
    AND DATE_FORMAT(delivery_date, '%Y-%m') = p_billing_month;

    -- Count total plan days in the billing month
    -- This counts how many times the selected days appear in the full month
    SELECT COUNT(*) INTO v_total_plan_days
    FROM (
        SELECT DATE_ADD(CONCAT(p_billing_month, '-01'), INTERVAL n DAY) as d
        FROM (
            SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
            UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
            UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
            UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
            UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24
            UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
            UNION SELECT 30
        ) nums
    ) dates
    WHERE MONTH(d) = MONTH(CONCAT(p_billing_month, '-01'))
    AND YEAR(d) = YEAR(CONCAT(p_billing_month, '-01'))
    AND (
        v_selected_days IS NULL OR
        JSON_LENGTH(v_selected_days) = 0 OR
        (JSON_CONTAINS(v_selected_days, '"Monday"') AND DAYNAME(d) = 'Monday') OR
        (JSON_CONTAINS(v_selected_days, '"Tuesday"') AND DAYNAME(d) = 'Tuesday') OR
        (JSON_CONTAINS(v_selected_days, '"Wednesday"') AND DAYNAME(d) = 'Wednesday') OR
        (JSON_CONTAINS(v_selected_days, '"Thursday"') AND DAYNAME(d) = 'Thursday') OR
        (JSON_CONTAINS(v_selected_days, '"Friday"') AND DAYNAME(d) = 'Friday') OR
        (JSON_CONTAINS(v_selected_days, '"Saturday"') AND DAYNAME(d) = 'Saturday') OR
        (JSON_CONTAINS(v_selected_days, '"Sunday"') AND DAYNAME(d) = 'Sunday')
    );

    -- Calculate base amount: (order_price / total_plan_days) * delivered_count
    IF v_total_plan_days > 0 THEN
        SET v_base_amount = (v_order_price / v_total_plan_days) * v_total_delivered;
    END IF;

    -- Calculate extra amount from 'E' entries
    SELECT COALESCE(SUM(price), 0) INTO v_extra_amount
    FROM tiffin_calendar_entries
    WHERE order_id = p_order_id
    AND DATE_FORMAT(delivery_date, '%Y-%m') = p_billing_month
    AND status = 'E';

    SET v_total_amount = v_base_amount + v_extra_amount;

    -- Insert or update order_billing
    INSERT INTO order_billing (
        order_id, customer_id, billing_month,
        total_delivered, total_absent, total_extra, total_plan_days,
        base_amount, extra_amount, total_amount, status
    )
    VALUES (
        p_order_id, v_customer_id, p_billing_month,
        v_total_delivered, v_total_absent, v_total_extra, v_total_plan_days,
        v_base_amount, v_extra_amount, v_total_amount, 'calculating'
    )
    ON DUPLICATE KEY UPDATE
        total_delivered = v_total_delivered,
        total_absent = v_total_absent,
        total_extra = v_total_extra,
        total_plan_days = v_total_plan_days,
        base_amount = v_base_amount,
        extra_amount = v_extra_amount,
        total_amount = v_total_amount,
        updated_at = NOW();

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

-- ----------------------------------------------------------------------------
-- Procedure: sp_generate_invoice_number
-- ----------------------------------------------------------------------------

/*!50003 DROP PROCEDURE IF EXISTS `sp_generate_invoice_number` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_generate_invoice_number`(
    IN p_year_month VARCHAR(7),
    OUT p_invoice_number VARCHAR(20)
)
BEGIN
    DECLARE v_year_month_compact VARCHAR(6);
    DECLARE v_next_seq INT;

    -- Convert YYYY-MM to YYYYMM
    SET v_year_month_compact = REPLACE(p_year_month, '-', '');

    -- Get the next sequence number for this month
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(invoice_number, 12) AS UNSIGNED)
    ), 0) + 1
    INTO v_next_seq
    FROM invoices
    WHERE invoice_number LIKE CONCAT('INV-', v_year_month_compact, '-%');

    -- Format: INV-YYYYMM-XXXX
    SET p_invoice_number = CONCAT('INV-', v_year_month_compact, '-', LPAD(v_next_seq, 4, '0'));
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

-- ----------------------------------------------------------------------------
-- Procedure: sp_reverse_payment_allocation
-- ----------------------------------------------------------------------------

/*!50003 DROP PROCEDURE IF EXISTS `sp_reverse_payment_allocation` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_reverse_payment_allocation`(
    IN p_payment_record_id INT,
    IN p_deleted_by INT,
    OUT p_result_message VARCHAR(255)
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_allocation_id INT;
    DECLARE v_billing_id INT;
    DECLARE v_allocated_amount DECIMAL(10,2);

    DECLARE allocation_cursor CURSOR FOR
        SELECT id, billing_id, allocated_amount
        FROM payment_allocations
        WHERE payment_record_id = p_payment_record_id AND deleted_flag = 0;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_result_message = 'Error occurred during reversal';
    END;

    START TRANSACTION;

    OPEN allocation_cursor;

    read_loop: LOOP
        FETCH allocation_cursor INTO v_allocation_id, v_billing_id, v_allocated_amount;
        IF done THEN
            LEAVE read_loop;
        END IF;

        UPDATE monthly_billing SET
            amount_paid = GREATEST(0, COALESCE(amount_paid, 0) - v_allocated_amount),
            payment_count = GREATEST(0, COALESCE(payment_count, 0) - 1),
            status = IF((total_amount - COALESCE(amount_paid, 0) + v_allocated_amount - COALESCE(credit_applied, 0)) > 0,
                       IF(COALESCE(amount_paid, 0) - v_allocated_amount > 0, 'partial_paid', 'finalized'),
                       'paid'),
            updated_at = NOW()
        WHERE id = v_billing_id;

        UPDATE payment_allocations SET
            deleted_flag = 1,
            deleted_at = NOW(),
            deleted_by = p_deleted_by
        WHERE id = v_allocation_id;
    END LOOP;

    CLOSE allocation_cursor;

    UPDATE customer_credit SET
        status = 'expired',
        notes = CONCAT(COALESCE(notes, ''), ' - Reversed due to payment deletion'),
        updated_at = NOW()
    WHERE payment_record_id = p_payment_record_id AND status = 'available';

    SET p_result_message = 'Payment allocation reversed successfully';

    COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View: v_available_for_invoice
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS `v_available_for_invoice`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_available_for_invoice` AS
SELECT
    `ob`.`id` AS `id`,
    `ob`.`order_id` AS `order_id`,
    `ob`.`customer_id` AS `customer_id`,
    `c`.`name` AS `customer_name`,
    `ob`.`billing_month` AS `billing_month`,
    `ob`.`total_delivered` AS `total_delivered`,
    `ob`.`total_absent` AS `total_absent`,
    `ob`.`total_extra` AS `total_extra`,
    `ob`.`total_plan_days` AS `total_plan_days`,
    `ob`.`base_amount` AS `base_amount`,
    `ob`.`extra_amount` AS `extra_amount`,
    `ob`.`total_amount` AS `total_amount`,
    `ob`.`status` AS `status`,
    `ob`.`finalized_at` AS `finalized_at`,
    `ob`.`finalized_by` AS `finalized_by`,
    `mp`.`meal_name` AS `meal_plan_name`,
    `co`.`price` AS `order_price`,
    DATE_FORMAT(`co`.`start_date`,'%Y-%m-%d') AS `start_date`,
    DATE_FORMAT(`co`.`end_date`,'%Y-%m-%d') AS `end_date`,
    `co`.`selected_days` AS `selected_days`
FROM (((`order_billing` `ob`
    JOIN `customers` `c` ON((`ob`.`customer_id` = `c`.`id`)))
    JOIN `customer_orders` `co` ON((`ob`.`order_id` = `co`.`id`)))
    JOIN `meal_plans` `mp` ON((`co`.`meal_plan_id` = `mp`.`id`)))
WHERE ((`ob`.`status` IN ('finalized','approved'))
    AND (`ob`.`invoice_id` IS NULL)
    AND ((`co`.`parent_order_id` IS NULL) OR (`co`.`parent_order_id` = 0)))
ORDER BY `ob`.`customer_id`,`ob`.`billing_month`,`mp`.`meal_name`;

-- ----------------------------------------------------------------------------
-- View: v_calendar_entries_detail
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS `v_calendar_entries_detail`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_calendar_entries_detail` AS
SELECT
    `tce`.`id` AS `id`,
    `tce`.`customer_id` AS `customer_id`,
    `c`.`name` AS `customer_name`,
    `tce`.`order_id` AS `order_id`,
    `tce`.`delivery_date` AS `delivery_date`,
    `tce`.`status` AS `status`,
    `tce`.`quantity` AS `quantity`,
    `tce`.`price` AS `price`,
    `co`.`meal_plan_id` AS `meal_plan_id`,
    `mp`.`meal_name` AS `meal_name`,
    `tce`.`notes` AS `notes`,
    `tce`.`created_at` AS `created_at`,
    `tce`.`updated_at` AS `updated_at`
FROM (((`tiffin_calendar_entries` `tce`
    JOIN `customers` `c` ON((`tce`.`customer_id` = `c`.`id`)))
    JOIN `customer_orders` `co` ON((`tce`.`order_id` = `co`.`id`)))
    JOIN `meal_plans` `mp` ON((`co`.`meal_plan_id` = `mp`.`id`)))
ORDER BY `tce`.`delivery_date` DESC;

-- ----------------------------------------------------------------------------
-- View: v_customer_orders_detail
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS `v_customer_orders_detail`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_customer_orders_detail` AS
SELECT
    `co`.`id` AS `id`,
    `co`.`customer_id` AS `customer_id`,
    `c`.`name` AS `customer_name`,
    `c`.`phone` AS `customer_phone`,
    `c`.`address` AS `customer_address`,
    `co`.`meal_plan_id` AS `meal_plan_id`,
    `mp`.`meal_name` AS `meal_name`,
    `mp`.`description` AS `meal_plan_description`,
    `mp`.`frequency` AS `meal_plan_frequency`,
    `mp`.`days` AS `meal_plan_days`,
    `co`.`quantity` AS `quantity`,
    `co`.`selected_days` AS `selected_days`,
    `co`.`price` AS `price`,
    `co`.`payment_id` AS `payment_id`,
    `co`.`payment_status` AS `payment_status`,
    `co`.`start_date` AS `start_date`,
    `co`.`end_date` AS `end_date`,
    `co`.`created_at` AS `created_at`,
    `co`.`updated_at` AS `updated_at`
FROM ((`customer_orders` `co`
    JOIN `customers` `c` ON((`co`.`customer_id` = `c`.`id`)))
    JOIN `meal_plans` `mp` ON((`co`.`meal_plan_id` = `mp`.`id`)))
ORDER BY `co`.`created_at` DESC;

-- ----------------------------------------------------------------------------
-- View: v_invoice_details
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS `v_invoice_details`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_invoice_details` AS
SELECT
    `i`.`id` AS `id`,
    `i`.`invoice_number` AS `invoice_number`,
    `i`.`customer_id` AS `customer_id`,
    `c`.`name` AS `customer_name`,
    `c`.`phone` AS `customer_phone`,
    `c`.`address` AS `customer_address`,
    `i`.`invoice_type` AS `invoice_type`,
    `i`.`total_amount` AS `total_amount`,
    `i`.`amount_paid` AS `amount_paid`,
    `i`.`balance_due` AS `balance_due`,
    `i`.`payment_status` AS `payment_status`,
    `i`.`generated_at` AS `generated_at`,
    `i`.`generated_by` AS `generated_by`,
    `i`.`due_date` AS `due_date`,
    `i`.`notes` AS `notes`,
    COUNT(`ob`.`id`) AS `order_count`,
    GROUP_CONCAT(DISTINCT `ob`.`billing_month` ORDER BY `ob`.`billing_month` ASC SEPARATOR ', ') AS `billing_months`
FROM ((`invoices` `i`
    JOIN `customers` `c` ON((`i`.`customer_id` = `c`.`id`)))
    LEFT JOIN `order_billing` `ob` ON((`ob`.`invoice_id` = `i`.`id`)))
GROUP BY `i`.`id`;

-- ----------------------------------------------------------------------------
-- View: v_monthly_billing_summary
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS `v_monthly_billing_summary`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_monthly_billing_summary` AS
SELECT
    `mb`.`id` AS `id`,
    `mb`.`customer_id` AS `customer_id`,
    `c`.`name` AS `customer_name`,
    `c`.`phone` AS `customer_phone`,
    `mb`.`billing_month` AS `billing_month`,
    `mb`.`total_delivered` AS `total_delivered`,
    `mb`.`total_absent` AS `total_absent`,
    `mb`.`total_extra` AS `total_extra`,
    `mb`.`total_days` AS `total_days`,
    `mb`.`base_amount` AS `base_amount`,
    `mb`.`extra_amount` AS `extra_amount`,
    `mb`.`total_amount` AS `total_amount`,
    `mb`.`status` AS `status`,
    `mb`.`calculated_at` AS `calculated_at`,
    `mb`.`finalized_at` AS `finalized_at`,
    `mb`.`paid_at` AS `paid_at`,
    `mb`.`payment_method` AS `payment_method`
FROM (`monthly_billing` `mb`
    JOIN `customers` `c` ON((`mb`.`customer_id` = `c`.`id`)))
ORDER BY `mb`.`billing_month` DESC,`c`.`name`;

-- ----------------------------------------------------------------------------
-- View: v_monthly_billing_with_balance
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS `v_monthly_billing_with_balance`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_monthly_billing_with_balance` AS
SELECT
    `mb`.`id` AS `id`,
    `mb`.`customer_id` AS `customer_id`,
    `c`.`name` AS `customer_name`,
    `c`.`phone` AS `customer_phone`,
    `mb`.`billing_month` AS `billing_month`,
    `mb`.`total_delivered` AS `total_delivered`,
    `mb`.`total_absent` AS `total_absent`,
    `mb`.`total_extra` AS `total_extra`,
    `mb`.`total_days` AS `total_days`,
    `mb`.`base_amount` AS `base_amount`,
    `mb`.`extra_amount` AS `extra_amount`,
    `mb`.`total_amount` AS `total_amount`,
    `mb`.`amount_paid` AS `amount_paid`,
    `mb`.`credit_applied` AS `credit_applied`,
    ((`mb`.`total_amount` - COALESCE(`mb`.`amount_paid`,0)) - COALESCE(`mb`.`credit_applied`,0)) AS `balance_due`,
    `mb`.`status` AS `status`,
    `mb`.`last_payment_date` AS `last_payment_date`,
    `mb`.`payment_count` AS `payment_count`,
    `mb`.`calculated_at` AS `calculated_at`,
    `mb`.`finalized_at` AS `finalized_at`,
    `mb`.`paid_at` AS `paid_at`,
    `mb`.`payment_method` AS `payment_method`
FROM (`monthly_billing` `mb`
    JOIN `customers` `c` ON((`mb`.`customer_id` = `c`.`id`)))
ORDER BY `mb`.`billing_month` DESC,`c`.`name`;

-- ----------------------------------------------------------------------------
-- View: v_pending_payment_invoices
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS `v_pending_payment_invoices`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_pending_payment_invoices` AS
SELECT
    `mb`.`id` AS `id`,
    `mb`.`customer_id` AS `customer_id`,
    `c`.`name` AS `customer_name`,
    `c`.`phone` AS `customer_phone`,
    `mb`.`billing_month` AS `billing_month`,
    `mb`.`total_amount` AS `total_amount`,
    `mb`.`amount_paid` AS `amount_paid`,
    `mb`.`credit_applied` AS `credit_applied`,
    ((`mb`.`total_amount` - COALESCE(`mb`.`amount_paid`,0)) - COALESCE(`mb`.`credit_applied`,0)) AS `balance_due`,
    `mb`.`status` AS `status`,
    `mb`.`last_payment_date` AS `last_payment_date`
FROM (`monthly_billing` `mb`
    JOIN `customers` `c` ON((`mb`.`customer_id` = `c`.`id`)))
WHERE ((`mb`.`status` IN ('finalized','partial_paid'))
    AND (((`mb`.`total_amount` - COALESCE(`mb`.`amount_paid`,0)) - COALESCE(`mb`.`credit_applied`,0)) > 0))
ORDER BY (CASE `mb`.`status` WHEN 'partial_paid' THEN 1 ELSE 2 END),`mb`.`billing_month`;

-- ----------------------------------------------------------------------------
-- View: v_unread_notifications
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS `v_unread_notifications`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_unread_notifications` AS
SELECT
    `pn`.`id` AS `id`,
    `pn`.`notification_type` AS `notification_type`,
    `pn`.`title` AS `title`,
    `pn`.`message` AS `message`,
    `pn`.`priority` AS `priority`,
    `pn`.`action_url` AS `action_url`,
    `pn`.`billing_month` AS `billing_month`,
    `c`.`name` AS `customer_name`,
    `pn`.`created_at` AS `created_at`
FROM (`payment_notifications` `pn`
    LEFT JOIN `customers` `c` ON((`pn`.`customer_id` = `c`.`id`)))
WHERE ((`pn`.`is_read` = FALSE) AND (`pn`.`is_dismissed` = FALSE))
ORDER BY `pn`.`priority` DESC,`pn`.`created_at` DESC;

-- ============================================================================
-- RESTORE SETTINGS
-- ============================================================================

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
