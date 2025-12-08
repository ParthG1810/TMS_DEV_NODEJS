-- =====================================================
-- COMPLETE TMS DATABASE SCHEMA
-- Database Name: tms_db
-- Description: Tiffin Management System - Complete Schema
-- Includes: Original tables + Payment Management System
-- Date: 2023-12-07
-- =====================================================

-- Drop database if exists and create fresh
DROP DATABASE IF EXISTS tms_db;
CREATE DATABASE tms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tms_db;

-- =====================================================
-- CORE INGREDIENT & RECIPE MANAGEMENT TABLES
-- =====================================================

-- Ingredients Table
CREATE TABLE IF NOT EXISTS ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vendors Table (for ingredient suppliers)
CREATE TABLE IF NOT EXISTS vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_id INT NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    weight DECIMAL(10, 2) NOT NULL,
    package_size ENUM('tsp', 'tbsp', 'c', 'pt', 'qt', 'gal', 'fl_oz', 'oz', 'lb', 'g', 'kg', 'ml', 'l', 'pcs') NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    INDEX idx_ingredient_id (ingredient_id),
    INDEX idx_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recipes Table
CREATE TABLE IF NOT EXISTS recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recipe Ingredients (Junction Table)
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    INDEX idx_recipe_id (recipe_id),
    INDEX idx_ingredient_id (ingredient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recipe Images Table
CREATE TABLE IF NOT EXISTS recipe_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    INDEX idx_recipe_id (recipe_id),
    INDEX idx_is_primary (is_primary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TIFFIN MANAGEMENT TABLES
-- =====================================================

-- Meal Plans Table
CREATE TABLE IF NOT EXISTS meal_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meal_name VARCHAR(255) NOT NULL,
    description TEXT,
    frequency ENUM('Daily', 'Weekly', 'Monthly') NOT NULL,
    days ENUM('Mon-Fri', 'Mon-Sat', 'Single') DEFAULT 'Mon-Fri',
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_frequency (frequency),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
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

-- Customer Orders Table
CREATE TABLE IF NOT EXISTS customer_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    meal_plan_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    selected_days JSON NOT NULL COMMENT 'Array of day names: ["Monday", "Tuesday", ...]',
    price DECIMAL(10, 2) NOT NULL,
    payment_id INT NULL,
    payment_status ENUM('pending', 'received', 'calculating') DEFAULT 'calculating',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,
    INDEX idx_customer_id (customer_id),
    INDEX idx_meal_plan_id (meal_plan_id),
    INDEX idx_start_date (start_date),
    INDEX idx_end_date (end_date),
    INDEX idx_payment_status (payment_status),

    -- Prevent duplicate orders
    UNIQUE KEY unique_order (customer_id, meal_plan_id, start_date, end_date),

    -- Ensure valid date range
    CHECK (end_date > start_date),
    CHECK (quantity >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PAYMENT MANAGEMENT TABLES
-- =====================================================

-- Tiffin Calendar Entries Table
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

-- Monthly Billing Table
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

-- Payment Notifications Table
CREATE TABLE IF NOT EXISTS payment_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    notification_type ENUM('month_end_calculation', 'payment_received', 'payment_overdue') NOT NULL,
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

-- Payment History Table
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

-- Pricing Rules Table
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
-- ADDITIONAL MANAGEMENT TABLES (Optional)
-- =====================================================

-- Products Table (for e-commerce if needed)
CREATE TABLE IF NOT EXISTS products (
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

-- =====================================================
-- DATABASE VIEWS
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

-- =====================================================
-- STORED PROCEDURES
-- =====================================================

DELIMITER $$

-- Stored Procedure: Calculate Monthly Billing
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
    DECLARE v_delivered_price DECIMAL(10,2) DEFAULT 50.00;
    DECLARE v_extra_price DECIMAL(10,2) DEFAULT 60.00;

    -- Get default pricing
    SELECT delivered_price, extra_price INTO v_delivered_price, v_extra_price
    FROM pricing_rules
    WHERE is_default = TRUE
    LIMIT 1;

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

    -- Calculate amounts
    SET v_base_amount = v_total_delivered * v_delivered_price;
    SET v_extra_amount = v_total_extra * v_extra_price;
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
-- TRIGGERS
-- =====================================================

DELIMITER $$

-- Trigger: Auto-calculate billing after insert
CREATE TRIGGER tr_calendar_entry_after_insert
AFTER INSERT ON tiffin_calendar_entries
FOR EACH ROW
BEGIN
    CALL sp_calculate_monthly_billing(
        NEW.customer_id,
        DATE_FORMAT(NEW.delivery_date, '%Y-%m')
    );
END$$

-- Trigger: Auto-calculate billing after update
CREATE TRIGGER tr_calendar_entry_after_update
AFTER UPDATE ON tiffin_calendar_entries
FOR EACH ROW
BEGIN
    CALL sp_calculate_monthly_billing(
        NEW.customer_id,
        DATE_FORMAT(NEW.delivery_date, '%Y-%m')
    );
END$$

-- Trigger: Auto-calculate billing after delete
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
-- DEFAULT DATA / SEED DATA
-- =====================================================

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

-- =====================================================
-- DATABASE SUMMARY
-- =====================================================

-- Total Tables Created: 16
-- Total Views Created: 4
-- Total Stored Procedures: 1
-- Total Triggers: 3

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- To verify installation, run these queries:
/*
-- Check all tables
SHOW TABLES;

-- Check triggers
SHOW TRIGGERS;

-- Check stored procedures
SHOW PROCEDURE STATUS WHERE Db = 'tms_db';

-- Check views
SELECT TABLE_NAME FROM information_schema.VIEWS WHERE TABLE_SCHEMA = 'tms_db';

-- Check default pricing
SELECT * FROM pricing_rules WHERE is_default = TRUE;

-- Check sample data
SELECT COUNT(*) as meal_plans FROM meal_plans;
SELECT COUNT(*) as customers FROM customers;
SELECT COUNT(*) as ingredients FROM ingredients;
*/

-- =====================================================
-- END OF SCHEMA
-- =====================================================
