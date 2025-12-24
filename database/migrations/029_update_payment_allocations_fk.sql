-- Migration: 029_update_payment_allocations_fk.sql
-- Description: Update payment_allocations foreign key to reference invoices instead of monthly_billing
-- Date: 2025-12-24

-- =====================================================
-- Update Foreign Key Constraint
-- =====================================================
-- The payment system now uses the invoices table instead of monthly_billing
-- We need to drop the old FK and add a new one referencing invoices

-- Drop the existing foreign key constraint on billing_id
ALTER TABLE payment_allocations
DROP FOREIGN KEY payment_allocations_ibfk_2;

-- Add new foreign key referencing invoices table
-- Note: billing_id column now stores invoice IDs
ALTER TABLE payment_allocations
ADD CONSTRAINT payment_allocations_invoice_fk
FOREIGN KEY (billing_id) REFERENCES invoices(id) ON DELETE CASCADE;

-- =====================================================
-- Rollback Script
-- =====================================================
-- ALTER TABLE payment_allocations DROP FOREIGN KEY payment_allocations_invoice_fk;
-- ALTER TABLE payment_allocations ADD CONSTRAINT payment_allocations_ibfk_2 FOREIGN KEY (billing_id) REFERENCES monthly_billing(id) ON DELETE CASCADE;
