-- Migration: 031_add_payment_record_to_credit_usage.sql
-- Description: Add payment_record_id to customer_credit_usage to track which payment allocation used the credit
-- Date: 2025-12-24

-- Add payment_record_id column to track which payment the credit was applied with
ALTER TABLE customer_credit_usage
ADD COLUMN payment_record_id INT DEFAULT NULL AFTER credit_id,
ADD INDEX idx_payment_record (payment_record_id),
ADD CONSTRAINT fk_credit_usage_payment_record
    FOREIGN KEY (payment_record_id) REFERENCES payment_records(id) ON DELETE SET NULL;

-- =====================================================
-- Rollback Script
-- =====================================================
-- ALTER TABLE customer_credit_usage DROP FOREIGN KEY fk_credit_usage_payment_record;
-- ALTER TABLE customer_credit_usage DROP INDEX idx_payment_record;
-- ALTER TABLE customer_credit_usage DROP COLUMN payment_record_id;
