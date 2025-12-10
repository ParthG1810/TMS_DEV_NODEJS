-- Migration: 010_dynamic_billing_calculation.sql
-- Description: Update billing calculation to use dynamic per-tiffin pricing
--              Base tiffins: (order_price / total_plan_days) × delivered_count
--              Extra tiffins: SUM of actual prices from entries
-- Date: 2025-12-10
--
-- Examples:
-- - $50 plan Mon-Fri with 23 weekdays: $50/23 = $2.174 per tiffin
-- - $75 plan Mon-Fri with 23 weekdays: $75/23 = $3.26 per tiffin
-- - 16 delivered from $50 plan: 16 × $2.174 = $34.784
-- - 15 delivered + $5 extra: (15 × $2.174) + $5 = $37.61

-- =====================================================
-- Drop and recreate stored procedure with dynamic calculation
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
-- Recalculate existing billing records with new method
-- =====================================================

-- This will trigger recalculation for all existing billing records
-- using the new hybrid calculation method

-- Note: The triggers will automatically recalculate when we touch the calendar entries
-- So we just need to force a recalculation by calling the stored procedure for each customer/month combination

-- Get all unique customer_id and billing_month combinations and recalculate
DELIMITER $$

CREATE PROCEDURE recalculate_all_billing()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_customer_id INT;
    DECLARE v_billing_month VARCHAR(7);

    DECLARE cur CURSOR FOR
        SELECT DISTINCT customer_id, DATE_FORMAT(delivery_date, '%Y-%m') as billing_month
        FROM tiffin_calendar_entries
        ORDER BY customer_id, billing_month;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO v_customer_id, v_billing_month;
        IF done THEN
            LEAVE read_loop;
        END IF;

        CALL sp_calculate_monthly_billing(v_customer_id, v_billing_month);
    END LOOP;

    CLOSE cur;
END$$

DELIMITER ;

-- Execute the recalculation
CALL recalculate_all_billing();

-- Clean up the temporary procedure
DROP PROCEDURE IF EXISTS recalculate_all_billing;

-- =====================================================
-- End of Migration
-- =====================================================

-- To rollback this migration, run migration 008 again to restore the previous calculation method
