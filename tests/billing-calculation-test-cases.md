# Billing Calculation Test Cases

## Overview
This document provides test cases to verify the dynamic billing calculation logic implemented in migration 010.

## Calculation Formula

### Base Amount (Regular Tiffins from Plan)
```
For each order:
  per_tiffin_price = order_price / total_plan_days_in_month
  order_base_amount = per_tiffin_price × delivered_count

Total Base Amount = SUM of all order_base_amounts
```

### Extra Amount (Extra Tiffins - Not in Plan)
```
Total Extra Amount = SUM of prices from calendar entries with status 'E'
```

### Total Amount
```
Total Amount = Base Amount + Extra Amount
```

---

## Test Case 1: Single Order - Mon-Fri Plan, Full Month

### Setup
- **Customer**: Test Customer 1
- **Order**: Mon-Fri plan @ $1500/month
- **Month**: December 2024 (23 weekdays)
- **Calendar Entries**: All 23 weekdays marked as 'T' (Delivered)

### Expected Calculation
```
Per-tiffin price = $1500 / 23 = $65.217
Base Amount = $65.217 × 23 = $1500.00
Extra Amount = $0.00
Total Amount = $1500.00
```

### Counts
- total_delivered: 23
- total_absent: 0
- total_extra: 0
- total_days: 23

---

## Test Case 2: Single Order - Mon-Fri Plan, Partial Delivery

### Setup
- **Customer**: Test Customer 2
- **Order**: Mon-Fri plan @ $1500/month
- **Month**: December 2024 (23 weekdays)
- **Calendar Entries**:
  - 16 days marked as 'T' (Delivered)
  - 7 days marked as 'A' (Absent)

### Expected Calculation
```
Per-tiffin price = $1500 / 23 = $65.217
Base Amount = $65.217 × 16 = $1043.472 ≈ $1043.47
Extra Amount = $0.00
Total Amount = $1043.47
```

### Counts
- total_delivered: 16
- total_absent: 7
- total_extra: 0
- total_days: 23

---

## Test Case 3: Single Order with Extra Tiffins

### Setup
- **Customer**: Test Customer 3
- **Order**: Mon-Fri plan @ $1500/month
- **Month**: December 2024 (23 weekdays)
- **Calendar Entries**:
  - 20 days marked as 'T' (Delivered)
  - 3 days marked as 'A' (Absent)
  - 2 days marked as 'E' (Extra) @ $75 each

### Expected Calculation
```
Per-tiffin price = $1500 / 23 = $65.217
Base Amount = $65.217 × 20 = $1304.34
Extra Amount = $75 + $75 = $150.00
Total Amount = $1304.34 + $150.00 = $1454.34
```

### Counts
- total_delivered: 20
- total_absent: 3
- total_extra: 2
- total_days: 25 (23 plan days + 2 extra)

---

## Test Case 4: Multiple Orders - Different Plans

### Setup
- **Customer**: Test Customer 4
- **Orders**:
  - Order 1: Mon-Fri plan @ $1500/month (Days 1-15 of month)
  - Order 2: Mon-Sat plan @ $2000/month (Days 16-31 of month)
- **Month**: December 2024
- **Calendar Entries**:
  - Order 1: 11 weekdays (7 T, 4 A)
  - Order 2: 12 weekdays (10 T, 2 A)

### Expected Calculation
```
Order 1:
  Total plan days = 11
  Per-tiffin price = $1500 / 11 = $136.364
  Base amount = $136.364 × 7 = $954.55

Order 2:
  Total plan days = 12
  Per-tiffin price = $2000 / 12 = $166.667
  Base amount = $166.667 × 10 = $1666.67

Total Base Amount = $954.55 + $1666.67 = $2621.22
Extra Amount = $0.00
Total Amount = $2621.22
```

### Counts
- total_delivered: 17
- total_absent: 6
- total_extra: 0
- total_days: 23

---

## Test Case 5: Edge Case - Only Extra Tiffins

### Setup
- **Customer**: Test Customer 5
- **Order**: Mon-Fri plan @ $1500/month
- **Month**: December 2024 (23 weekdays)
- **Calendar Entries**:
  - 0 days marked as 'T' (Delivered)
  - 23 days marked as 'A' (Absent)
  - 5 days marked as 'E' (Extra) @ $75 each

### Expected Calculation
```
Per-tiffin price = $1500 / 23 = $65.217
Base Amount = $65.217 × 0 = $0.00
Extra Amount = $75 × 5 = $375.00
Total Amount = $375.00
```

### Counts
- total_delivered: 0
- total_absent: 23
- total_extra: 5
- total_days: 28 (23 plan days + 5 extra)

---

## Test Case 6: Edge Case - No Calendar Entries

