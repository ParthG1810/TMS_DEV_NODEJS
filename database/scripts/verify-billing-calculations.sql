-- =====================================================
-- Billing Calculation Verification Script
-- Description: Verify that billing calculations are correct
-- Usage: Run this script to check if your billing matches expected values
-- =====================================================

USE tms_db;

-- =====================================================
-- 1. Summary of all billing for a specific month
-- =====================================================
-- Change the month value below to verify a specific month
SET @verification_month = '2024-12';

SELECT
    '=== BILLING SUMMARY ===' as section,
    NULL as customer_id,
    NULL as customer_name,
    NULL as total_delivered,
    NULL as total_absent,
    NULL as total_extra,
    NULL as base_amount,
    NULL as extra_amount,
    NULL as total_amount,
    NULL as status;

SELECT
    'Current Billing' as section,
    mb.customer_id,
    c.name as customer_name,
    mb.total_delivered,
    mb.total_absent,
    mb.total_extra,
    mb.base_amount,
    mb.extra_amount,
    mb.total_amount,
    mb.status
FROM monthly_billing mb
INNER JOIN customers c ON mb.customer_id = c.id
WHERE mb.billing_month = @verification_month
ORDER BY c.name;

-- =====================================================
-- 2. Detailed calendar entry counts
-- =====================================================
SELECT
    '=== CALENDAR ENTRY COUNTS ===' as section,
    NULL as customer_id,
    NULL as customer_name,
    NULL as delivered_count,
    NULL as absent_count,
    NULL as extra_count,
    NULL as total_entries;

SELECT
    'Entry Counts' as section,
    tce.customer_id,
    c.name as customer_name,
    SUM(CASE WHEN tce.status = 'T' THEN 1 ELSE 0 END) as delivered_count,
    SUM(CASE WHEN tce.status = 'A' THEN 1 ELSE 0 END) as absent_count,
    SUM(CASE WHEN tce.status = 'E' THEN 1 ELSE 0 END) as extra_count,
    COUNT(*) as total_entries
FROM tiffin_calendar_entries tce
INNER JOIN customers c ON tce.customer_id = c.id
WHERE DATE_FORMAT(tce.delivery_date, '%Y-%m') = @verification_month
GROUP BY tce.customer_id, c.name
ORDER BY c.name;

-- =====================================================
-- 3. Expected Base Amount Calculation (Step by Step)
-- =====================================================
SELECT
    '=== EXPECTED BASE AMOUNT (DETAILED) ===' as section,
    NULL as customer_id,
    NULL as customer_name,
    NULL as order_id,
    NULL as order_price,
    NULL as total_plan_days,
    NULL as delivered_days,
    NULL as per_tiffin_price,
    NULL as expected_base_amount;

SELECT
    'Order Details' as section,
    co.customer_id,
    c.name as customer_name,
    co.id as order_id,
    co.price as order_price,
    (
        SELECT COUNT(*)
        FROM tiffin_calendar_entries tce_count
        WHERE tce_count.order_id = co.id
        AND DATE_FORMAT(tce_count.delivery_date, '%Y-%m') = @verification_month
        AND tce_count.status IN ('T', 'A')
    ) as total_plan_days,
    (
        SELECT COUNT(*)
        FROM tiffin_calendar_entries tce_delivered
        WHERE tce_delivered.order_id = co.id
        AND DATE_FORMAT(tce_delivered.delivery_date, '%Y-%m') = @verification_month
        AND tce_delivered.status = 'T'
    ) as delivered_days,
    ROUND(
        co.price / NULLIF((
            SELECT COUNT(*)
            FROM tiffin_calendar_entries tce_count
            WHERE tce_count.order_id = co.id
            AND DATE_FORMAT(tce_count.delivery_date, '%Y-%m') = @verification_month
            AND tce_count.status IN ('T', 'A')
        ), 0),
        3
    ) as per_tiffin_price,
    ROUND(
        (co.price / NULLIF((
            SELECT COUNT(*)
            FROM tiffin_calendar_entries tce_count
            WHERE tce_count.order_id = co.id
            AND DATE_FORMAT(tce_count.delivery_date, '%Y-%m') = @verification_month
            AND tce_count.status IN ('T', 'A')
        ), 0)) * (
            SELECT COUNT(*)
            FROM tiffin_calendar_entries tce_delivered
            WHERE tce_delivered.order_id = co.id
            AND DATE_FORMAT(tce_delivered.delivery_date, '%Y-%m') = @verification_month
            AND tce_delivered.status = 'T'
        ),
        2
    ) as expected_base_amount
