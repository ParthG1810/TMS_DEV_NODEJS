-- =====================================================
-- Test Case: Rajesh Kumar - December 2025
-- Verify billing calculation for partial month with absent and extra
-- =====================================================
-- Expected Calculation:
-- Plan: Standard Lunch @ $50.00 for Dec 8-30, 2025 (Mon-Fri)
-- 9th Dec: Absent
-- 20th Dec: Extra tiffin @ $5
-- All other plan days: Delivered
-- Expected total: ~$37.609
-- =====================================================

USE tms_db;

-- Clean up existing test data for Rajesh Kumar in December 2025
DELETE FROM tiffin_calendar_entries
WHERE customer_id = (SELECT id FROM customers WHERE name = 'Rajesh Kumar')
AND DATE_FORMAT(delivery_date, '%Y-%m') = '2025-12';

DELETE FROM monthly_billing
WHERE customer_id = (SELECT id FROM customers WHERE name = 'Rajesh Kumar')
AND billing_month = '2025-12';

-- Get customer and order IDs
SET @customer_id = (SELECT id FROM customers WHERE name = 'Rajesh Kumar' LIMIT 1);
SET @meal_plan_id = (SELECT id FROM meal_plans WHERE meal_name LIKE '%Standard%' LIMIT 1);

-- If customer doesn't exist, show error
SELECT
    CASE
        WHEN @customer_id IS NULL THEN 'ERROR: Rajesh Kumar not found in customers table'
        WHEN @meal_plan_id IS NULL THEN 'ERROR: Standard meal plan not found'
        ELSE 'Customer and meal plan found, proceeding...'
    END as status;

-- Create or update the order for Dec 8-30, 2025
INSERT INTO customer_orders (customer_id, meal_plan_id, quantity, selected_days, price, start_date, end_date)
VALUES (
    @customer_id,
    @meal_plan_id,
    1,
    '["Monday","Tuesday","Wednesday","Thursday","Friday"]',
    50.00,
    '2025-12-08',
    '2025-12-30'
)
ON DUPLICATE KEY UPDATE
    price = 50.00,
    start_date = '2025-12-08',
    end_date = '2025-12-30';

-- Get the order ID
SET @order_id = (
    SELECT id FROM customer_orders
    WHERE customer_id = @customer_id
    AND start_date = '2025-12-08'
    AND end_date = '2025-12-30'
    LIMIT 1
);

-- =====================================================
-- Create calendar entries
-- December 2025 weekdays (Mon-Fri) from Dec 8-30:
-- Week 1: Dec 8(Mon), 9(Tue-ABSENT), 10(Wed), 11(Thu), 12(Fri)
-- Week 2: Dec 15(Mon), 16(Tue), 17(Wed), 18(Thu), 19(Fri)
-- Week 3: Dec 22(Mon), 23(Tue), 24(Wed), 25(Thu), 26(Fri)
-- Week 4: Dec 29(Mon), 30(Tue)
-- Total: 17 weekdays, 1 absent (9th), 16 delivered
-- Plus: Dec 20(Sat) - Extra @ $5
-- =====================================================

-- Week 1
INSERT INTO tiffin_calendar_entries (customer_id, order_id, delivery_date, status, quantity, price, notes)
VALUES
(@customer_id, @order_id, '2025-12-08', 'T', 1, 2.94, 'Week 1 - Monday'),
(@customer_id, @order_id, '2025-12-09', 'A', 1, 2.94, 'Week 1 - Tuesday - ABSENT'),
(@customer_id, @order_id, '2025-12-10', 'T', 1, 2.94, 'Week 1 - Wednesday'),
(@customer_id, @order_id, '2025-12-11', 'T', 1, 2.94, 'Week 1 - Thursday'),
(@customer_id, @order_id, '2025-12-12', 'T', 1, 2.94, 'Week 1 - Friday');

-- Week 2
INSERT INTO tiffin_calendar_entries (customer_id, order_id, delivery_date, status, quantity, price, notes)
VALUES
(@customer_id, @order_id, '2025-12-15', 'T', 1, 2.94, 'Week 2 - Monday'),
(@customer_id, @order_id, '2025-12-16', 'T', 1, 2.94, 'Week 2 - Tuesday'),
(@customer_id, @order_id, '2025-12-17', 'T', 1, 2.94, 'Week 2 - Wednesday'),
(@customer_id, @order_id, '2025-12-18', 'T', 1, 2.94, 'Week 2 - Thursday'),
(@customer_id, @order_id, '2025-12-19', 'T', 1, 2.94, 'Week 2 - Friday');

