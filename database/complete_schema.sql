-- ============================================================
-- Tiffin Management System (TMS) - Complete Database Schema
-- ============================================================
-- Version: 1.0.0
-- Last Updated: 2025-12-13
-- Description: Complete database schema including payment workflow
-- ============================================================
--
-- USAGE:
-- 1. Create database:    mysql -u root -p -e "CREATE DATABASE tms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
-- 2. Import schema:      mysql -u root -p tms_db < complete_schema.sql
-- 3. Import data:        mysql -u root -p tms_db < data_backup.sql (if restoring)
--
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- ============================================================
-- PART 1: CORE TABLES (Tiffin Management)
-- ============================================================

-- -----------------------------------------------------
-- Table: meal_plans
-- Stores meal plan configurations
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_plans (
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
-- Stores customer information
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: customer_orders
-- Stores tiffin orders from customers
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    meal_plan_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity >= 1),
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
    INDEX idx_customer_id (customer_id),
    INDEX idx_meal_plan_id (meal_plan_id),
    INDEX idx_start_date (start_date),
    INDEX idx_end_date (end_date),
    INDEX idx_created_at (created_at),
    INDEX idx_payment_status (payment_status),
    CHECK (end_date > start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PART 2: CALENDAR & BILLING TABLES
-- ============================================================

-- -----------------------------------------------------
-- Table: tiffin_calendar_entries
-- Tracks daily tiffin delivery status for each customer
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS tiffin_calendar_entries (
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
    INDEX idx_customer_date (customer_id, delivery_date),
    INDEX idx_order_id (order_id),
    INDEX idx_delivery_date (delivery_date),
    INDEX idx_status (status),
    UNIQUE KEY unique_customer_date (customer_id, delivery_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: monthly_billing
-- Stores calculated monthly bills for each customer
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS monthly_billing (
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
    amount_paid DECIMAL(10,2) DEFAULT 0.00,
    credit_applied DECIMAL(10,2) DEFAULT 0.00,
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
    INDEX idx_customer_month (customer_id, billing_month),
    INDEX idx_billing_month (billing_month),
    INDEX idx_status (status),
    INDEX idx_calculated_at (calculated_at),
    INDEX idx_amount_paid (amount_paid),
    INDEX idx_last_payment_date (last_payment_date),
    UNIQUE KEY unique_customer_month (customer_id, billing_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: pricing_rules
-- Stores pricing rules for different tiffin types
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS pricing_rules (
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
-- PART 3: PAYMENT WORKFLOW TABLES
-- ============================================================

-- -----------------------------------------------------
-- Table: gmail_oauth_settings
-- Store Gmail OAuth credentials for email scanning
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS gmail_oauth_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_name VARCHAR(100) NOT NULL DEFAULT 'primary',
    email_address VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at DATETIME,
    last_sync_email_id VARCHAR(255) DEFAULT NULL,
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
-- Store raw Interac email data parsed from Gmail
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS interac_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gmail_settings_id INT NOT NULL,
    gmail_message_id VARCHAR(255) NOT NULL,
    email_date DATETIME NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    reference_number VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CAD',
    raw_email_body TEXT,
    auto_matched_customer_id INT DEFAULT NULL,
    confirmed_customer_id INT DEFAULT NULL,
    match_confidence DECIMAL(3,2) DEFAULT 0.00,
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
-- Store customer name variations for Interac sender matching
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_name_aliases (
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

-- -----------------------------------------------------
-- Table: payment_records
-- Master payment table for all payments (Interac + Cash)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_type ENUM('online', 'cash') NOT NULL,
    payment_source VARCHAR(50) DEFAULT NULL,
    interac_transaction_id INT DEFAULT NULL,
    customer_id INT DEFAULT NULL,
    payer_name VARCHAR(255) DEFAULT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reference_number VARCHAR(100) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    total_allocated DECIMAL(10,2) DEFAULT 0.00,
    excess_amount DECIMAL(10,2) DEFAULT 0.00,
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
-- Links payments to invoices (many-to-many) with allocation order
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_record_id INT NOT NULL,
    billing_id INT NOT NULL,
    customer_id INT NOT NULL,
    allocation_order INT NOT NULL,
    allocated_amount DECIMAL(10,2) NOT NULL,
    invoice_balance_before DECIMAL(10,2) NOT NULL,
    invoice_balance_after DECIMAL(10,2) NOT NULL,
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
-- Store excess payments as customer credit balance
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_credit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    payment_record_id INT NOT NULL,
    original_amount DECIMAL(10,2) NOT NULL,
    current_balance DECIMAL(10,2) NOT NULL,
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
-- Track how credits are used against invoices
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_credit_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    credit_id INT NOT NULL,
    billing_id INT NOT NULL,
    amount_used DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_by INT DEFAULT NULL,
    FOREIGN KEY (credit_id) REFERENCES customer_credit(id) ON DELETE CASCADE,
    FOREIGN KEY (billing_id) REFERENCES monthly_billing(id) ON DELETE CASCADE,
    INDEX idx_credit (credit_id),
    INDEX idx_billing (billing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: refund_records
-- Track all refund requests and their status
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS refund_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_type ENUM('credit', 'payment') NOT NULL,
    credit_id INT DEFAULT NULL,
    payment_record_id INT DEFAULT NULL,
    customer_id INT NOT NULL,
    refund_amount DECIMAL(10,2) NOT NULL,
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
-- PART 4: NOTIFICATION & USER TABLES
-- ============================================================

-- -----------------------------------------------------
-- Table: payment_notifications
-- Tracks notifications sent to admin for payment verification
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_notifications (
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
-- Table: payment_history (legacy - for backward compatibility)
-- Tracks all payment transactions
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_history (
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

-- -----------------------------------------------------
-- Table: user_roles
-- Store user roles for authorization
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
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
-- Audit trail for all delete operations
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS delete_authorization_log (
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
-- PART 5: VIEWS
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

-- ============================================================
-- PART 6: STORED PROCEDURES
-- ============================================================

DELIMITER //

-- Procedure: Calculate monthly billing
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

    SELECT
        SUM(CASE WHEN status = 'T' THEN 1 ELSE 0 END),
        SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END),
        SUM(CASE WHEN status = 'E' THEN 1 ELSE 0 END),
        COUNT(*)
    INTO v_total_delivered, v_total_absent, v_total_extra, v_total_days
    FROM tiffin_calendar_entries
    WHERE customer_id = p_customer_id
    AND DATE_FORMAT(delivery_date, '%Y-%m') = p_billing_month;

    SELECT COALESCE(SUM(
        (co.price / (
            SELECT COUNT(*)
            FROM tiffin_calendar_entries tce_count
            WHERE tce_count.order_id = co.id
            AND DATE_FORMAT(tce_count.delivery_date, '%Y-%m') = p_billing_month
            AND tce_count.status IN ('T', 'A')
        )) * (
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

    SELECT COALESCE(SUM(CASE WHEN status = 'E' THEN price ELSE 0 END), 0)
    INTO v_extra_amount
    FROM tiffin_calendar_entries
    WHERE customer_id = p_customer_id
    AND DATE_FORMAT(delivery_date, '%Y-%m') = p_billing_month;

    SET v_total_amount = v_base_amount + v_extra_amount;

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

-- Procedure: Allocate payment to invoices
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
                CONCAT('Customer has $', v_remaining_amount, ' credit available. Consider refund if needed.'),
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

-- Procedure: Reverse payment allocation
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

DELIMITER ;

-- ============================================================
-- PART 7: TRIGGERS
-- ============================================================

DELIMITER //

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

DELIMITER ;

-- ============================================================
-- PART 8: DEFAULT DATA
-- ============================================================

-- Insert default pricing rule
INSERT INTO pricing_rules (rule_name, delivered_price, extra_price, is_default, effective_from)
VALUES ('Default Pricing', 50.00, 60.00, TRUE, CURDATE())
ON DUPLICATE KEY UPDATE rule_name = rule_name;

-- ============================================================
-- Re-enable foreign key checks
-- ============================================================
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
