-- Migration: 030_update_credit_usage_fk.sql
-- Description: Update customer_credit_usage foreign key to reference invoices instead of monthly_billing
-- Date: 2025-12-24

-- =====================================================
-- Update Foreign Key Constraint
-- =====================================================
-- The billing_id in customer_credit_usage now stores invoice IDs

-- Drop the existing foreign key constraint on billing_id
ALTER TABLE customer_credit_usage
DROP FOREIGN KEY customer_credit_usage_ibfk_2;

-- Add new foreign key referencing invoices table
ALTER TABLE customer_credit_usage
ADD CONSTRAINT customer_credit_usage_invoice_fk
FOREIGN KEY (billing_id) REFERENCES invoices(id) ON DELETE CASCADE;

-- =====================================================
-- Rollback Script
-- =====================================================
-- ALTER TABLE customer_credit_usage DROP FOREIGN KEY customer_credit_usage_invoice_fk;
-- ALTER TABLE customer_credit_usage ADD CONSTRAINT customer_credit_usage_ibfk_2 FOREIGN KEY (billing_id) REFERENCES monthly_billing(id) ON DELETE CASCADE;
