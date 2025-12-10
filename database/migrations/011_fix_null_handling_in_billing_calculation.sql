-- Migration: 011_fix_null_handling_in_billing_calculation.sql
-- Description: Fix NULL handling in sp_calculate_monthly_billing to prevent
--              "Column 'total_delivered' cannot be null" error when deleting
--              the last calendar entry for a customer/month
-- Date: 2025-12-10
-- Fixes: GitHub Issue - Error deleting calendar entry

-- =====================================================
-- Drop and recreate stored procedure with NULL handling
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
    -- FIX: Use COALESCE to handle NULL when no entries exist
    SELECT
        COALESCE(SUM(CASE WHEN status = 'T' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'E' THEN 1 ELSE 0 END), 0),
        COUNT(*)
    INTO v_total_delivered, v_total_absent, v_total_extra, v_total_days
    FROM tiffin_calendar_entries
    WHERE customer_id = p_customer_id
    AND DATE_FORMAT(delivery_date, '%Y-%m') = p_billing_month;

    -- Calculate base amount: For each order, calculate (order_price / total_plan_days) × delivered_count
    -- This dynamically calculates per-tiffin price based on the order's monthly price and selected days
    -- Example: $50 plan for Mon-Fri with 23 weekdays in month = $50/23 = $2.174 per tiffin
    SELECT COALESCE(SUM(
        (co.price / (
            -- Count total plan days in the billing month for this order
            SELECT COUNT(*)
            FROM tiffin_calendar_entries tce_count
            WHERE tce_count.order_id = co.id
            AND DATE_FORMAT(tce_count.delivery_date, '%Y-%m') = p_billing_month
            AND tce_count.status IN ('T', 'A')  -- Include both delivered and absent days in plan
        )) * (
            -- Count delivered days for this order
            SELECT COUNT(*)
            FROM tiffin_calendar_entries tce_delivered
            WHERE tce_delivered.order_id = co.id
            AND DATE_FORMAT(tce_delivered.delivery_date, '%Y-%m') = p_billing_month
            AND tce_delivered.status = 'T'  -- Only delivered tiffins
        )
    ), 0)
    INTO v_base_amount
    FROM customer_orders co
    WHERE co.customer_id = p_customer_id
    AND EXISTS (
        SELECT 1 FROM tiffin_calendar_entries tce
        WHERE tce.order_id = co.id
        AND DATE_FORMAT(tce.delivery_date, '%Y-%m') = p_billing_month
        AND tce.status IN ('T', 'A')
    );

    -- Calculate extra amount using ACTUAL prices from calendar entries
    -- This allows custom pricing for each extra tiffin order
    SELECT COALESCE(SUM(CASE WHEN status = 'E' THEN price ELSE 0 END), 0)
    INTO v_extra_amount
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
        calculated_at = NOW(),
        updated_at = NOW();

END$$

DELIMITER ;

-- =====================================================
-- Verification
-- =====================================================
-- The stored procedure should now handle empty calendar entry sets properly
-- Test by deleting calendar entries - it should no longer throw NULL errors
