-- =====================================================
-- Migration 008: Fix billing calculation to use actual prices
-- =====================================================
-- Purpose: Use actual prices from calendar entries instead of
--          fixed prices from pricing_rules table.
--          This allows custom pricing for extra tiffins.
-- Created: 2025-12-09
-- =====================================================

DROP PROCEDURE IF EXISTS sp_calculate_monthly_billing;

DELIMITER $$

CREATE PROCEDURE sp_calculate_monthly_billing(
    IN p_customer_id INT,
    IN p_billing_month VARCHAR(7)
)
BEGIN
    DECLARE v_total_delivered INT DEFAULT 0;
    DECLARE v_total_absent INT DEFAULT 0;
    DECLARE v_total_extra INT DEFAULT 0;
    DECLARE v_total_days INT DEFAULT 0;
    DECLARE v_base_amount DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_extra_amount DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_total_amount DECIMAL(10,2) DEFAULT 0.00;

    -- Count calendar entries for the month
    SELECT
        SUM(CASE WHEN status = 'T' THEN 1 ELSE 0 END),
        SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END),
        SUM(CASE WHEN status = 'E' THEN 1 ELSE 0 END),
        COUNT(*)
    INTO v_total_delivered, v_total_absent, v_total_extra, v_total_days
    FROM tiffin_calendar_entries
    WHERE customer_id = p_customer_id
    AND DATE_FORMAT(delivery_date, '%Y-%m') = p_billing_month;

    -- Calculate amounts using ACTUAL prices from calendar entries
    SELECT
        COALESCE(SUM(CASE WHEN status = 'T' THEN price ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'E' THEN price ELSE 0 END), 0)
    INTO v_base_amount, v_extra_amount
    FROM tiffin_calendar_entries
    WHERE customer_id = p_customer_id
    AND DATE_FORMAT(delivery_date, '%Y-%m') = p_billing_month;

    SET v_total_amount = v_base_amount + v_extra_amount;

    -- Insert or update monthly billing
    INSERT INTO monthly_billing (
        customer_id, billing_month, total_delivered, total_absent,
        total_extra, total_days, base_amount, extra_amount,
        total_amount, status, calculated_at
    )
    VALUES (
        p_customer_id, p_billing_month, v_total_delivered, v_total_absent,
        v_total_extra, v_total_days, v_base_amount, v_extra_amount,
        v_total_amount, 'calculating', NOW()
    )
    ON DUPLICATE KEY UPDATE
        total_delivered = v_total_delivered,
        total_absent = v_total_absent,
        total_extra = v_total_extra,
        total_days = v_total_days,
        base_amount = v_base_amount,
        extra_amount = v_extra_amount,
        total_amount = v_total_amount,
        calculated_at = NOW();
END$$

DELIMITER ;
