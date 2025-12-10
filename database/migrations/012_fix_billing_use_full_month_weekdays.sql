-- Migration: 012_fix_billing_use_full_month_weekdays.sql
-- Description: Fix billing calculation to use total weekdays in full month
--              instead of just counting calendar entries in the order period
-- Date: 2025-12-10
-- Example: $50 Mon-Fri plan in December (23 weekdays)
--          Per-tiffin: $50/23 = $2.17
--          16 delivered: $2.17 × 16 = $34.78
--          1 extra @ $5: $34.78 + $5 = $39.78

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
        COALESCE(SUM(CASE WHEN status = 'T' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'E' THEN 1 ELSE 0 END), 0),
        COUNT(*)
    INTO v_total_delivered, v_total_absent, v_total_extra, v_total_days
    FROM tiffin_calendar_entries
    WHERE customer_id = p_customer_id
    AND DATE_FORMAT(delivery_date, '%Y-%m') = p_billing_month;

    -- Calculate base amount
    -- Formula: (order_price / total_weekdays_in_full_month) × delivered_count
    -- Example: $50 Mon-Fri plan, December has 23 Mon-Fri days
    --          Per-tiffin: $50/23 = $2.17, Delivered: 16, Base: $2.17 × 16 = $34.78
    SELECT COALESCE(SUM(
        (co.price /
            -- Calculate total weekdays in FULL month based on meal plan
            -- Generate all dates in the billing month and count matching weekdays
            (SELECT COUNT(*)
             FROM (
                 SELECT DATE_ADD(CONCAT(p_billing_month, '-01'), INTERVAL n DAY) as d
                 FROM (
                     SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
                     UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
                     UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
                     UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
                     UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24
                     UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
                     UNION SELECT 30
                 ) nums
             ) dates
             WHERE MONTH(d) = MONTH(CONCAT(p_billing_month, '-01'))
             AND YEAR(d) = YEAR(CONCAT(p_billing_month, '-01'))
             AND (
                 (mp.days = 'Mon-Fri' AND DAYOFWEEK(d) BETWEEN 2 AND 6) OR
                 (mp.days = 'Mon-Sat' AND DAYOFWEEK(d) BETWEEN 2 AND 7) OR
                 (mp.days = 'Single')
             )
            )
        ) *
        -- Multiply by actual delivered count
        (SELECT COUNT(*)
         FROM tiffin_calendar_entries tce
         WHERE tce.order_id = co.id
         AND DATE_FORMAT(tce.delivery_date, '%Y-%m') = p_billing_month
         AND tce.status = 'T'
        )
    ), 0)
    INTO v_base_amount
    FROM customer_orders co
    INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
    WHERE co.customer_id = p_customer_id
    AND EXISTS (
        SELECT 1 FROM tiffin_calendar_entries tce
        WHERE tce.order_id = co.id
        AND DATE_FORMAT(tce.delivery_date, '%Y-%m') = p_billing_month
    );

    -- Calculate extra amount using ACTUAL prices from calendar entries
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
