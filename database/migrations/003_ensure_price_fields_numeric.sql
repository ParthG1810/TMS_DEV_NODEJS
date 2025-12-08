-- Migration: Ensure all price fields are DECIMAL(10,2)
-- This ensures proper numeric storage for all currency values
-- Date: 2025-12-08

USE tms_db;

-- Modify meal_plans price field
ALTER TABLE meal_plans
  MODIFY COLUMN price DECIMAL(10, 2) NOT NULL;

-- Modify customer_orders price field
ALTER TABLE customer_orders
  MODIFY COLUMN price DECIMAL(10, 2) NOT NULL;

-- Modify tiffin_calendar_entries price field
ALTER TABLE tiffin_calendar_entries
  MODIFY COLUMN price DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- Modify monthly_billing amount fields
ALTER TABLE monthly_billing
  MODIFY COLUMN base_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  MODIFY COLUMN extra_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  MODIFY COLUMN total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- Modify payment_history amount field
ALTER TABLE payment_history
  MODIFY COLUMN amount DECIMAL(10, 2) NOT NULL;

-- Modify pricing_rules price fields
ALTER TABLE pricing_rules
  MODIFY COLUMN delivered_price DECIMAL(10, 2) NOT NULL,
  MODIFY COLUMN extra_price DECIMAL(10, 2) NOT NULL;

-- Modify monthly_tiffin_data price field
ALTER TABLE monthly_tiffin_data
  MODIFY COLUMN price DECIMAL(10, 2) NOT NULL;

-- Verify the changes
SELECT
  TABLE_NAME,
  COLUMN_NAME,
  COLUMN_TYPE,
  DATA_TYPE,
  NUMERIC_PRECISION,
  NUMERIC_SCALE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'tms_db'
  AND (COLUMN_NAME LIKE '%price%' OR COLUMN_NAME LIKE '%amount%')
ORDER BY TABLE_NAME, COLUMN_NAME;
