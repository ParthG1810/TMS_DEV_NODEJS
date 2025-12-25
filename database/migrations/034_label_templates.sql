-- ============================================================
-- Migration: Create label templates and customer print order tables
-- Feature: Thermal Label Printing System for Zebra GX430d
-- Run: mysql -u your_user -p your_database < 034_label_templates.sql
-- ============================================================

-- ============================================================
-- Step 1: Create label_templates table
-- Stores label format templates with HTML content and placeholders
-- ============================================================
CREATE TABLE IF NOT EXISTS label_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT 'Template name (e.g., Standard 4x2)',
    description VARCHAR(500) NULL COMMENT 'Optional description',

    -- Label dimensions in inches
    width_inches DECIMAL(4,2) NOT NULL COMMENT 'Label width in inches (max 4.09 for GX430d)',
    height_inches DECIMAL(4,2) NOT NULL COMMENT 'Label height in inches',

    -- Template content
    template_html TEXT NOT NULL COMMENT 'HTML content with {{placeholders}}',
    custom_placeholders JSON NULL COMMENT 'User-defined custom placeholders array',

    -- Zebra printer settings
    print_settings JSON NULL COMMENT 'Printer settings: dpi, darkness, speed, etc.',

    -- Default flag
    is_default BOOLEAN DEFAULT FALSE COMMENT 'Only one template should be default',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_name (name),
    INDEX idx_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Step 2: Create customer_print_order table
-- Stores custom ordering of customers for label printing
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_print_order (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL COMMENT 'Reference to customers table',
    print_order INT NOT NULL DEFAULT 0 COMMENT 'Order position for printing (0, 1, 2, ...)',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign key
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,

    -- Constraints
    UNIQUE KEY unique_customer (customer_id),

    -- Indexes
    INDEX idx_print_order (print_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Step 3: Insert default template (Standard 4x2 for Tiffin Labels)
-- ============================================================
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
  <div style="font-size: 10pt; color: #666;">📞 {{customerPhone}}</div>
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
-- Step 4: Create trigger to ensure only one default template
-- ============================================================
DROP TRIGGER IF EXISTS before_label_template_insert;
DROP TRIGGER IF EXISTS before_label_template_update;

DELIMITER $$

-- Trigger for INSERT
CREATE TRIGGER before_label_template_insert
BEFORE INSERT ON label_templates
FOR EACH ROW
BEGIN
    -- If setting this template as default, unset others
    IF NEW.is_default = TRUE THEN
        UPDATE label_templates SET is_default = FALSE WHERE is_default = TRUE;
    END IF;
END$$

-- Trigger for UPDATE
CREATE TRIGGER before_label_template_update
BEFORE UPDATE ON label_templates
FOR EACH ROW
BEGIN
    -- If setting this template as default, unset others
    IF NEW.is_default = TRUE AND OLD.is_default = FALSE THEN
        UPDATE label_templates SET is_default = FALSE WHERE id != NEW.id AND is_default = TRUE;
    END IF;
END$$

DELIMITER ;

-- ============================================================
-- Step 5: Create view for customers with print order
-- Returns all customers ordered by their print_order (or alphabetically if not set)
-- ============================================================
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

-- ============================================================
-- Step 6: Create stored procedure to initialize print order for all customers
-- ============================================================
DROP PROCEDURE IF EXISTS sp_initialize_customer_print_order;

DELIMITER $$

CREATE PROCEDURE sp_initialize_customer_print_order()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_customer_id INT;
    DECLARE v_order INT DEFAULT 0;

    DECLARE customer_cursor CURSOR FOR
        SELECT id FROM customers ORDER BY name;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Clear existing print orders
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
END$$

DELIMITER ;

-- ============================================================
-- Step 7: Create stored procedure to reset print order to alphabetical
-- ============================================================
DROP PROCEDURE IF EXISTS sp_reset_customer_print_order;

DELIMITER $$

CREATE PROCEDURE sp_reset_customer_print_order()
BEGIN
    -- Delete all existing print orders
    DELETE FROM customer_print_order;

    -- Re-insert in alphabetical order
    INSERT INTO customer_print_order (customer_id, print_order)
    SELECT id, (@row_number := @row_number + 1) - 1 as print_order
    FROM customers, (SELECT @row_number := 0) AS t
    ORDER BY name;

    SELECT 'Print order reset to alphabetical' AS result;
END$$

DELIMITER ;

-- ============================================================
-- Verification queries (uncomment to run)
-- ============================================================
-- SELECT 'label_templates table' AS item, COUNT(*) AS count FROM label_templates;
-- SELECT 'customer_print_order table' AS item, COUNT(*) AS count FROM customer_print_order;
-- SELECT 'Default template' AS item, name, width_inches, height_inches FROM label_templates WHERE is_default = TRUE;

-- ============================================================
-- Usage Examples:
-- ============================================================
-- Initialize print order for existing customers:
-- CALL sp_initialize_customer_print_order();
--
-- Reset print order to alphabetical:
-- CALL sp_reset_customer_print_order();
--
-- Get customers in print order:
-- SELECT * FROM v_customers_print_order;
-- ============================================================
