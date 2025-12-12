-- =====================================================
-- Migration: Smart Date Validation for Customer Orders
-- Description: Allow single-day orders ONLY for 'Single' meal plans
--              Enforce end_date > start_date for all other meal plans
-- =====================================================

-- First, drop the existing check constraint (it can't reference other tables)
ALTER TABLE customer_orders DROP CHECK customer_orders_chk_1;

-- Create trigger for INSERT to validate date range based on meal plan type
DELIMITER $$

CREATE TRIGGER trg_customer_orders_date_validation_insert
BEFORE INSERT ON customer_orders
FOR EACH ROW
BEGIN
    DECLARE meal_plan_days VARCHAR(50);

    -- Get the days field from the meal plan
    SELECT days INTO meal_plan_days
    FROM meal_plans
    WHERE id = NEW.meal_plan_id;

    -- Validate date range based on meal plan type
    IF meal_plan_days = 'Single' THEN
        -- For 'Single' meal plans, allow same-day orders (start_date = end_date)
        IF NEW.end_date < NEW.start_date THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'end_date cannot be before start_date';
        END IF;
    ELSE
        -- For all other meal plans, require end_date > start_date
        IF NEW.end_date <= NEW.start_date THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'For non-single meal plans, end_date must be greater than start_date';
        END IF;
    END IF;
END$$

-- Create trigger for UPDATE to validate date range based on meal plan type
CREATE TRIGGER trg_customer_orders_date_validation_update
BEFORE UPDATE ON customer_orders
FOR EACH ROW
BEGIN
    DECLARE meal_plan_days VARCHAR(50);

    -- Get the days field from the meal plan
    SELECT days INTO meal_plan_days
    FROM meal_plans
    WHERE id = NEW.meal_plan_id;

    -- Validate date range based on meal plan type
    IF meal_plan_days = 'Single' THEN
        -- For 'Single' meal plans, allow same-day orders (start_date = end_date)
        IF NEW.end_date < NEW.start_date THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'end_date cannot be before start_date';
        END IF;
    ELSE
        -- For all other meal plans, require end_date > start_date
        IF NEW.end_date <= NEW.start_date THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'For non-single meal plans, end_date must be greater than start_date';
        END IF;
    END IF;
END$$

DELIMITER ;

-- Verify the triggers were created
SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, ACTION_STATEMENT
FROM INFORMATION_SCHEMA.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE()
AND EVENT_OBJECT_TABLE = 'customer_orders'
AND TRIGGER_NAME LIKE 'trg_customer_orders_date_validation%';
