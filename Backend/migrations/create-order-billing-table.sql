-- Migration: Create order_billing table for per-order billing
-- This allows each order/meal plan to have its own billing record
-- The monthly_billing table becomes the "combined invoice" that aggregates all order billings

-- Create order_billing table
CREATE TABLE IF NOT EXISTS order_billing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    customer_id INT NOT NULL,
    billing_month VARCHAR(7) NOT NULL COMMENT 'Format: YYYY-MM',

    -- Counts
    total_delivered INT NOT NULL DEFAULT 0,
    total_absent INT NOT NULL DEFAULT 0,
    total_extra INT NOT NULL DEFAULT 0,
    total_plan_days INT NOT NULL DEFAULT 0 COMMENT 'Total plan days in the month for this order',

    -- Amounts
    base_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Calculated from deliveries',
    extra_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Sum of extra tiffin prices',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'base_amount + extra_amount',

    -- Status
    status ENUM('calculating', 'finalized') NOT NULL DEFAULT 'calculating',
    finalized_at TIMESTAMP NULL,
    finalized_by VARCHAR(100) NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign keys
    FOREIGN KEY (order_id) REFERENCES customer_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,

    -- Indexes
    INDEX idx_customer_month (customer_id, billing_month),
    INDEX idx_order_month (order_id, billing_month),
    INDEX idx_status (status),

    -- Unique constraint: one billing record per order per month
    UNIQUE KEY unique_order_month (order_id, billing_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add breakdown_json column to monthly_billing for storing per-order details
ALTER TABLE monthly_billing
ADD COLUMN IF NOT EXISTS breakdown_json JSON NULL COMMENT 'JSON array of per-order billing details'
AFTER total_amount;

-- Drop existing triggers (we'll recreate them to work with order_billing)
DROP TRIGGER IF EXISTS tr_calendar_entry_after_insert;
DROP TRIGGER IF EXISTS tr_calendar_entry_after_update;
DROP TRIGGER IF EXISTS tr_calendar_entry_after_delete;

DELIMITER $$

-- Stored procedure to calculate billing for a single order
CREATE PROCEDURE IF NOT EXISTS sp_calculate_order_billing(
    IN p_order_id INT,
    IN p_billing_month VARCHAR(7)
)
BEGIN
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

    -- If order not found, exit
    IF v_customer_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Order not found';
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

END$$

-- Trigger: Auto-calculate order billing after entry insert
CREATE TRIGGER tr_calendar_entry_after_insert
AFTER INSERT ON tiffin_calendar_entries
FOR EACH ROW
BEGIN
    CALL sp_calculate_order_billing(NEW.order_id, DATE_FORMAT(NEW.delivery_date, '%Y-%m'));
END$$

-- Trigger: Auto-calculate order billing after entry update
CREATE TRIGGER tr_calendar_entry_after_update
AFTER UPDATE ON tiffin_calendar_entries
FOR EACH ROW
BEGIN
    CALL sp_calculate_order_billing(NEW.order_id, DATE_FORMAT(NEW.delivery_date, '%Y-%m'));
    -- If order_id changed, also recalculate old order
    IF OLD.order_id != NEW.order_id THEN
        CALL sp_calculate_order_billing(OLD.order_id, DATE_FORMAT(OLD.delivery_date, '%Y-%m'));
    END IF;
END$$

-- Trigger: Auto-calculate order billing after entry delete
CREATE TRIGGER tr_calendar_entry_after_delete
AFTER DELETE ON tiffin_calendar_entries
FOR EACH ROW
BEGIN
    CALL sp_calculate_order_billing(OLD.order_id, DATE_FORMAT(OLD.delivery_date, '%Y-%m'));
END$$

DELIMITER ;

-- Note: Run this migration on your database:
-- mysql -u your_user -p your_database < create-order-billing-table.sql
