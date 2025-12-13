-- Migration: 015_customer_name_aliases.sql
-- Description: Add customer name aliases for better auto-matching
-- Date: 2025-12-13

-- =====================================================
-- Customer Name Aliases Table
-- =====================================================
-- Store customer name variations for Interac sender matching

CREATE TABLE IF NOT EXISTS customer_name_aliases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    alias_name VARCHAR(255) NOT NULL,                    -- "KRINESHKUMAR PATEL", "K PATEL", etc.
    source ENUM('manual', 'learned') DEFAULT 'manual',   -- How alias was added
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT DEFAULT NULL,

    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_alias (alias_name),
    INDEX idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Rollback Script
-- =====================================================
-- DROP TABLE IF EXISTS customer_name_aliases;
