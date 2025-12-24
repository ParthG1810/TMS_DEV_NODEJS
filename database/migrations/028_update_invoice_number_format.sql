-- ============================================================
-- Migration: Update invoice_number column to support new format
-- New format: INV-C{CustomerID}-O{OrderID}-{YYYYMMDD}-{Counter}
-- Example: INV-C1-O2-20251224-001
-- Combined: INV-C1-CMB-20251224-001
-- ============================================================

-- Update invoice_number column to VARCHAR(50) to accommodate longer format
ALTER TABLE invoices
    MODIFY COLUMN invoice_number VARCHAR(50) NOT NULL COMMENT 'Format: INV-C{CustomerID}-O{OrderID}-{YYYYMMDD}-{Counter} or INV-C{CustomerID}-CMB-{YYYYMMDD}-{Counter}';

-- ============================================================
-- Verification
-- ============================================================
-- SHOW COLUMNS FROM invoices LIKE 'invoice_number';
