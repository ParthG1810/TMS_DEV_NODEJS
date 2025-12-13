-- Migration: 013_gmail_oauth_settings.sql
-- Description: Add Gmail OAuth settings for Interac email scanning
-- Date: 2025-12-13

-- =====================================================
-- Gmail OAuth Settings Table
-- =====================================================
-- Store Gmail OAuth credentials (single account, expandable to 3)

CREATE TABLE IF NOT EXISTS gmail_oauth_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_name VARCHAR(100) NOT NULL DEFAULT 'primary',  -- 'primary', 'secondary', 'tertiary'
    email_address VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at DATETIME,
    last_sync_email_id VARCHAR(255) DEFAULT NULL,          -- Track last scanned email ID for incremental sync
    last_sync_at DATETIME DEFAULT NULL,
    sync_enabled TINYINT(1) DEFAULT 1,
    is_active TINYINT(1) DEFAULT 1,                        -- Only one active at a time for now
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_email (email_address),
    INDEX idx_active (is_active),
    INDEX idx_sync_enabled (sync_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Rollback Script
-- =====================================================
-- DROP TABLE IF EXISTS gmail_oauth_settings;
