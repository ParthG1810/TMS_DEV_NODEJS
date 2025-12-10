-- Migration: 011_update_pricing_rules_to_meal_plan_price.sql
-- Description: Update pricing_rules to use actual meal plan price instead of default $50
-- Date: 2025-12-10

-- =====================================================
-- Update default pricing rule to use meal plan price
-- =====================================================

-- Option 1: If you have a single standard meal plan price of $2.174
UPDATE pricing_rules
SET delivered_price = 2.174
WHERE is_default = TRUE;

-- =====================================================
-- OR Option 2: If you want to use the average meal plan price
-- =====================================================
-- Uncomment this if you want to calculate from existing meal plans

-- UPDATE pricing_rules pr
-- SET delivered_price = (
--     SELECT AVG(price)
--     FROM meal_plans
--     WHERE price > 0
-- )
-- WHERE is_default = TRUE;

-- =====================================================
-- Verify the update
-- =====================================================

SELECT
    id,
    rule_name,
    delivered_price,
    extra_price,
    is_default,
    effective_from
FROM pricing_rules
WHERE is_default = TRUE;

-- =====================================================
-- End of Migration
-- =====================================================
