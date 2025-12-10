-- Migration: 010_hybrid_billing_calculation.sql
-- Description: Update billing calculation to use hybrid approach
--              Base tiffins: pricing_rules.delivered_price × count (OLD working method)
--              Extra tiffins: SUM of actual prices from entries (NEW working method)
-- Date: 2025-12-10

-- =====================================================
-- Drop and recreate stored procedure with hybrid calculation
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
    DECLARE v_delivered_price DECIMAL(10,2) DEFAULT 50.00;

    -- Get default pricing for delivered tiffins
    SELECT delivered_price INTO v_delivered_price
    FROM pricing_rules
    WHERE is_default = TRUE
    LIMIT 1;

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

    -- Calculate base amount using pricing_rules (OLD method - was working)
    -- This multiplies delivered count by the fixed price from pricing_rules
    SET v_base_amount = v_total_delivered * v_delivered_price;

    -- Calculate extra amount using ACTUAL prices from calendar entries (NEW method - working now)
    -- This sums the actual custom prices entered for each extra tiffin
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
