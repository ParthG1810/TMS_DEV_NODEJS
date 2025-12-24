-- Migration: 024_gmail_sync_improvements.sql
-- Add fields to track last synced email details for robust sync
-- Created: 2025-12-13

-- Check and add last_sync_email_date column
SET @dbname = DATABASE();
SET @tablename = 'gmail_oauth_settings';
SET @columnname = 'last_sync_email_date';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  'ALTER TABLE gmail_oauth_settings ADD COLUMN last_sync_email_date DATETIME DEFAULT NULL AFTER last_sync_email_id'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Check and add last_sync_email_subject column
SET @columnname = 'last_sync_email_subject';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  'ALTER TABLE gmail_oauth_settings ADD COLUMN last_sync_email_subject VARCHAR(500) DEFAULT NULL AFTER last_sync_email_date'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ROLLBACK:
-- ALTER TABLE gmail_oauth_settings DROP COLUMN last_sync_email_date;
-- ALTER TABLE gmail_oauth_settings DROP COLUMN last_sync_email_subject;
