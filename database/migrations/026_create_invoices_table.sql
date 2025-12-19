-- ============================================================
-- Migration: Create invoices table for individual/combined invoices
-- Run: mysql -u your_user -p your_database < 026_create_invoices_table.sql
-- ============================================================

-- Step 1: Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(20) NOT NULL UNIQUE COMMENT 'Format: INV-YYYYMM-XXXX',
    customer_id INT NOT NULL,
    invoice_type ENUM('individual', 'combined') NOT NULL DEFAULT 'individual',

    -- Amounts (calculated from linked order_billings)
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    balance_due DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    -- Status
    payment_status ENUM('unpaid', 'partial_paid', 'paid') NOT NULL DEFAULT 'unpaid',

    -- Metadata
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by VARCHAR(100) NULL,
    due_date DATE NULL,
    notes TEXT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign keys
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,

    -- Indexes
    INDEX idx_customer (customer_id),
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_payment_status (payment_status),
    INDEX idx_generated_at (generated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Update order_billing table - add invoice_id and update status enum
-- First, modify the status enum to include 'invoiced'
ALTER TABLE order_billing
    MODIFY COLUMN status ENUM('calculating', 'finalized', 'invoiced') NOT NULL DEFAULT 'calculating';

-- Add invoice_id column to link order_billing to invoices
SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'order_billing'
    AND COLUMN_NAME = 'invoice_id'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE order_billing ADD COLUMN invoice_id INT NULL AFTER status',
    'SELECT ''Column invoice_id already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint for invoice_id (if not exists)
SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'order_billing'
    AND COLUMN_NAME = 'invoice_id'
    AND REFERENCED_TABLE_NAME = 'invoices'
);

SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE order_billing ADD CONSTRAINT fk_order_billing_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL',
    'SELECT ''Foreign key fk_order_billing_invoice already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for invoice_id
SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'order_billing'
    AND INDEX_NAME = 'idx_invoice_id'
);

SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE order_billing ADD INDEX idx_invoice_id (invoice_id)',
    'SELECT ''Index idx_invoice_id already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Create invoice_payments junction table to track payments to invoices
CREATE TABLE IF NOT EXISTS invoice_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    payment_record_id INT NOT NULL,
    amount_applied DECIMAL(10, 2) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_by VARCHAR(100) NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_record_id) REFERENCES payment_records(id) ON DELETE CASCADE,

    -- Indexes
    INDEX idx_invoice (invoice_id),
    INDEX idx_payment_record (payment_record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 4: Create stored procedure to generate invoice number
DROP PROCEDURE IF EXISTS sp_generate_invoice_number;

DELIMITER $$

CREATE PROCEDURE sp_generate_invoice_number(
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
END$$

DELIMITER ;

-- Step 5: Create view for invoice details
CREATE OR REPLACE VIEW v_invoice_details AS
SELECT
    i.id,
    i.invoice_number,
    i.customer_id,
    c.name as customer_name,
    c.phone as customer_phone,
    c.address as customer_address,
    i.invoice_type,
    i.total_amount,
    i.amount_paid,
    i.balance_due,
    i.payment_status,
    i.generated_at,
    i.generated_by,
    i.due_date,
    i.notes,
    COUNT(ob.id) as order_count,
    GROUP_CONCAT(DISTINCT ob.billing_month ORDER BY ob.billing_month SEPARATOR ', ') as billing_months
FROM invoices i
INNER JOIN customers c ON i.customer_id = c.id
LEFT JOIN order_billing ob ON ob.invoice_id = i.id
GROUP BY i.id;

-- Step 6: Create view for available orders for invoicing
CREATE OR REPLACE VIEW v_available_for_invoice AS
SELECT
    ob.id,
    ob.order_id,
    ob.customer_id,
    c.name as customer_name,
    ob.billing_month,
    ob.total_delivered,
    ob.total_absent,
    ob.total_extra,
    ob.total_plan_days,
    ob.base_amount,
    ob.extra_amount,
    ob.total_amount,
    ob.status,
    ob.finalized_at,
    ob.finalized_by,
    mp.meal_name as meal_plan_name,
    co.price as order_price,
    DATE_FORMAT(co.start_date, '%Y-%m-%d') as start_date,
    DATE_FORMAT(co.end_date, '%Y-%m-%d') as end_date,
    co.selected_days
FROM order_billing ob
INNER JOIN customers c ON ob.customer_id = c.id
INNER JOIN customer_orders co ON ob.order_id = co.id
INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
WHERE ob.status = 'finalized'
AND ob.invoice_id IS NULL
AND (co.parent_order_id IS NULL OR co.parent_order_id = 0)
ORDER BY ob.customer_id, ob.billing_month, mp.meal_name;

-- ============================================================
-- Verification queries
-- ============================================================
-- SELECT 'invoices table' AS item, COUNT(*) AS exists_check FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'invoices';
-- SELECT 'invoice_payments table' AS item, COUNT(*) AS exists_check FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'invoice_payments';
-- SELECT 'invoice_id column in order_billing' AS item, COUNT(*) AS exists_check FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'order_billing' AND column_name = 'invoice_id';
-- ============================================================
