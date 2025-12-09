-- =====================================================
-- Migration 007: Add billing_pending_approval to notification_type ENUM
-- =====================================================
-- Purpose: Add new notification type for when billing is finalized
--          and pending approval
-- Created: 2025-12-09
-- =====================================================

-- Add 'billing_pending_approval' to the notification_type ENUM
ALTER TABLE payment_notifications
MODIFY COLUMN notification_type ENUM(
    'month_end_calculation',
    'payment_received',
    'payment_overdue',
    'billing_pending_approval'
) NOT NULL;
