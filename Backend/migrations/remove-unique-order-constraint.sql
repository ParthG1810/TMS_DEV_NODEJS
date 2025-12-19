-- Migration: Remove unique_order constraint to allow extra tiffin orders
-- Extra tiffin orders can have the same customer_id, meal_plan_id, and dates
-- as parent orders, so we need to remove this constraint
--
-- Date: 2025-12-19

-- Drop the unique constraint that blocks extra tiffin orders
ALTER TABLE customer_orders
DROP INDEX IF EXISTS unique_order;

-- Note: Extra tiffin orders are differentiated by having a parent_order_id set
-- Parent orders have parent_order_id = NULL
-- This allows multiple orders for the same customer/meal/dates as long as they're extra tiffins
