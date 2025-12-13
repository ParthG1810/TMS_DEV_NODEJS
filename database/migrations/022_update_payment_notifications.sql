-- Migration: 022_update_payment_notifications.sql
-- Description: Update payment_notifications table for auto-delete and payment linking
-- Date: 2025-12-13

-- =====================================================
-- Update payment_notifications Table
-- =====================================================
-- Add columns for auto-delete tracking and payment linking

-- Add new notification types to ENUM
ALTER TABLE payment_notifications
MODIFY COLUMN notification_type ENUM(
    'month_end_calculation',
    'payment_received',
    'payment_overdue',
    'billing_pending_approval',
    'interac_received',
    'payment_allocated',
    'invoice_paid',
    'excess_payment',
    'refund_request',
    'refund_completed',
    'refund_cancelled'
) NOT NULL;

-- Add auto-delete and payment tracking columns
ALTER TABLE payment_notifications
ADD COLUMN auto_delete_on_action TINYINT(1) DEFAULT 0 AFTER dismissed_at,
ADD COLUMN related_payment_id INT DEFAULT NULL AFTER auto_delete_on_action,
ADD COLUMN related_interac_id INT DEFAULT NULL AFTER related_payment_id;

-- Add indexes
ALTER TABLE payment_notifications
ADD INDEX idx_auto_delete (auto_delete_on_action),
ADD INDEX idx_related_payment (related_payment_id),
ADD INDEX idx_related_interac (related_interac_id);

-- =====================================================
-- Update v_unread_notifications view
-- =====================================================
CREATE OR REPLACE VIEW v_unread_notifications AS
SELECT
    pn.id,
    pn.notification_type,
    pn.title,
    pn.message,
    pn.priority,
    pn.action_url,
    pn.billing_month,
    pn.billing_id,
    pn.customer_id,
    c.name AS customer_name,
    pn.related_payment_id,
    pn.related_interac_id,
    pn.auto_delete_on_action,
    pn.created_at
FROM payment_notifications pn
LEFT JOIN customers c ON pn.customer_id = c.id
WHERE pn.is_read = FALSE AND pn.is_dismissed = FALSE
ORDER BY pn.priority DESC, pn.created_at DESC;

-- =====================================================
-- Create view for payment-related notifications
-- =====================================================
CREATE OR REPLACE VIEW v_payment_notifications AS
SELECT
    pn.id,
    pn.notification_type,
    pn.title,
    pn.message,
    pn.priority,
    pn.action_url,
    pn.billing_id,
    pn.customer_id,
    c.name AS customer_name,
    pn.related_payment_id,
    pn.related_interac_id,
    pn.is_read,
    pn.is_dismissed,
    pn.auto_delete_on_action,
    pn.created_at,
    pn.read_at,
    pn.dismissed_at
FROM payment_notifications pn
LEFT JOIN customers c ON pn.customer_id = c.id
WHERE pn.notification_type IN (
    'interac_received',
    'payment_allocated',
    'invoice_paid',
    'excess_payment',
    'refund_request',
    'refund_completed',
    'refund_cancelled'
)
ORDER BY pn.created_at DESC;

-- =====================================================
-- Rollback Script
-- =====================================================
-- DROP VIEW IF EXISTS v_payment_notifications;
-- DROP VIEW IF EXISTS v_unread_notifications;  -- Then recreate original
-- ALTER TABLE payment_notifications DROP INDEX idx_related_interac;
-- ALTER TABLE payment_notifications DROP INDEX idx_related_payment;
-- ALTER TABLE payment_notifications DROP INDEX idx_auto_delete;
-- ALTER TABLE payment_notifications DROP COLUMN related_interac_id;
-- ALTER TABLE payment_notifications DROP COLUMN related_payment_id;
-- ALTER TABLE payment_notifications DROP COLUMN auto_delete_on_action;
-- ALTER TABLE payment_notifications MODIFY COLUMN notification_type ENUM('month_end_calculation', 'payment_received', 'payment_overdue', 'billing_pending_approval') NOT NULL;
