-- Migration: 021_update_monthly_billing.sql
-- Description: Add payment tracking columns to monthly_billing table
-- Date: 2025-12-13

-- =====================================================
-- Update monthly_billing Table
-- =====================================================
-- Add columns for payment tracking and balance calculation

ALTER TABLE monthly_billing
ADD COLUMN amount_paid DECIMAL(10,2) DEFAULT 0.00 AFTER total_amount,
ADD COLUMN credit_applied DECIMAL(10,2) DEFAULT 0.00 AFTER amount_paid,
ADD COLUMN last_payment_date DATE DEFAULT NULL AFTER credit_applied,
ADD COLUMN payment_count INT DEFAULT 0 AFTER last_payment_date;

-- Add indexes for payment queries
ALTER TABLE monthly_billing
ADD INDEX idx_amount_paid (amount_paid),
ADD INDEX idx_last_payment_date (last_payment_date);

-- =====================================================
-- Create view for billing with balance
-- =====================================================
CREATE OR REPLACE VIEW v_monthly_billing_with_balance AS
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
    mb.amount_paid,
    mb.credit_applied,
    (mb.total_amount - COALESCE(mb.amount_paid, 0) - COALESCE(mb.credit_applied, 0)) AS balance_due,
    mb.status,
    mb.last_payment_date,
    mb.payment_count,
    mb.calculated_at,
    mb.finalized_at,
    mb.paid_at,
    mb.payment_method
FROM monthly_billing mb
INNER JOIN customers c ON mb.customer_id = c.id
ORDER BY mb.billing_month DESC, c.name ASC;

-- =====================================================
-- Create view for pending payments (for allocation UI)
-- =====================================================
CREATE OR REPLACE VIEW v_pending_payment_invoices AS
SELECT
    mb.id,
    mb.customer_id,
    c.name AS customer_name,
    c.phone AS customer_phone,
    mb.billing_month,
    mb.total_amount,
    mb.amount_paid,
    mb.credit_applied,
    (mb.total_amount - COALESCE(mb.amount_paid, 0) - COALESCE(mb.credit_applied, 0)) AS balance_due,
    mb.status,
    mb.last_payment_date
FROM monthly_billing mb
INNER JOIN customers c ON mb.customer_id = c.id
WHERE mb.status IN ('finalized', 'partial_paid')
AND (mb.total_amount - COALESCE(mb.amount_paid, 0) - COALESCE(mb.credit_applied, 0)) > 0
ORDER BY
    CASE mb.status
        WHEN 'partial_paid' THEN 1  -- Prioritize partial_paid
        ELSE 2
    END,
    mb.billing_month ASC;           -- Then oldest first

-- =====================================================
-- Rollback Script
-- =====================================================
-- DROP VIEW IF EXISTS v_pending_payment_invoices;
-- DROP VIEW IF EXISTS v_monthly_billing_with_balance;
-- ALTER TABLE monthly_billing DROP INDEX idx_last_payment_date;
-- ALTER TABLE monthly_billing DROP INDEX idx_amount_paid;
-- ALTER TABLE monthly_billing DROP COLUMN payment_count;
-- ALTER TABLE monthly_billing DROP COLUMN last_payment_date;
-- ALTER TABLE monthly_billing DROP COLUMN credit_applied;
-- ALTER TABLE monthly_billing DROP COLUMN amount_paid;
