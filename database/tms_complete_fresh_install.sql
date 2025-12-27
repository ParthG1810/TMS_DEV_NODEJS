-- ============================================================
-- TMS (Tiffin Management System) - COMPLETE DATABASE SCHEMA
-- ============================================================
-- Version: 2.0.0
-- Date: 2025-12-25
-- Description: Complete fresh database installation script
--              Includes all tables, views, stored procedures,
--              triggers, and seed data for user login
-- ============================================================
--
-- USAGE:
--   mysql -u root -p < tms_complete_fresh_install.sql
--
-- WARNING: This script will DROP the existing TmsDb_Dev database!
-- ============================================================

-- ============================================================
-- STEP 1: DROP AND CREATE DATABASE
-- ============================================================

DROP DATABASE IF EXISTS TmsDb_Dev;
CREATE DATABASE TmsDb_Dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE TmsDb_Dev;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- ============================================================
-- PART 1: RECIPE & INGREDIENT MANAGEMENT TABLES
-- ============================================================

-- -----------------------------------------------------
-- Table: ingredients
-- -----------------------------------------------------
CREATE TABLE ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: vendors
-- -----------------------------------------------------
CREATE TABLE vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_id INT NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    weight DECIMAL(10, 2) NOT NULL CHECK (weight > 0),
    package_size ENUM('tsp', 'tbsp', 'c', 'pt', 'qt', 'gal', 'fl_oz', 'oz', 'lb', 'g', 'kg', 'ml', 'l', 'pcs') NOT NULL DEFAULT 'g',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    INDEX idx_ingredient_id (ingredient_id),
    INDEX idx_vendor_name (vendor_name),
    INDEX idx_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: recipes