-- Extra on Saturday
INSERT INTO tiffin_calendar_entries (customer_id, order_id, delivery_date, status, quantity, price, notes)
VALUES
(@customer_id, @order_id, '2025-12-20', 'E', 1, 5.00, 'Saturday - EXTRA tiffin');

-- Week 3
INSERT INTO tiffin_calendar_entries (customer_id, order_id, delivery_date, status, quantity, price, notes)
VALUES
(@customer_id, @order_id, '2025-12-22', 'T', 1, 2.94, 'Week 3 - Monday'),
(@customer_id, @order_id, '2025-12-23', 'T', 1, 2.94, 'Week 3 - Tuesday'),
(@customer_id, @order_id, '2025-12-24', 'T', 1, 2.94, 'Week 3 - Wednesday'),
(@customer_id, @order_id, '2025-12-25', 'T', 1, 2.94, 'Week 3 - Thursday (Christmas)'),
(@customer_id, @order_id, '2025-12-26', 'T', 1, 2.94, 'Week 3 - Friday');

-- Week 4
INSERT INTO tiffin_calendar_entries (customer_id, order_id, delivery_date, status, quantity, price, notes)
VALUES
(@customer_id, @order_id, '2025-12-29', 'T', 1, 2.94, 'Week 4 - Monday'),
(@customer_id, @order_id, '2025-12-30', 'T', 1, 2.94, 'Week 4 - Tuesday');

-- =====================================================
-- Calculate billing
-- =====================================================
CALL sp_calculate_monthly_billing(@customer_id, '2025-12');

-- =====================================================
-- Show the results
-- =====================================================
SELECT '=== CALENDAR ENTRIES SUMMARY ===' as section;

SELECT
    DATE_FORMAT(delivery_date, '%Y-%m-%d %W') as date_day,
    status,
    CASE
        WHEN status = 'T' THEN 'Delivered'
        WHEN status = 'A' THEN 'Absent'
        WHEN status = 'E' THEN 'Extra'
    END as status_name,
    quantity,
    price
FROM tiffin_calendar_entries
WHERE customer_id = @customer_id
AND DATE_FORMAT(delivery_date, '%Y-%m') = '2025-12'
ORDER BY delivery_date;

SELECT '=== ENTRY COUNTS ===' as section;

SELECT
    SUM(CASE WHEN status = 'T' THEN 1 ELSE 0 END) as delivered_count,
    SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END) as absent_count,
    SUM(CASE WHEN status = 'E' THEN 1 ELSE 0 END) as extra_count,
    COUNT(*) as total_entries
FROM tiffin_calendar_entries
WHERE customer_id = @customer_id
AND DATE_FORMAT(delivery_date, '%Y-%m') = '2025-12';

SELECT '=== BILLING CALCULATION ===' as section;

SELECT
    c.name as customer_name,
    mb.billing_month,
    mb.total_delivered,
    mb.total_absent,
    mb.total_extra,
    mb.total_days,
    CONCAT('$', FORMAT(mb.base_amount, 2)) as base_amount,
    CONCAT('$', FORMAT(mb.extra_amount, 2)) as extra_amount,
    CONCAT('$', FORMAT(mb.total_amount, 2)) as total_amount,
    mb.status
FROM monthly_billing mb
INNER JOIN customers c ON mb.customer_id = c.id
WHERE mb.customer_id = @customer_id
AND mb.billing_month = '2025-12';

SELECT '=== DETAILED CALCULATION ===' as section;

-- Calculate what it SHOULD be
SELECT
    '$50.00' as order_price,
    '17' as total_plan_days,
    '16' as delivered_days,
    '1' as absent_days,
    '1' as extra_days,
    CONCAT('$', FORMAT(50.00 / 17, 3)) as per_tiffin_price,
    CONCAT('$', FORMAT((50.00 / 17) * 16, 3)) as expected_base_amount,
    '$5.00' as extra_amount,
    CONCAT('$', FORMAT(((50.00 / 17) * 16) + 5.00, 3)) as expected_total;

SELECT '=== EXPECTED vs ACTUAL ===' as section;

SELECT
    CONCAT('$', FORMAT(((50.00 / 17) * 16) + 5.00, 3)) as expected_total,
    CONCAT('$', FORMAT(mb.total_amount, 3)) as actual_total,
    CONCAT('$', FORMAT(ABS(((50.00 / 17) * 16) + 5.00 - mb.total_amount), 3)) as difference,
    CASE
        WHEN ABS(((50.00 / 17) * 16) + 5.00 - mb.total_amount) < 0.01 THEN '✓ MATCH'
        ELSE '⚠ MISMATCH'
    END as status
FROM monthly_billing mb
WHERE mb.customer_id = @customer_id
AND mb.billing_month = '2025-12';
