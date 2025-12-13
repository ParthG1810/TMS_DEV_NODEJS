-- Migration: 024_gmail_sync_improvements.sql
-- Add fields to track last synced email details for robust sync
-- Created: 2025-12-13

-- Add last_sync_email_date to store the date of the last synced email
ALTER TABLE gmail_oauth_settings
ADD COLUMN IF NOT EXISTS last_sync_email_date DATETIME DEFAULT NULL AFTER last_sync_email_id;

-- Add last_sync_email_subject to store the subject of the last synced email (for debugging)
ALTER TABLE gmail_oauth_settings
ADD COLUMN IF NOT EXISTS last_sync_email_subject VARCHAR(500) DEFAULT NULL AFTER last_sync_email_date;

-- ROLLBACK:
-- ALTER TABLE gmail_oauth_settings DROP COLUMN last_sync_email_date;
-- ALTER TABLE gmail_oauth_settings DROP COLUMN last_sync_email_subject;
