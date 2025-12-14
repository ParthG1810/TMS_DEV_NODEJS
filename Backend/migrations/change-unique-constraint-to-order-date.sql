-- Migration: Change unique constraint from customer_id+delivery_date to order_id+delivery_date
-- This allows separate calendar entries for each order on the same date
-- Example: Rajesh Kumar can have entries for all 3 orders on the same Monday

-- Step 1: Drop the existing unique constraint on customer_id + delivery_date
ALTER TABLE tiffin_calendar_entries
DROP INDEX unique_customer_date;

-- Step 2: Add new unique constraint on order_id + delivery_date
-- This ensures one entry per order per date (not per customer per date)
ALTER TABLE tiffin_calendar_entries
ADD CONSTRAINT unique_order_date UNIQUE (order_id, delivery_date);

-- Note: Run this migration on your database before deploying the new code
-- Command: mysql -u your_user -p your_database < change-unique-constraint-to-order-date.sql
