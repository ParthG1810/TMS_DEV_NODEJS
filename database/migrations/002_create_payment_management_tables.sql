-- Migration: 002_create_payment_management_tables.sql
-- Description: Add payment management functionality including calendar entries, billing, and payment tracking
-- Date: 2023-12-07

-- =====================================================
-- 1. Add payment fields to customer_orders table
-- =====================================================

ALTER TABLE customer_orders
ADD COLUMN payment_id INT NULL AFTER price,
ADD COLUMN payment_status ENUM('pending', 'received', 'calculating') DEFAULT 'calculating' AFTER payment_id,
ADD INDEX idx_payment_status (payment_status);

-- =====================================================
-- 2. Create tiffin_calendar_entries table
-- =====================================================
-- This table tracks daily tiffin delivery status for each customer

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

    -- Foreign keys
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES customer_orders(id) ON DELETE CASCADE,

    -- Indexes for performance
    INDEX idx_customer_date (customer_id, delivery_date),
    INDEX idx_order_id (order_id),
    INDEX idx_delivery_date (delivery_date),
    INDEX idx_status (status),

    -- Ensure one entry per customer per date
    UNIQUE KEY unique_customer_date (customer_id, delivery_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. Create monthly_billing table
-- =====================================================
-- This table stores calculated monthly bills for each customer

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
    status ENUM('calculating', 'pending', 'finalized', 'paid') DEFAULT 'calculating',
    calculated_at TIMESTAMP NULL,
    finalized_at TIMESTAMP NULL,
    finalized_by VARCHAR(100) NULL,
    paid_at TIMESTAMP NULL,
    payment_method VARCHAR(50) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign keys
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,

    -- Indexes
    INDEX idx_customer_month (customer_id, billing_month),
    INDEX idx_billing_month (billing_month),
    INDEX idx_status (status),
    INDEX idx_calculated_at (calculated_at),

    -- Ensure one billing record per customer per month
    UNIQUE KEY unique_customer_month (customer_id, billing_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. Create payment_notifications table
-- =====================================================
-- This table tracks notifications sent to admin for payment verification

CREATE TABLE IF NOT EXISTS payment_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    notification_type ENUM('month_end_calculation', 'payment_received', 'payment_overdue', 'billing_pending_approval') NOT NULL,
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

    -- Foreign keys
    FOREIGN KEY (billing_id) REFERENCES monthly_billing(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,

    -- Indexes
    INDEX idx_is_read (is_read),
    INDEX idx_billing_id (billing_id),
    INDEX idx_created_at (created_at),
    INDEX idx_notification_type (notification_type),
    INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. Create payment_history table
-- =====================================================
-- This table tracks all payment transactions

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

    -- Foreign keys
    FOREIGN KEY (billing_id) REFERENCES monthly_billing(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,

    -- Indexes
    INDEX idx_billing_id (billing_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_transaction_id (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. Create pricing_rules table (Optional)
-- =====================================================
-- This table stores pricing rules for different tiffin types

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

    -- Foreign keys
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,

    -- Indexes
    INDEX idx_meal_plan_id (meal_plan_id),
    INDEX idx_effective_dates (effective_from, effective_to),
    INDEX idx_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 7. Insert default pricing rule
-- =====================================================
-- This creates a default pricing rule that can be used initially

INSERT INTO pricing_rules (rule_name, delivered_price, extra_price, is_default, effective_from)
VALUES ('Default Pricing', 50.00, 60.00, TRUE, CURDATE());

-- =====================================================
-- 8. Create views for easier querying
-- =====================================================

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
    c.name AS customer_name,
    pn.created_at
FROM payment_notifications pn
LEFT JOIN customers c ON pn.customer_id = c.id
WHERE pn.is_read = FALSE AND pn.is_dismissed = FALSE
ORDER BY pn.priority DESC, pn.created_at DESC;

-- =====================================================
-- 9. Create stored procedure for auto-calculation
-- =====================================================

DELIMITER $$

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
        SUM(CASE WHEN status = 'T' THEN 1 ELSE 0 END),
        SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END),
        SUM(CASE WHEN status = 'E' THEN 1 ELSE 0 END),
        COUNT(*)
    INTO v_total_delivered, v_total_absent, v_total_extra, v_total_days
    FROM tiffin_calendar_entries
    WHERE customer_id = p_customer_id
    AND DATE_FORMAT(delivery_date, '%Y-%m') = p_billing_month;

    -- Calculate amounts using ACTUAL prices from calendar entries
    SELECT
        COALESCE(SUM(CASE WHEN status = 'T' THEN price ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'E' THEN price ELSE 0 END), 0)
    INTO v_base_amount, v_extra_amount
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

END$$

DELIMITER ;

-- =====================================================
-- 10. Create trigger for auto-calculation on calendar entry changes
-- =====================================================

DELIMITER $$

CREATE TRIGGER tr_calendar_entry_after_insert
AFTER INSERT ON tiffin_calendar_entries
FOR EACH ROW
BEGIN
    CALL sp_calculate_monthly_billing(
        NEW.customer_id,
        DATE_FORMAT(NEW.delivery_date, '%Y-%m')
    );
END$$

CREATE TRIGGER tr_calendar_entry_after_update
AFTER UPDATE ON tiffin_calendar_entries
FOR EACH ROW
BEGIN
    CALL sp_calculate_monthly_billing(
        NEW.customer_id,
        DATE_FORMAT(NEW.delivery_date, '%Y-%m')
    );
END$$

CREATE TRIGGER tr_calendar_entry_after_delete
AFTER DELETE ON tiffin_calendar_entries
FOR EACH ROW
BEGIN
    CALL sp_calculate_monthly_billing(
        OLD.customer_id,
        DATE_FORMAT(OLD.delivery_date, '%Y-%m')
    );
END$$

DELIMITER ;

-- =====================================================
-- End of Migration
-- =====================================================

-- To rollback this migration, run:
-- DROP TRIGGER IF EXISTS tr_calendar_entry_after_delete;
-- DROP TRIGGER IF EXISTS tr_calendar_entry_after_update;
-- DROP TRIGGER IF EXISTS tr_calendar_entry_after_insert;
-- DROP PROCEDURE IF EXISTS sp_calculate_monthly_billing;
-- DROP VIEW IF EXISTS v_unread_notifications;
-- DROP VIEW IF EXISTS v_calendar_entries_detail;
-- DROP VIEW IF EXISTS v_monthly_billing_summary;
-- DROP TABLE IF EXISTS payment_history;
-- DROP TABLE IF EXISTS payment_notifications;
-- DROP TABLE IF EXISTS pricing_rules;
-- DROP TABLE IF EXISTS monthly_billing;
-- DROP TABLE IF EXISTS tiffin_calendar_entries;
-- ALTER TABLE customer_orders DROP COLUMN payment_status;
-- ALTER TABLE customer_orders DROP COLUMN payment_id;
