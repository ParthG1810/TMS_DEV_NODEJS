-- Migration: 019_refund_records.sql
-- Description: Add refund records table for tracking refunds
-- Date: 2025-12-13

-- =====================================================
-- Refund Records Table
-- =====================================================
-- Track all refund requests and their status

CREATE TABLE IF NOT EXISTS refund_records (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Source of refund
    source_type ENUM('credit', 'payment') NOT NULL,      -- Where refund came from
    credit_id INT DEFAULT NULL,                          -- If from customer_credit
    payment_record_id INT DEFAULT NULL,                  -- If direct payment refund

    -- Customer info
    customer_id INT NOT NULL,

    -- Refund details
    refund_amount DECIMAL(10,2) NOT NULL,
    refund_method ENUM('interac', 'cash', 'cheque', 'other') NOT NULL,
    refund_date DATE NOT NULL,
    reference_number VARCHAR(100) DEFAULT NULL,          -- e-Transfer reference, cheque #, etc.
    reason TEXT NOT NULL,                                -- Required: why refund was issued

    -- Status
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',

    -- Approval workflow
    requested_by INT NOT NULL,
    approved_by INT DEFAULT NULL,
    approved_at DATETIME DEFAULT NULL,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_flag TINYINT(1) DEFAULT 0,
    deleted_at DATETIME DEFAULT NULL,
    deleted_by INT DEFAULT NULL,

    FOREIGN KEY (credit_id) REFERENCES customer_credit(id) ON DELETE SET NULL,
    FOREIGN KEY (payment_record_id) REFERENCES payment_records(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_deleted (deleted_flag),
    INDEX idx_refund_date (refund_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Rollback Script
-- =====================================================
-- DROP TABLE IF EXISTS refund_records;