FROM customer_orders co
INNER JOIN customers c ON co.customer_id = c.id
WHERE EXISTS (
    SELECT 1 FROM tiffin_calendar_entries tce
    WHERE tce.order_id = co.id
    AND DATE_FORMAT(tce.delivery_date, '%Y-%m') = @verification_month
)
ORDER BY c.name, co.id;

-- =====================================================
-- 4. Expected Base Amount by Customer (Aggregated)
-- =====================================================
SELECT
    '=== EXPECTED BASE AMOUNT (AGGREGATED) ===' as section,
    NULL as customer_id,
    NULL as customer_name,
    NULL as expected_base_amount;

SELECT
    'Customer Totals' as section,
    co.customer_id,
    c.name as customer_name,
    SUM(
        ROUND(
            (co.price / NULLIF((
                SELECT COUNT(*)
                FROM tiffin_calendar_entries tce_count
                WHERE tce_count.order_id = co.id
                AND DATE_FORMAT(tce_count.delivery_date, '%Y-%m') = @verification_month
                AND tce_count.status IN ('T', 'A')
            ), 0)) * (
                SELECT COUNT(*)
                FROM tiffin_calendar_entries tce_delivered
                WHERE tce_delivered.order_id = co.id
                AND DATE_FORMAT(tce_delivered.delivery_date, '%Y-%m') = @verification_month
                AND tce_delivered.status = 'T'
            ),
            2
        )
    ) as expected_base_amount
FROM customer_orders co
INNER JOIN customers c ON co.customer_id = c.id
WHERE EXISTS (
    SELECT 1 FROM tiffin_calendar_entries tce
    WHERE tce.order_id = co.id
    AND DATE_FORMAT(tce.delivery_date, '%Y-%m') = @verification_month
    AND tce.status IN ('T', 'A')
)
GROUP BY co.customer_id, c.name
ORDER BY c.name;

-- =====================================================
-- 5. Expected Extra Amount
-- =====================================================
SELECT
    '=== EXPECTED EXTRA AMOUNT ===' as section,
    NULL as customer_id,
    NULL as customer_name,
    NULL as extra_count,
    NULL as expected_extra_amount;

SELECT
    'Extra Charges' as section,
    tce.customer_id,
    c.name as customer_name,
    COUNT(*) as extra_count,
    SUM(tce.price) as expected_extra_amount
FROM tiffin_calendar_entries tce
INNER JOIN customers c ON tce.customer_id = c.id
WHERE DATE_FORMAT(tce.delivery_date, '%Y-%m') = @verification_month
    AND tce.status = 'E'
GROUP BY tce.customer_id, c.name
ORDER BY c.name;

-- =====================================================
-- 6. Comparison: Current vs Expected
-- =====================================================
SELECT
    '=== COMPARISON: CURRENT vs EXPECTED ===' as section,
    NULL as customer_id,
    NULL as customer_name,
    NULL as current_base,
    NULL as expected_base,
    NULL as base_diff,
    NULL as current_extra,
    NULL as expected_extra,
    NULL as extra_diff,
    NULL as current_total,
    NULL as expected_total,
    NULL as total_diff,
    NULL as status;

