-- Migration: 017_payment_allocations.sql
-- Description: Add payment allocations table for linking payments to invoices
-- Date: 2025-12-13

-- =====================================================
-- Payment Allocations Table
-- =====================================================
-- Links payments to invoices (many-to-many) with allocation order

CREATE TABLE IF NOT EXISTS payment_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_record_id INT NOT NULL,
    billing_id INT NOT NULL,                             -- monthly_billing.id
    customer_id INT NOT NULL,

    -- Allocation details
    allocation_order INT NOT NULL,                       -- Order user selected (1,2,3...)
    allocated_amount DECIMAL(10,2) NOT NULL,

    -- Invoice state at allocation time (for audit)
    invoice_balance_before DECIMAL(10,2) NOT NULL,
    invoice_balance_after DECIMAL(10,2) NOT NULL,

    -- Resulting status
    resulting_status ENUM('partial_paid', 'paid') NOT NULL,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT DEFAULT NULL,
    deleted_flag TINYINT(1) DEFAULT 0,
    deleted_at DATETIME DEFAULT NULL,
    deleted_by INT DEFAULT NULL,

    FOREIGN KEY (payment_record_id) REFERENCES payment_records(id) ON DELETE CASCADE,
    FOREIGN KEY (billing_id) REFERENCES monthly_billing(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_payment (payment_record_id),
    INDEX idx_billing (billing_id),
    INDEX idx_customer (customer_id),
    INDEX idx_deleted (deleted_flag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Rollback Script
-- =====================================================
-- DROP TABLE IF EXISTS payment_allocations;