-- -----------------------------------------------------
CREATE TABLE recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: recipe_ingredients (Junction Table)
-- -----------------------------------------------------
CREATE TABLE recipe_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    UNIQUE KEY unique_recipe_ingredient (recipe_id, ingredient_id),
    INDEX idx_recipe_id (recipe_id),
    INDEX idx_ingredient_id (ingredient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: recipe_images
-- -----------------------------------------------------
CREATE TABLE recipe_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    INDEX idx_recipe_id (recipe_id),
    INDEX idx_display_order (display_order),
    INDEX idx_is_primary (is_primary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PART 2: TIFFIN MANAGEMENT CORE TABLES
-- ============================================================

-- -----------------------------------------------------
-- Table: meal_plans
-- -----------------------------------------------------
CREATE TABLE meal_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meal_name VARCHAR(255) NOT NULL,
    description TEXT,
    frequency ENUM('Daily', 'Weekly', 'Monthly') NOT NULL,
    days ENUM('Mon-Fri', 'Mon-Sat', 'Single') DEFAULT 'Single',
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_frequency (frequency),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: customers
-- -----------------------------------------------------
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_phone (phone),
    UNIQUE KEY unique_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: customer_orders
-- -----------------------------------------------------
CREATE TABLE customer_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    meal_plan_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    selected_days JSON NOT NULL COMMENT 'Array of selected days like ["Monday", "Tuesday", ...]',
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    payment_id INT NULL,
    payment_status ENUM('calculating', 'pending', 'finalized', 'paid', 'partial_paid') DEFAULT 'calculating',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_order (customer_id, meal_plan_id, start_date, end_date),
    INDEX idx_customer_id (customer_id),
    INDEX idx_meal_plan_id (meal_plan_id),
    INDEX idx_start_date (start_date),
    INDEX idx_end_date (end_date),
    INDEX idx_created_at (created_at),
    INDEX idx_payment_status (payment_status),
    CHECK (end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PART 3: CALENDAR & BILLING TABLES
-- ============================================================

-- -----------------------------------------------------
-- Table: tiffin_calendar_entries
-- -----------------------------------------------------
CREATE TABLE tiffin_calendar_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_id INT NOT NULL,
    delivery_date DATE NOT NULL,
    status ENUM('T', 'A', 'E') NOT NULL COMMENT 'T=Delivered, A=Absent/Cancelled, E=Extra',
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES customer_orders(id) ON DELETE CASCADE,
    UNIQUE KEY unique_customer_date (customer_id, delivery_date),
    INDEX idx_customer_date (customer_id, delivery_date),
    INDEX idx_order_id (order_id),
    INDEX idx_delivery_date (delivery_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: monthly_billing
-- -----------------------------------------------------
CREATE TABLE monthly_billing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    billing_month VARCHAR(7) NOT NULL COMMENT 'Format: YYYY-MM',
    total_delivered INT NOT NULL DEFAULT 0,
    total_absent INT NOT NULL DEFAULT 0,
    total_extra INT NOT NULL DEFAULT 0,
    total_days INT NOT NULL DEFAULT 0,
    base_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    extra_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    amount_paid DECIMAL(10, 2) DEFAULT 0.00,
    credit_applied DECIMAL(10, 2) DEFAULT 0.00,
    last_payment_date DATE DEFAULT NULL,
    payment_count INT DEFAULT 0,
    status ENUM('calculating', 'pending', 'finalized', 'paid', 'partial_paid') DEFAULT 'calculating',
    calculated_at TIMESTAMP NULL,
    finalized_at TIMESTAMP NULL,
    finalized_by VARCHAR(100) NULL,
    paid_at TIMESTAMP NULL,
    payment_method VARCHAR(50) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_customer_month (customer_id, billing_month),
    INDEX idx_customer_month (customer_id, billing_month),
    INDEX idx_billing_month (billing_month),
    INDEX idx_status (status),
    INDEX idx_calculated_at (calculated_at),
    INDEX idx_amount_paid (amount_paid),
    INDEX idx_last_payment_date (last_payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: pricing_rules
-- -----------------------------------------------------
CREATE TABLE pricing_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meal_plan_id INT NULL,
    rule_name VARCHAR(255) NOT NULL,
    delivered_price DECIMAL(10, 2) NOT NULL,
    extra_price DECIMAL(10, 2) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,
    INDEX idx_meal_plan_id (meal_plan_id),
    INDEX idx_effective_dates (effective_from, effective_to),
    INDEX idx_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PART 4: GMAIL OAUTH & INTERAC PAYMENT TABLES
-- ============================================================

-- -----------------------------------------------------
-- Table: gmail_oauth_settings
-- -----------------------------------------------------
CREATE TABLE gmail_oauth_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_name VARCHAR(100) NOT NULL DEFAULT 'primary',
    email_address VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at DATETIME,
    last_sync_email_id VARCHAR(255) DEFAULT NULL,
    last_sync_email_date DATE DEFAULT NULL,
    last_sync_email_subject VARCHAR(255) DEFAULT NULL,
    last_sync_at DATETIME DEFAULT NULL,
    sync_enabled TINYINT(1) DEFAULT 1,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_email (email_address),
    INDEX idx_active (is_active),
    INDEX idx_sync_enabled (sync_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: interac_transactions
-- -----------------------------------------------------
CREATE TABLE interac_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gmail_settings_id INT NOT NULL,
    gmail_message_id VARCHAR(255) NOT NULL,
    email_date DATETIME NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    reference_number VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CAD',
    raw_email_body TEXT,
    auto_matched_customer_id INT DEFAULT NULL,
    confirmed_customer_id INT DEFAULT NULL,
    match_confidence DECIMAL(3, 2) DEFAULT 0.00,
    status ENUM('pending', 'allocated', 'ignored', 'deleted') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_flag TINYINT(1) DEFAULT 0,
    deleted_at DATETIME DEFAULT NULL,
    deleted_by INT DEFAULT NULL,
    UNIQUE KEY unique_gmail_message (gmail_message_id),
    FOREIGN KEY (gmail_settings_id) REFERENCES gmail_oauth_settings(id) ON DELETE CASCADE,
    INDEX idx_reference (reference_number),
    INDEX idx_status (status),
    INDEX idx_email_date (email_date),
    INDEX idx_deleted (deleted_flag),
    INDEX idx_auto_matched (auto_matched_customer_id),
    INDEX idx_confirmed (confirmed_customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: customer_name_aliases
-- -----------------------------------------------------
CREATE TABLE customer_name_aliases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    alias_name VARCHAR(255) NOT NULL,
    source ENUM('manual', 'learned') DEFAULT 'manual',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT DEFAULT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_alias (alias_name),
    INDEX idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PART 5: PAYMENT WORKFLOW TABLES
-- ============================================================

-- -----------------------------------------------------
-- Table: payment_records
-- -----------------------------------------------------
CREATE TABLE payment_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_type ENUM('online', 'cash') NOT NULL,
    payment_source VARCHAR(50) DEFAULT NULL,
    interac_transaction_id INT DEFAULT NULL,
    customer_id INT DEFAULT NULL,
    payer_name VARCHAR(255) DEFAULT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    reference_number VARCHAR(100) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    total_allocated DECIMAL(10, 2) DEFAULT 0.00,
    excess_amount DECIMAL(10, 2) DEFAULT 0.00,
    allocation_status ENUM('unallocated', 'partial', 'fully_allocated', 'has_excess') DEFAULT 'unallocated',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT DEFAULT NULL,
    deleted_flag TINYINT(1) DEFAULT 0,
    deleted_at DATETIME DEFAULT NULL,
    deleted_by INT DEFAULT NULL,
    delete_reason TEXT DEFAULT NULL,
    FOREIGN KEY (interac_transaction_id) REFERENCES interac_transactions(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    INDEX idx_payment_date (payment_date),
    INDEX idx_deleted (deleted_flag),
    INDEX idx_allocation_status (allocation_status),
    INDEX idx_customer (customer_id),
    INDEX idx_payment_type (payment_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: payment_allocations
-- -----------------------------------------------------
CREATE TABLE payment_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_record_id INT NOT NULL,
    billing_id INT NOT NULL,
    customer_id INT NOT NULL,
    allocation_order INT NOT NULL,
    allocated_amount DECIMAL(10, 2) NOT NULL,
    invoice_balance_before DECIMAL(10, 2) NOT NULL,
    invoice_balance_after DECIMAL(10, 2) NOT NULL,
    resulting_status ENUM('partial_paid', 'paid') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT DEFAULT NULL,
    deleted_flag TINYINT(1) DEFAULT 0,
    deleted_at DATETIME DEFAULT NULL,
    deleted_by INT DEFAULT NULL,
    FOREIGN KEY (payment_record_id) REFERENCES payment_records(id) ON DELETE CASCADE,
    FOREIGN KEY (billing_id) REFERENCES monthly_billing(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_payment (payment_record_id),
    INDEX idx_billing (billing_id),
    INDEX idx_customer (customer_id),
    INDEX idx_deleted (deleted_flag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: customer_credit
-- -----------------------------------------------------
CREATE TABLE customer_credit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    payment_record_id INT NOT NULL,
    original_amount DECIMAL(10, 2) NOT NULL,
    current_balance DECIMAL(10, 2) NOT NULL,
    status ENUM('available', 'used', 'refunded', 'expired') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notes TEXT DEFAULT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_record_id) REFERENCES payment_records(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_payment (payment_record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: customer_credit_usage
-- -----------------------------------------------------
CREATE TABLE customer_credit_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    credit_id INT NOT NULL,
    billing_id INT NOT NULL,
    amount_used DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_by INT DEFAULT NULL,
    FOREIGN KEY (credit_id) REFERENCES customer_credit(id) ON DELETE CASCADE,
    FOREIGN KEY (billing_id) REFERENCES monthly_billing(id) ON DELETE CASCADE,
    INDEX idx_credit (credit_id),
    INDEX idx_billing (billing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: refund_records
-- -----------------------------------------------------
CREATE TABLE refund_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_type ENUM('credit', 'payment') NOT NULL,
    credit_id INT DEFAULT NULL,
    payment_record_id INT DEFAULT NULL,
    customer_id INT NOT NULL,
    refund_amount DECIMAL(10, 2) NOT NULL,
    refund_method ENUM('interac', 'cash', 'cheque', 'other') NOT NULL,
    refund_date DATE NOT NULL,
    reference_number VARCHAR(100) DEFAULT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    requested_by INT NOT NULL,
    approved_by INT DEFAULT NULL,
    approved_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_flag TINYINT(1) DEFAULT 0,
    deleted_at DATETIME DEFAULT NULL,
    deleted_by INT DEFAULT NULL,
    FOREIGN KEY (credit_id) REFERENCES customer_credit(id) ON DELETE SET NULL,
    FOREIGN KEY (payment_record_id) REFERENCES payment_records(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_deleted (deleted_flag),
    INDEX idx_refund_date (refund_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PART 6: NOTIFICATION & LEGACY PAYMENT TABLES
-- ============================================================

-- -----------------------------------------------------
-- Table: payment_notifications
-- -----------------------------------------------------
CREATE TABLE payment_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    notification_type ENUM(
        'month_end_calculation',
        'payment_received',
        'payment_overdue',
        'billing_pending_approval',
        'interac_received',
        'payment_allocated',
        'invoice_paid',
        'excess_payment',
        'refund_request',
        'refund_completed',
        'refund_cancelled'
    ) NOT NULL,
    billing_id INT NULL,
    customer_id INT NULL,
    billing_month VARCHAR(7) NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    action_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    dismissed_at TIMESTAMP NULL,
    auto_delete_on_action TINYINT(1) DEFAULT 0,
    related_payment_id INT DEFAULT NULL,
    related_interac_id INT DEFAULT NULL,
    FOREIGN KEY (billing_id) REFERENCES monthly_billing(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_is_read (is_read),
    INDEX idx_billing_id (billing_id),
    INDEX idx_created_at (created_at),
    INDEX idx_notification_type (notification_type),
    INDEX idx_priority (priority),
    INDEX idx_auto_delete (auto_delete_on_action),
    INDEX idx_related_payment (related_payment_id),
    INDEX idx_related_interac (related_interac_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: payment_history (legacy - backward compatibility)
-- -----------------------------------------------------
CREATE TABLE payment_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    billing_id INT NOT NULL,
    customer_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_date DATE NOT NULL,
    transaction_id VARCHAR(100) NULL,
    reference_number VARCHAR(100) NULL,
    notes TEXT NULL,
    created_by VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (billing_id) REFERENCES monthly_billing(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_billing_id (billing_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_transaction_id (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PART 7: USER & AUTHENTICATION TABLES
-- ============================================================

-- -----------------------------------------------------
-- Table: users
-- -----------------------------------------------------
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    photo_url VARCHAR(500) DEFAULT NULL,
    role ENUM('admin', 'manager', 'staff', 'tester', 'user') DEFAULT 'user',
    status ENUM('active', 'inactive', 'suspended', 'pending') DEFAULT 'active',
    is_public TINYINT(1) DEFAULT 1,
    is_verified TINYINT(1) DEFAULT 0,
    phone_number VARCHAR(50) DEFAULT NULL,
    country VARCHAR(100) DEFAULT NULL,
    address VARCHAR(500) DEFAULT NULL,
    city VARCHAR(100) DEFAULT NULL,
    state VARCHAR(100) DEFAULT NULL,
    zip_code VARCHAR(20) DEFAULT NULL,
    about TEXT DEFAULT NULL,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: password_reset_tokens
-- -----------------------------------------------------
CREATE TABLE password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: login_audit_log
-- -----------------------------------------------------
CREATE TABLE login_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NULL,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    status ENUM('success', 'failed', 'blocked') NOT NULL,
    failure_reason VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_email (email),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: password_reset_requests
-- -----------------------------------------------------
CREATE TABLE password_reset_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) DEFAULT NULL,
    status ENUM('pending', 'completed', 'rejected') DEFAULT 'pending',
    admin_notified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    resolved_by VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (user_email),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: user_roles
-- -----------------------------------------------------
CREATE TABLE user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) DEFAULT NULL,
    role ENUM('admin', 'manager', 'staff', 'viewer') NOT NULL DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_role (user_id),
    INDEX idx_role (role),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: delete_authorization_log
-- -----------------------------------------------------
CREATE TABLE delete_authorization_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) DEFAULT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id INT NOT NULL,
    action_type ENUM('soft_delete', 'restore') NOT NULL,
    password_verified TINYINT(1) NOT NULL DEFAULT 0,
    reason TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_table_record (table_name, record_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PART 8: LABEL PRINTING TABLES
-- ============================================================

-- -----------------------------------------------------
-- Table: label_templates
-- -----------------------------------------------------
CREATE TABLE label_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT 'Template name',
    description VARCHAR(500) NULL COMMENT 'Optional description',
    width_inches DECIMAL(4, 2) NOT NULL COMMENT 'Label width in inches',
    height_inches DECIMAL(4, 2) NOT NULL COMMENT 'Label height in inches',
    template_html TEXT NOT NULL COMMENT 'HTML content with {{placeholders}}',
    custom_placeholders JSON NULL COMMENT 'User-defined custom placeholders array',
    print_settings JSON NULL COMMENT 'Printer settings: dpi, darkness, speed, etc.',
    is_default BOOLEAN DEFAULT FALSE COMMENT 'Only one template should be default',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: customer_print_order
-- -----------------------------------------------------
CREATE TABLE customer_print_order (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL COMMENT 'Reference to customers table',
    print_order INT NOT NULL DEFAULT 0 COMMENT 'Order position for printing',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_customer (customer_id),
    INDEX idx_print_order (print_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PART 9: OPTIONAL TABLES
-- ============================================================

-- -----------------------------------------------------
-- Table: products (for e-commerce if needed)
-- -----------------------------------------------------
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    stock INT DEFAULT 0,
    image_url VARCHAR(500),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_is_available (is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PART 10: DATABASE VIEWS
-- ============================================================

-- View: Monthly billing summary with customer details
CREATE OR REPLACE VIEW v_monthly_billing_summary AS
SELECT
    mb.id,
    mb.customer_id,
    c.name AS customer_name,
    c.phone AS customer_phone,
    mb.billing_month,
    mb.total_delivered,
    mb.total_absent,
    mb.total_extra,
    mb.total_days,
    mb.base_amount,
    mb.extra_amount,
    mb.total_amount,
    mb.status,
    mb.calculated_at,
    mb.finalized_at,
    mb.paid_at,
    mb.payment_method
FROM monthly_billing mb
INNER JOIN customers c ON mb.customer_id = c.id
ORDER BY mb.billing_month DESC, c.name ASC;

-- View: Calendar entries with customer and order details
CREATE OR REPLACE VIEW v_calendar_entries_detail AS
SELECT
    tce.id,
    tce.customer_id,
    c.name AS customer_name,
    tce.order_id,
    tce.delivery_date,
    tce.status,
    tce.quantity,
    tce.price,
    co.meal_plan_id,
    mp.meal_name,
    tce.notes,
    tce.created_at,
    tce.updated_at
FROM tiffin_calendar_entries tce
INNER JOIN customers c ON tce.customer_id = c.id
INNER JOIN customer_orders co ON tce.order_id = co.id
INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
ORDER BY tce.delivery_date DESC;

-- View: Unread payment notifications
CREATE OR REPLACE VIEW v_unread_notifications AS
SELECT
    pn.id,
    pn.notification_type,
    pn.title,
    pn.message,
    pn.priority,
    pn.action_url,
    pn.billing_month,
    pn.billing_id,
    pn.customer_id,
    c.name AS customer_name,
    pn.related_payment_id,
    pn.related_interac_id,
    pn.auto_delete_on_action,
    pn.created_at
FROM payment_notifications pn
LEFT JOIN customers c ON pn.customer_id = c.id
WHERE pn.is_read = FALSE AND pn.is_dismissed = FALSE
ORDER BY pn.priority DESC, pn.created_at DESC;

-- View: Monthly billing with balance
CREATE OR REPLACE VIEW v_monthly_billing_with_balance AS
SELECT
    mb.id,
    mb.customer_id,
    c.name AS customer_name,
    c.phone AS customer_phone,
    mb.billing_month,
    mb.total_delivered,
    mb.total_absent,
    mb.total_extra,
    mb.total_days,
    mb.base_amount,
    mb.extra_amount,
    mb.total_amount,
    mb.amount_paid,
    mb.credit_applied,
    (mb.total_amount - COALESCE(mb.amount_paid, 0) - COALESCE(mb.credit_applied, 0)) AS balance_due,
    mb.status,
    mb.last_payment_date,
    mb.payment_count,
    mb.calculated_at,
    mb.finalized_at,
    mb.paid_at,
    mb.payment_method
FROM monthly_billing mb
INNER JOIN customers c ON mb.customer_id = c.id
ORDER BY mb.billing_month DESC, c.name ASC;

-- View: Pending payment invoices (for allocation UI)
CREATE OR REPLACE VIEW v_pending_payment_invoices AS
SELECT
    mb.id,
    mb.customer_id,
    c.name AS customer_name,
    c.phone AS customer_phone,
    mb.billing_month,
    mb.total_amount,
    mb.amount_paid,
    mb.credit_applied,
    (mb.total_amount - COALESCE(mb.amount_paid, 0) - COALESCE(mb.credit_applied, 0)) AS balance_due,
    mb.status,
    mb.last_payment_date
FROM monthly_billing mb
INNER JOIN customers c ON mb.customer_id = c.id
WHERE mb.status IN ('finalized', 'partial_paid')
AND (mb.total_amount - COALESCE(mb.amount_paid, 0) - COALESCE(mb.credit_applied, 0)) > 0
ORDER BY
    CASE mb.status
        WHEN 'partial_paid' THEN 1
        ELSE 2
    END,
    mb.billing_month ASC;

-- View: Payment-related notifications
CREATE OR REPLACE VIEW v_payment_notifications AS
SELECT
    pn.id,
    pn.notification_type,
    pn.title,
    pn.message,
    pn.priority,
    pn.action_url,
    pn.billing_id,
    pn.customer_id,
    c.name AS customer_name,
    pn.related_payment_id,
    pn.related_interac_id,
    pn.is_read,
    pn.is_dismissed,
    pn.auto_delete_on_action,
    pn.created_at,
    pn.read_at,
    pn.dismissed_at
FROM payment_notifications pn
LEFT JOIN customers c ON pn.customer_id = c.id
WHERE pn.notification_type IN (
    'interac_received',
    'payment_allocated',
    'invoice_paid',
    'excess_payment',
    'refund_request',
    'refund_completed',
    'refund_cancelled'
)
ORDER BY pn.created_at DESC;

-- View: Customers with print order
CREATE OR REPLACE VIEW v_customers_print_order AS
SELECT
    c.id,
    c.name,
    c.phone,
    c.address,
    COALESCE(cpo.print_order, 999999) as print_order,
    c.created_at,
    c.updated_at
FROM customers c
LEFT JOIN customer_print_order cpo ON c.id = cpo.customer_id
ORDER BY COALESCE(cpo.print_order, 999999), c.name;

-- View: Customer orders with details
CREATE OR REPLACE VIEW v_customer_orders_detail AS
SELECT
    co.id,
    co.customer_id,
    c.name AS customer_name,
    c.phone AS customer_phone,
    c.address AS customer_address,
    co.meal_plan_id,
    mp.meal_name,
    mp.description AS meal_plan_description,
    mp.frequency AS meal_plan_frequency,
    mp.days AS meal_plan_days,
    co.quantity,
    co.selected_days,
    co.price,
    co.payment_id,
    co.payment_status,
    co.start_date,
    co.end_date,
    co.created_at,
    co.updated_at
FROM customer_orders co
INNER JOIN customers c ON co.customer_id = c.id
INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
ORDER BY co.created_at DESC;

-- ============================================================
-- PART 11: STORED PROCEDURES
-- ============================================================

DELIMITER //

-- -----------------------------------------------------
-- Procedure: sp_calculate_monthly_billing
-- Purpose: Calculate monthly billing based on calendar entries
-- -----------------------------------------------------
DROP PROCEDURE IF EXISTS sp_calculate_monthly_billing//
CREATE PROCEDURE sp_calculate_monthly_billing(
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

    -- Calculate base amount dynamically
    SELECT COALESCE(SUM(
        (co.price / NULLIF((
            SELECT COUNT(*)
            FROM tiffin_calendar_entries tce_count
            WHERE tce_count.order_id = co.id
            AND DATE_FORMAT(tce_count.delivery_date, '%Y-%m') = p_billing_month
            AND tce_count.status IN ('T', 'A')
        ), 0)) * (
            SELECT COUNT(*)
            FROM tiffin_calendar_entries tce_delivered
            WHERE tce_delivered.order_id = co.id
            AND DATE_FORMAT(tce_delivered.delivery_date, '%Y-%m') = p_billing_month
            AND tce_delivered.status = 'T'
        )
    ), 0)
    INTO v_base_amount
    FROM customer_orders co
    WHERE co.customer_id = p_customer_id
    AND EXISTS (
        SELECT 1 FROM tiffin_calendar_entries tce
        WHERE tce.order_id = co.id
        AND DATE_FORMAT(tce.delivery_date, '%Y-%m') = p_billing_month
        AND tce.status IN ('T', 'A')
    );

    -- Calculate extra amount from E entries
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
END//

-- -----------------------------------------------------
-- Procedure: sp_allocate_payment
-- Purpose: Allocate payment to one or more invoices
-- -----------------------------------------------------
DROP PROCEDURE IF EXISTS sp_allocate_payment//
CREATE PROCEDURE sp_allocate_payment(
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
                title, message, priority, action_url,
                related_payment_id, auto_delete_on_action
            ) VALUES (
                v_customer_id, 'excess_payment',
                'Excess Payment Recorded',
                CONCAT('Customer has $', v_remaining_amount, ' credit available.'),
                'medium',
                CONCAT('/dashboard/payments/credit/', v_credit_id),
                p_payment_record_id, 1
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
END//

-- -----------------------------------------------------
-- Procedure: sp_reverse_payment_allocation
-- Purpose: Reverse/undo payment allocations
-- -----------------------------------------------------
DROP PROCEDURE IF EXISTS sp_reverse_payment_allocation//
CREATE PROCEDURE sp_reverse_payment_allocation(
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
END//

-- -----------------------------------------------------
-- Procedure: sp_initialize_customer_print_order
-- Purpose: Initialize alphabetical print order for all customers
-- -----------------------------------------------------
DROP PROCEDURE IF EXISTS sp_initialize_customer_print_order//
CREATE PROCEDURE sp_initialize_customer_print_order()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_customer_id INT;
    DECLARE v_order INT DEFAULT 0;

    DECLARE customer_cursor CURSOR FOR
        SELECT id FROM customers ORDER BY name;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    DELETE FROM customer_print_order;

    OPEN customer_cursor;

    read_loop: LOOP
        FETCH customer_cursor INTO v_customer_id;
        IF done THEN
            LEAVE read_loop;
        END IF;

        INSERT INTO customer_print_order (customer_id, print_order)
        VALUES (v_customer_id, v_order);

        SET v_order = v_order + 1;
    END LOOP;

    CLOSE customer_cursor;

    SELECT CONCAT('Initialized print order for ', v_order, ' customers') AS result;
END//

-- -----------------------------------------------------
-- Procedure: sp_reset_customer_print_order
-- Purpose: Reset print order to alphabetical sequence
-- -----------------------------------------------------
DROP PROCEDURE IF EXISTS sp_reset_customer_print_order//
CREATE PROCEDURE sp_reset_customer_print_order()
BEGIN
    DELETE FROM customer_print_order;

    INSERT INTO customer_print_order (customer_id, print_order)
    SELECT id, (@row_number := @row_number + 1) - 1 as print_order
    FROM customers, (SELECT @row_number := 0) AS t
    ORDER BY name;

    SELECT 'Print order reset to alphabetical' AS result;
END//

DELIMITER ;

-- ============================================================
-- PART 12: TRIGGERS
-- ============================================================

DELIMITER //

-- Trigger: Auto-calculate billing after insert
DROP TRIGGER IF EXISTS tr_calendar_entry_after_insert//
CREATE TRIGGER tr_calendar_entry_after_insert
AFTER INSERT ON tiffin_calendar_entries
FOR EACH ROW
BEGIN
    CALL sp_calculate_monthly_billing(
        NEW.customer_id,
        DATE_FORMAT(NEW.delivery_date, '%Y-%m')
    );
END//

-- Trigger: Auto-calculate billing after update
DROP TRIGGER IF EXISTS tr_calendar_entry_after_update//
CREATE TRIGGER tr_calendar_entry_after_update
AFTER UPDATE ON tiffin_calendar_entries
FOR EACH ROW
BEGIN
    CALL sp_calculate_monthly_billing(
        NEW.customer_id,
        DATE_FORMAT(NEW.delivery_date, '%Y-%m')
    );
END//

-- Trigger: Auto-calculate billing after delete
DROP TRIGGER IF EXISTS tr_calendar_entry_after_delete//
CREATE TRIGGER tr_calendar_entry_after_delete
AFTER DELETE ON tiffin_calendar_entries
FOR EACH ROW
BEGIN
    CALL sp_calculate_monthly_billing(
        OLD.customer_id,
        DATE_FORMAT(OLD.delivery_date, '%Y-%m')
    );
END//

-- Trigger: Ensure only one default label template on insert
DROP TRIGGER IF EXISTS before_label_template_insert//
CREATE TRIGGER before_label_template_insert
BEFORE INSERT ON label_templates
FOR EACH ROW
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE label_templates SET is_default = FALSE WHERE is_default = TRUE;
    END IF;
END//

-- Trigger: Ensure only one default label template on update
DROP TRIGGER IF EXISTS before_label_template_update//
CREATE TRIGGER before_label_template_update
BEFORE UPDATE ON label_templates
FOR EACH ROW
BEGIN
    IF NEW.is_default = TRUE AND OLD.is_default = FALSE THEN
        UPDATE label_templates SET is_default = FALSE WHERE id != NEW.id AND is_default = TRUE;
    END IF;
END//

DELIMITER ;

-- ============================================================
-- PART 13: DEFAULT DATA / SEED DATA
-- ============================================================

-- Insert default pricing rule
INSERT INTO pricing_rules (rule_name, delivered_price, extra_price, is_default, effective_from)
VALUES ('Default Pricing', 50.00, 60.00, TRUE, CURDATE());

-- Sample Meal Plans
INSERT INTO meal_plans (meal_name, description, frequency, days, price) VALUES
('Standard Lunch Box', 'Daily lunch tiffin with 2 rotis, sabzi, dal, and rice', 'Daily', 'Mon-Fri', 50.00),
('Premium Lunch Box', 'Premium lunch with 3 rotis, sabzi, dal, rice, and sweet', 'Daily', 'Mon-Fri', 70.00),
('Weekly Special', 'Special tiffin for entire week', 'Weekly', 'Mon-Sat', 350.00),
('Monthly Package', 'Complete month tiffin service', 'Monthly', 'Mon-Sat', 1200.00);

-- Sample Customers
INSERT INTO customers (name, phone, address) VALUES
('Rajesh Kumar', '9876543210', '123, MG Road, Bangalore, Karnataka'),
('Priya Sharma', '9876543211', '456, Park Street, Mumbai, Maharashtra'),
('Amit Patel', '9876543212', '789, Church Street, Pune, Maharashtra'),
('Sneha Desai', '9876543213', '321, Brigade Road, Bangalore, Karnataka'),
('Vikram Singh', '9876543214', '654, Commercial Street, Delhi, NCR');

-- Sample Ingredients
INSERT INTO ingredients (name, description) VALUES
('Rice', 'Basmati rice'),
('Wheat Flour', 'Whole wheat flour for rotis'),
('Lentils', 'Toor dal'),
('Tomatoes', 'Fresh tomatoes'),
('Onions', 'Fresh onions'),
('Potatoes', 'Fresh potatoes'),
('Spices Mix', 'Indian spice blend');

-- Sample Vendors
INSERT INTO vendors (ingredient_id, vendor_name, price, weight, package_size, is_default) VALUES
(1, 'ABC Grains', 60.00, 1, 'kg', TRUE),
(2, 'XYZ Flour Mills', 45.00, 1, 'kg', TRUE),
(3, 'Lentil Suppliers Co', 120.00, 1, 'kg', TRUE);

-- Default Label Template
INSERT INTO label_templates (
    name,
    description,
    width_inches,
    height_inches,
    template_html,
    custom_placeholders,
    print_settings,
    is_default
) VALUES (
    'Standard Tiffin 4x2',
    'Default label template for tiffin delivery customers',
    4.00,
    2.00,
    '<div style="font-family: Arial, sans-serif; padding: 8px;">
  <div style="font-size: 18pt; font-weight: bold; margin-bottom: 4px;">{{customerName}}</div>
  <div style="font-size: 12pt; margin-bottom: 4px;">{{customerAddress}}</div>
  <div style="font-size: 10pt; color: #666;">Phone: {{customerPhone}}</div>
</div>',
    NULL,
    JSON_OBJECT(
        'dpi', 300,
        'mediaType', 'direct-thermal',
        'printSpeed', 4,
        'darkness', 15,
        'labelTop', 0,
        'labelShift', 0,
        'printMethod', 'native'
    ),
    TRUE
);

-- ============================================================
-- PART 14: USER SEED DATA
-- ============================================================
-- Passwords (bcrypt hashed):
-- All passwords are: Password@123
-- Hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
-- ============================================================

-- Admin User
INSERT INTO users (
    id, display_name, email, password_hash, role, status,
    is_public, is_verified, phone_number, country, address,
    city, state, zip_code, about
) VALUES (
    'admin-user-001',
    'Admin User',
    'admin@tms.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'admin',
    'active',
    1, 1,
    '+1 555-0100',
    'United States',
    '123 Admin Street',
    'New York',
    'NY',
    '10001',
    'System administrator with full access to all features.'
);

-- Manager User
INSERT INTO users (
    id, display_name, email, password_hash, role, status,
    is_public, is_verified, phone_number, country, address,
    city, state, zip_code, about
) VALUES (
    'manager-user-001',
    'Manager User',
    'manager@tms.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'manager',
    'active',
    1, 1,
    '+1 555-0400',
    'United States',
    '321 Manager Ave',
    'Chicago',
    'IL',
    '60601',
    'Manager with team management access.'
);

-- Staff User
INSERT INTO users (
    id, display_name, email, password_hash, role, status,
    is_public, is_verified, phone_number, country, address,
    city, state, zip_code, about
) VALUES (
    'staff-user-001',
    'Staff User',
    'staff@tms.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'staff',
    'active',
    1, 1,
    '+1 555-0500',
    'United States',
    '555 Staff Boulevard',
    'Houston',
    'TX',
    '77001',
    'Staff member with standard operational access.'
);

-- Tester User
INSERT INTO users (
    id, display_name, email, password_hash, role, status,
    is_public, is_verified, phone_number, country, address,
    city, state, zip_code, about
) VALUES (
    'tester-user-001',
    'QA Tester',
    'tester@tms.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'tester',
    'active',
    1, 1,
    '+1 555-0300',
    'United States',
    '789 Test Drive',
    'San Francisco',
    'CA',
    '94102',
    'QA tester with testing access.'
);

-- Regular User
INSERT INTO users (
    id, display_name, email, password_hash, role, status,
    is_public, is_verified, phone_number, country, address,
    city, state, zip_code, about
) VALUES (
    'regular-user-001',
    'Regular User',
    'user@tms.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'user',
    'active',
    1, 1,
    '+1 555-0200',
    'United States',
    '456 User Lane',
    'Los Angeles',
    'CA',
    '90001',
    'Regular user with standard access.'
);

-- ============================================================
-- FINALIZE
-- ============================================================

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- VERIFICATION QUERIES (uncomment to run)
-- ============================================================
/*
-- Check all tables
SHOW TABLES;

-- Check table counts
SELECT 'Tables' AS type, COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'TmsDb_Dev';
SELECT 'Views' AS type, COUNT(*) AS count FROM information_schema.VIEWS WHERE TABLE_SCHEMA = 'TmsDb_Dev';
SELECT 'Procedures' AS type, COUNT(*) AS count FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = 'TmsDb_Dev' AND ROUTINE_TYPE = 'PROCEDURE';
SELECT 'Triggers' AS type, COUNT(*) AS count FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = 'TmsDb_Dev';

-- Check users
SELECT id, display_name, email, role, status FROM users;

-- Check sample data
SELECT COUNT(*) as meal_plans FROM meal_plans;
SELECT COUNT(*) as customers FROM customers;
SELECT COUNT(*) as ingredients FROM ingredients;
*/

SELECT '============================================================' AS '';
SELECT 'TMS DATABASE INSTALLATION COMPLETE!' AS Status;
SELECT '============================================================' AS '';
SELECT 'Database: TmsDb_Dev' AS Info;
SELECT 'Tables: 24' AS Info;
SELECT 'Views: 8' AS Info;
SELECT 'Stored Procedures: 5' AS Info;
SELECT 'Triggers: 5' AS Info;
SELECT '' AS '';
SELECT 'USER LOGIN CREDENTIALS:' AS Info;
SELECT '------------------------------------------------------------' AS '';
SELECT 'Admin:   admin@tms.com    / Password@123  (role: admin)' AS Credentials;
SELECT 'Manager: manager@tms.com  / Password@123  (role: manager)' AS Credentials;
SELECT 'Staff:   staff@tms.com    / Password@123  (role: staff)' AS Credentials;
SELECT 'Tester:  tester@tms.com   / Password@123  (role: tester)' AS Credentials;
SELECT 'User:    user@tms.com     / Password@123  (role: user)' AS Credentials;
SELECT '============================================================' AS '';

-- ============================================================
-- END OF SCHEMA
-- ============================================================