SELECT
    'Comparison' as section,
    mb.customer_id,
    c.name as customer_name,
    mb.base_amount as current_base,
    COALESCE((
        SELECT SUM(
            ROUND(
                (co.price / NULLIF((
                    SELECT COUNT(*)
                    FROM tiffin_calendar_entries tce_count
                    WHERE tce_count.order_id = co.id
                    AND DATE_FORMAT(tce_count.delivery_date, '%Y-%m') = @verification_month
                    AND tce_count.status IN ('T', 'A')
                ), 0)) * (
                    SELECT COUNT(*)
                    FROM tiffin_calendar_entries tce_delivered
                    WHERE tce_delivered.order_id = co.id
                    AND DATE_FORMAT(tce_delivered.delivery_date, '%Y-%m') = @verification_month
                    AND tce_delivered.status = 'T'
                ),
                2
            )
        )
        FROM customer_orders co
        WHERE co.customer_id = mb.customer_id
        AND EXISTS (
            SELECT 1 FROM tiffin_calendar_entries tce
            WHERE tce.order_id = co.id
            AND DATE_FORMAT(tce.delivery_date, '%Y-%m') = @verification_month
            AND tce.status IN ('T', 'A')
        )
    ), 0) as expected_base,
    mb.base_amount - COALESCE((
        SELECT SUM(
            ROUND(
                (co.price / NULLIF((
                    SELECT COUNT(*)
                    FROM tiffin_calendar_entries tce_count
                    WHERE tce_count.order_id = co.id
                    AND DATE_FORMAT(tce_count.delivery_date, '%Y-%m') = @verification_month
                    AND tce_count.status IN ('T', 'A')
                ), 0)) * (
                    SELECT COUNT(*)
                    FROM tiffin_calendar_entries tce_delivered
                    WHERE tce_delivered.order_id = co.id
                    AND DATE_FORMAT(tce_delivered.delivery_date, '%Y-%m') = @verification_month
                    AND tce_delivered.status = 'T'
                ),
                2
            )
        )
        FROM customer_orders co
        WHERE co.customer_id = mb.customer_id
        AND EXISTS (
            SELECT 1 FROM tiffin_calendar_entries tce
            WHERE tce.order_id = co.id
            AND DATE_FORMAT(tce.delivery_date, '%Y-%m') = @verification_month
            AND tce.status IN ('T', 'A')
        )
    ), 0) as base_diff,
    mb.extra_amount as current_extra,
    COALESCE((
        SELECT SUM(price)
        FROM tiffin_calendar_entries
        WHERE customer_id = mb.customer_id
        AND DATE_FORMAT(delivery_date, '%Y-%m') = @verification_month
        AND status = 'E'
    ), 0) as expected_extra,
    mb.extra_amount - COALESCE((
        SELECT SUM(price)
        FROM tiffin_calendar_entries
        WHERE customer_id = mb.customer_id
        AND DATE_FORMAT(delivery_date, '%Y-%m') = @verification_month
        AND status = 'E'
    ), 0) as extra_diff,
    mb.total_amount as current_total,
    mb.base_amount + mb.extra_amount as expected_total,
    0 as total_diff,
    CASE
        WHEN ABS(mb.base_amount - COALESCE((
            SELECT SUM(
                ROUND(
                    (co.price / NULLIF((
                        SELECT COUNT(*)
                        FROM tiffin_calendar_entries tce_count
                        WHERE tce_count.order_id = co.id
                        AND DATE_FORMAT(tce_count.delivery_date, '%Y-%m') = @verification_month
                        AND tce_count.status IN ('T', 'A')
                    ), 0)) * (
                        SELECT COUNT(*)
                        FROM tiffin_calendar_entries tce_delivered
                        WHERE tce_delivered.order_id = co.id
                        AND DATE_FORMAT(tce_delivered.delivery_date, '%Y-%m') = @verification_month
                        AND tce_delivered.status = 'T'
                    ),
                    2
                )
            )
            FROM customer_orders co
            WHERE co.customer_id = mb.customer_id
            AND EXISTS (
                SELECT 1 FROM tiffin_calendar_entries tce
                WHERE tce.order_id = co.id
                AND DATE_FORMAT(tce.delivery_date, '%Y-%m') = @verification_month
                AND tce.status IN ('T', 'A')
            )
        ), 0)) > 0.01 THEN '⚠ MISMATCH'
        ELSE '✓ OK'
    END as status
FROM monthly_billing mb
INNER JOIN customers c ON mb.customer_id = c.id
WHERE mb.billing_month = @verification_month
ORDER BY c.name;

-- =====================================================
-- 7. List all calendar entries for debugging
-- =====================================================
SELECT
    '=== ALL CALENDAR ENTRIES ===' as section,
    NULL as customer_name,
    NULL as delivery_date,
    NULL as status,
    NULL as order_id,
    NULL as quantity,
    NULL as price;

SELECT
    'Calendar Entries' as section,
    c.name as customer_name,
    DATE_FORMAT(tce.delivery_date, '%Y-%m-%d %W') as delivery_date,
    tce.status,
    tce.order_id,
    tce.quantity,
    tce.price
FROM tiffin_calendar_entries tce
INNER JOIN customers c ON tce.customer_id = c.id
WHERE DATE_FORMAT(tce.delivery_date, '%Y-%m') = @verification_month
ORDER BY c.name, tce.delivery_date;

-- =====================================================
-- Final Message
-- =====================================================
SELECT
    '=== VERIFICATION COMPLETE ===' as message,
    CONCAT('Verified billing for ', @verification_month) as details;

SELECT
    'How to interpret results:' as tip,
    'Look at the COMPARISON section - if status shows ⚠ MISMATCH, there is a calculation error' as interpretation;

SELECT
    'If you see mismatches:' as action,
    'Run: CALL sp_calculate_monthly_billing(customer_id, billing_month) to recalculate' as solution;
