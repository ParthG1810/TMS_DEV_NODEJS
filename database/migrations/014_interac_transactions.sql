-- Migration: 014_interac_transactions.sql
-- Description: Add Interac transaction tracking from Gmail emails
-- Date: 2025-12-13

-- =====================================================
-- Interac Transactions Table
-- =====================================================
-- Store raw Interac email data parsed from Gmail

CREATE TABLE IF NOT EXISTS interac_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gmail_settings_id INT NOT NULL,
    gmail_message_id VARCHAR(255) NOT NULL,              -- Gmail's message ID for deduplication
    email_date DATETIME NOT NULL,
    sender_name VARCHAR(255) NOT NULL,                   -- "KRINESHKUMAR PATEL"
    reference_number VARCHAR(100) NOT NULL,              -- "C1AwqurRmFYX"
    amount DECIMAL(10,2) NOT NULL,                       -- 35.00
    currency VARCHAR(10) DEFAULT 'CAD',
    raw_email_body TEXT,                                 -- Store full email for audit

    -- Customer matching
    auto_matched_customer_id INT DEFAULT NULL,           -- System auto-match
    confirmed_customer_id INT DEFAULT NULL,              -- User confirmed/overridden
    match_confidence DECIMAL(3,2) DEFAULT 0.00,          -- 0.00 to 1.00 confidence score

    -- Status tracking
    status ENUM('pending', 'allocated', 'ignored', 'deleted') DEFAULT 'pending',

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_flag TINYINT(1) DEFAULT 0,
    deleted_at DATETIME DEFAULT NULL,
    deleted_by INT DEFAULT NULL,

    UNIQUE KEY unique_gmail_message (gmail_message_id),
    FOREIGN KEY (gmail_settings_id) REFERENCES gmail_oauth_settings(id) ON DELETE CASCADE,
    INDEX idx_reference (reference_number),
    INDEX idx_status (status),
    INDEX idx_email_date (email_date),
    INDEX idx_deleted (deleted_flag),
    INDEX idx_auto_matched (auto_matched_customer_id),
    INDEX idx_confirmed (confirmed_customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Rollback Script
-- =====================================================
-- DROP TABLE IF EXISTS interac_transactions;
