-- Migration: 016_payment_records.sql
-- Description: Add master payment records table for all payments (Interac + Cash)
-- Date: 2025-12-13

-- =====================================================
-- Payment Records Table (Master)
-- =====================================================
-- Store ALL payments - Interac e-Transfers and Cash

CREATE TABLE IF NOT EXISTS payment_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_type ENUM('online', 'cash') NOT NULL,
    payment_source VARCHAR(50) DEFAULT NULL,             -- 'interac', 'stripe', etc.
    interac_transaction_id INT DEFAULT NULL,             -- Link to interac_transactions

    -- Customer info
    customer_id INT DEFAULT NULL,                        -- Confirmed customer
    payer_name VARCHAR(255) DEFAULT NULL,

    -- Payment details
    payment_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reference_number VARCHAR(100) DEFAULT NULL,
    notes TEXT DEFAULT NULL,

    -- Allocation tracking
    total_allocated DECIMAL(10,2) DEFAULT 0.00,
    excess_amount DECIMAL(10,2) DEFAULT 0.00,            -- Amount moved to credit
    allocation_status ENUM('unallocated', 'partial', 'fully_allocated', 'has_excess')
        DEFAULT 'unallocated',

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT DEFAULT NULL,
    deleted_flag TINYINT(1) DEFAULT 0,
    deleted_at DATETIME DEFAULT NULL,
    deleted_by INT DEFAULT NULL,
    delete_reason TEXT DEFAULT NULL,

    FOREIGN KEY (interac_transaction_id) REFERENCES interac_transactions(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    INDEX idx_payment_date (payment_date),
    INDEX idx_deleted (deleted_flag),
    INDEX idx_allocation_status (allocation_status),
    INDEX idx_customer (customer_id),
    INDEX idx_payment_type (payment_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Rollback Script
-- =====================================================
-- DROP TABLE IF EXISTS payment_records;
