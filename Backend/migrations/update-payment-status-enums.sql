-- Migration: Update payment status enums for consistency
-- Date: 2025-12-12
-- Description: Ensures monthly_billing.status and customer_orders.payment_status
--              use the correct enum values for the application workflow

-- Update monthly_billing table status column
-- Valid values: 'calculating', 'pending', 'finalized', 'paid'
ALTER TABLE monthly_billing
MODIFY COLUMN status ENUM('calculating', 'pending', 'finalized', 'paid')
NOT NULL DEFAULT 'calculating';

-- Update customer_orders table payment_status column
-- Valid values: 'calculating', 'pending', 'finalized', 'paid'
ALTER TABLE customer_orders
MODIFY COLUMN payment_status ENUM('calculating', 'pending', 'finalized', 'paid')
NOT NULL DEFAULT 'pending';

-- Add index on status columns for better query performance
CREATE INDEX IF NOT EXISTS idx_monthly_billing_status ON monthly_billing(status);
CREATE INDEX IF NOT EXISTS idx_customer_orders_payment_status ON customer_orders(payment_status);

-- Verify the changes
SELECT
    TABLE_NAME,
    COLUMN_NAME,
    COLUMN_TYPE,
    COLUMN_DEFAULT
FROM
    INFORMATION_SCHEMA.COLUMNS
WHERE
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN ('monthly_billing', 'customer_orders')
    AND COLUMN_NAME IN ('status', 'payment_status');
