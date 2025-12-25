-- ============================================================
-- Migration: 034_add_user_status_column.sql
-- Description: Add status column to users table for account activation
-- ============================================================

-- Add status column if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS status ENUM('active', 'inactive', 'suspended') DEFAULT 'active' AFTER role;

-- Update all existing users to active status
UPDATE users SET status = 'active' WHERE status IS NULL;

-- Add index for status lookups
CREATE INDEX IF NOT EXISTS idx_status ON users(status);

SELECT 'Migration 034_add_user_status_column completed successfully' AS status;
