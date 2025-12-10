-- =====================================================
-- Migration: Allow Single-Day Orders
-- Description: Update customer_orders constraint to allow
--              same-day orders (start_date = end_date)
--              This is needed for extra tiffin orders
-- =====================================================

-- Drop the old constraint that requires end_date > start_date
ALTER TABLE customer_orders DROP CHECK customer_orders_chk_1;

-- Add new constraint that allows end_date >= start_date
ALTER TABLE customer_orders ADD CONSTRAINT customer_orders_chk_1
CHECK (end_date >= start_date);

-- Verify the change
SELECT CONSTRAINT_NAME, CHECK_CLAUSE
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS
WHERE TABLE_NAME = 'customer_orders'
AND TABLE_SCHEMA = DATABASE();
