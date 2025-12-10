-- =====================================================
-- Migration 009: Update existing calendar entries with meal plan prices
-- =====================================================
-- Purpose: Fix calendar entries that were created with default pricing
--          instead of actual meal plan prices
-- Created: 2025-12-09
-- =====================================================

-- Update calendar entries to use actual meal plan prices
-- Only updates entries with status='T' (delivered) and price=$50 (default)
UPDATE tiffin_calendar_entries tce
INNER JOIN customer_orders co ON tce.order_id = co.id
INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
SET tce.price = mp.price
WHERE tce.status = 'T'
  AND tce.price = 50.00  -- Only update entries with default price
  AND mp.price IS NOT NULL
  AND mp.price != 50.00; -- Only if meal plan has different price

-- Log the update
SELECT
    COUNT(*) as updated_entries,
    'Calendar entries updated with meal plan prices' as message
FROM tiffin_calendar_entries tce
INNER JOIN customer_orders co ON tce.order_id = co.id
INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
WHERE tce.status = 'T'
  AND mp.price IS NOT NULL;