### Setup
- **Customer**: Test Customer 6
- **Order**: Mon-Fri plan @ $1500/month
- **Month**: December 2024
- **Calendar Entries**: None (all deleted or never created)

### Expected Calculation
```
Base Amount = $0.00
Extra Amount = $0.00
Total Amount = $0.00
```

### Counts
- total_delivered: 0
- total_absent: 0
- total_extra: 0
- total_days: 0

**Note**: This is the scenario that was causing the deletion error. After applying migration 011, this should work correctly.

---

## Test Case 7: Real-World Scenario - Variable Pricing

### Setup
- **Customer**: Premium Customer
- **Order**: Mon-Sat plan @ $2400/month
- **Month**: December 2024 (26 weekdays Mon-Sat)
- **Calendar Entries**:
  - 22 days marked as 'T' (Delivered)
  - 4 days marked as 'A' (Absent - holidays/sick days)
  - 3 days marked as 'E' (Extra - guests) @ $100 each

### Expected Calculation
```
Per-tiffin price = $2400 / 26 = $92.308
Base Amount = $92.308 × 22 = $2030.78
Extra Amount = $100 × 3 = $300.00
Total Amount = $2030.78 + $300.00 = $2330.78
```

### Counts
- total_delivered: 22
- total_absent: 4
- total_extra: 3
- total_days: 29 (26 plan days + 3 extra)

---

## SQL Test Script

You can run this script to create test data and verify calculations:

```sql
-- Clean up test data
DELETE FROM tiffin_calendar_entries WHERE customer_id IN (SELECT id FROM customers WHERE name LIKE 'Test Customer%');
DELETE FROM customer_orders WHERE customer_id IN (SELECT id FROM customers WHERE name LIKE 'Test Customer%');
DELETE FROM monthly_billing WHERE customer_id IN (SELECT id FROM customers WHERE name LIKE 'Test Customer%');
DELETE FROM customers WHERE name LIKE 'Test Customer%';

-- Create test customers
INSERT INTO customers (name, phone, address) VALUES
('Test Customer 1', '1111111111', 'Test Address 1'),
('Test Customer 2', '2222222222', 'Test Address 2'),
('Test Customer 3', '3333333333', 'Test Address 3');

-- Get customer IDs
SET @cust1 = (SELECT id FROM customers WHERE name = 'Test Customer 1');
SET @cust2 = (SELECT id FROM customers WHERE name = 'Test Customer 2');
SET @cust3 = (SELECT id FROM customers WHERE name = 'Test Customer 3');

-- Get meal plan ID (Mon-Fri)
SET @meal_plan_id = (SELECT id FROM meal_plans WHERE days = 'Mon-Fri' LIMIT 1);

-- Create orders
INSERT INTO customer_orders (customer_id, meal_plan_id, quantity, selected_days, price, start_date, end_date)
VALUES
(@cust1, @meal_plan_id, 1, '["Monday","Tuesday","Wednesday","Thursday","Friday"]', 1500.00, '2024-12-01', '2024-12-31'),
(@cust2, @meal_plan_id, 1, '["Monday","Tuesday","Wednesday","Thursday","Friday"]', 1500.00, '2024-12-01', '2024-12-31'),
(@cust3, @meal_plan_id, 1, '["Monday","Tuesday","Wednesday","Thursday","Friday"]', 1500.00, '2024-12-01', '2024-12-31');

-- Get order IDs
SET @order1 = (SELECT id FROM customer_orders WHERE customer_id = @cust1 ORDER BY id DESC LIMIT 1);
SET @order2 = (SELECT id FROM customer_orders WHERE customer_id = @cust2 ORDER BY id DESC LIMIT 1);
SET @order3 = (SELECT id FROM customer_orders WHERE customer_id = @cust3 ORDER BY id DESC LIMIT 1);

-- Test Case 1: Full delivery (23 days)
-- December 2024 weekdays: 2,3,4,5,6,9,10,11,12,13,16,17,18,19,20,23,24,26,27,30,31 + 2 more
INSERT INTO tiffin_calendar_entries (customer_id, order_id, delivery_date, status, quantity, price)
VALUES
(@cust1, @order1, '2024-12-02', 'T', 1, 65.22),
(@cust1, @order1, '2024-12-03', 'T', 1, 65.22),
(@cust1, @order1, '2024-12-04', 'T', 1, 65.22),
(@cust1, @order1, '2024-12-05', 'T', 1, 65.22),
(@cust1, @order1, '2024-12-06', 'T', 1, 65.22),
(@cust1, @order1, '2024-12-09', 'T', 1, 65.22),
(@cust1, @order1, '2024-12-10', 'T', 1, 65.22),
(@cust1, @order1, '2024-12-11', 'T', 1, 65.22),
(@cust1, @order1, '2024-12-12', 'T', 1, 65.22),
(@cust1, @order1, '2024-12-13', 'T', 1, 65.22),
(@cust1, @order1, '2024-12-16', 'T', 1, 65.22),
(@cust1, @order1, '2024-12-17', 'T', 1, 65.22),
(@cust1, @order1, '2024-12-18', 'T', 1, 65.22),
(@cust1, @order1, '2024-12-19', 'T', 1, 65.22),
(@cust1, @order1, '2024-12-20', 'T', 1, 65.22),
(@cust1, @order1, '2024-12-23', 'T', 1, 65.22),
(@cust1, @order1, '2024-12-24', 'T', 1, 65.22),
(@cust1, @order1, '2024-12-26', 'T', 1, 65.22),
(@cust1, @order1, '2024-12-27', 'T', 1, 65.22),
(@cust1, @order1, '2024-12-30', 'T', 1, 65.22),
(@cust1, @order1, '2024-12-31', 'T', 1, 65.22);

-- Test Case 2: Partial delivery (16 T, 7 A)
-- Add similar entries for @cust2...

-- Calculate billing
CALL sp_calculate_monthly_billing(@cust1, '2024-12');
CALL sp_calculate_monthly_billing(@cust2, '2024-12');
CALL sp_calculate_monthly_billing(@cust3, '2024-12');

-- View results
SELECT
    c.name,
    mb.billing_month,
    mb.total_delivered,
    mb.total_absent,
    mb.total_extra,
    mb.total_days,
    mb.base_amount,
    mb.extra_amount,
    mb.total_amount
FROM monthly_billing mb
INNER JOIN customers c ON mb.customer_id = c.id
WHERE c.name LIKE 'Test Customer%'
ORDER BY c.name;
```

