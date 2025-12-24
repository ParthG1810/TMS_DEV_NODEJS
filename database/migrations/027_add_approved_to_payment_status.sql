-- Migration: 027_add_approved_to_payment_status.sql
-- Add 'approved' status to customer_orders payment_status enum
-- This aligns customer_orders.payment_status with order_billing.status

-- Update customer_orders payment_status enum to include 'approved'
ALTER TABLE customer_orders
    MODIFY COLUMN payment_status ENUM('calculating', 'pending', 'approved', 'finalized', 'paid', 'partial_paid') DEFAULT 'calculating';

-- Add order_billing_id column to payment_notifications for order-level notifications
-- billing_id references monthly_billing, order_billing_id references order_billing
ALTER TABLE payment_notifications
    ADD COLUMN order_billing_id INT NULL AFTER billing_id,
    ADD INDEX idx_order_billing_id (order_billing_id),
    ADD CONSTRAINT fk_payment_notifications_order_billing
        FOREIGN KEY (order_billing_id) REFERENCES order_billing(id) ON DELETE CASCADE;

-- Update payment_notifications notification_type to include order approval type
ALTER TABLE payment_notifications
    MODIFY COLUMN notification_type ENUM(
        'month_end_calculation',
        'payment_received',
        'payment_overdue',
        'billing_pending_approval',
        'order_approved'
    ) NOT NULL;
