-- Migration: 025_add_payment_tracking_to_monthly_billing.sql
-- Add payment tracking columns to monthly_billing table
-- Created: 2025-12-13

-- Add amount_paid column
ALTER TABLE monthly_billing
ADD COLUMN amount_paid DECIMAL(10,2) DEFAULT 0.00 AFTER total_amount;

-- Add credit_applied column
ALTER TABLE monthly_billing
ADD COLUMN credit_applied DECIMAL(10,2) DEFAULT 0.00 AFTER amount_paid;

-- Add last_payment_date column
ALTER TABLE monthly_billing
ADD COLUMN last_payment_date DATE DEFAULT NULL AFTER credit_applied;

-- Add payment_count column
ALTER TABLE monthly_billing
ADD COLUMN payment_count INT DEFAULT 0 AFTER last_payment_date;

-- Add indexes for better query performance
ALTER TABLE monthly_billing
ADD INDEX idx_amount_paid (amount_paid),
ADD INDEX idx_last_payment_date (last_payment_date);

-- ROLLBACK:
-- ALTER TABLE monthly_billing DROP INDEX idx_last_payment_date;
-- ALTER TABLE monthly_billing DROP INDEX idx_amount_paid;
-- ALTER TABLE monthly_billing DROP COLUMN payment_count;
-- ALTER TABLE monthly_billing DROP COLUMN last_payment_date;
-- ALTER TABLE monthly_billing DROP COLUMN credit_applied;
-- ALTER TABLE monthly_billing DROP COLUMN amount_paid;