---

## Common Issues to Check

### 1. Division by Zero
- **When**: No calendar entries exist for a customer/month
- **Expected**: Should return 0, not throw error
- **Fixed by**: Migration 011 (COALESCE to handle NULL values)

### 2. Rounding Discrepancies
- **Issue**: Decimal prices may have rounding differences
- **Solution**: MySQL uses DECIMAL(10,2) which rounds to 2 decimal places
- **Verify**: Sum of individual entries should match total within $0.01

### 3. Status Filtering
- **Important**:
  - Base amount calculation counts both 'T' and 'A' as plan days
  - Base amount only charges for 'T' (delivered) tiffins
  - Extra amount only counts 'E' status entries

### 4. Multiple Orders
- **Important**: Each order is calculated separately then summed
- **Verify**: Each order's per-tiffin price is calculated from its own plan days count

---

## Manual Verification Steps

1. **Count Calendar Entries**:
   ```sql
   SELECT
     customer_id,
     COUNT(CASE WHEN status = 'T' THEN 1 END) as delivered,
     COUNT(CASE WHEN status = 'A' THEN 1 END) as absent,
     COUNT(CASE WHEN status = 'E' THEN 1 END) as extra
   FROM tiffin_calendar_entries
   WHERE DATE_FORMAT(delivery_date, '%Y-%m') = '2024-12'
   GROUP BY customer_id;
   ```

2. **Calculate Expected Base Amount**:
   ```sql
   SELECT
     co.customer_id,
     co.id as order_id,
     co.price as order_price,
     COUNT(CASE WHEN tce.status IN ('T','A') THEN 1 END) as total_plan_days,
     COUNT(CASE WHEN tce.status = 'T' THEN 1 END) as delivered_days,
     co.price / COUNT(CASE WHEN tce.status IN ('T','A') THEN 1 END) as per_tiffin_price,
     (co.price / COUNT(CASE WHEN tce.status IN ('T','A') THEN 1 END)) *
       COUNT(CASE WHEN tce.status = 'T' THEN 1 END) as expected_base_amount
   FROM customer_orders co
   INNER JOIN tiffin_calendar_entries tce ON co.id = tce.order_id
   WHERE DATE_FORMAT(tce.delivery_date, '%Y-%m') = '2024-12'
   GROUP BY co.customer_id, co.id, co.price;
   ```

3. **Calculate Expected Extra Amount**:
   ```sql
   SELECT
     customer_id,
     SUM(price) as expected_extra_amount
   FROM tiffin_calendar_entries
   WHERE DATE_FORMAT(delivery_date, '%Y-%m') = '2024-12'
     AND status = 'E'
   GROUP BY customer_id;
   ```

4. **Compare with Actual**:
   ```sql
   SELECT
     customer_id,
     billing_month,
     base_amount,
     extra_amount,
     total_amount
   FROM monthly_billing
   WHERE billing_month = '2024-12';
   ```
