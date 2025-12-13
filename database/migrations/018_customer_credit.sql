-- Migration: 018_customer_credit.sql
-- Description: Add customer credit tables for excess payment handling
-- Date: 2025-12-13

-- =====================================================
-- Customer Credit Table
-- =====================================================
-- Store excess payments as customer credit balance

CREATE TABLE IF NOT EXISTS customer_credit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    payment_record_id INT NOT NULL,                      -- Source of credit

    -- Credit details
    original_amount DECIMAL(10,2) NOT NULL,              -- Initial excess amount
    current_balance DECIMAL(10,2) NOT NULL,              -- Remaining balance

    -- Status
    status ENUM('available', 'used', 'refunded', 'expired') DEFAULT 'available',

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notes TEXT DEFAULT NULL,

    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_record_id) REFERENCES payment_records(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_payment (payment_record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Customer Credit Usage Table
-- =====================================================
-- Track how credits are used against invoices

CREATE TABLE IF NOT EXISTS customer_credit_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    credit_id INT NOT NULL,
    billing_id INT NOT NULL,                             -- Invoice paid with credit
    amount_used DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_by INT DEFAULT NULL,

    FOREIGN KEY (credit_id) REFERENCES customer_credit(id) ON DELETE CASCADE,
    FOREIGN KEY (billing_id) REFERENCES monthly_billing(id) ON DELETE CASCADE,
    INDEX idx_credit (credit_id),
    INDEX idx_billing (billing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Rollback Script
-- =====================================================
-- DROP TABLE IF EXISTS customer_credit_usage;
-- DROP TABLE IF EXISTS customer_credit;
