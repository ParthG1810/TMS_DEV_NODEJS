-- Migration: Update billing calculation logic to use monthly plan / working days
-- Date: 2025-12-08

USE tms_db;

-- Drop existing stored procedure
DROP PROCEDURE IF EXISTS sp_calculate_monthly_billing;

DELIMITER $$

CREATE PROCEDURE sp_calculate_monthly_billing(
  IN p_customer_id INT,
  IN p_billing_month VARCHAR(7) -- Format: YYYY-MM
)
BEGIN
  DECLARE v_total_delivered INT DEFAULT 0;
  DECLARE v_total_absent INT DEFAULT 0;
  DECLARE v_total_extra INT DEFAULT 0;
  DECLARE v_total_days INT DEFAULT 0;
  DECLARE v_base_amount DECIMAL(10,2) DEFAULT 0.00;
  DECLARE v_extra_amount DECIMAL(10,2) DEFAULT 0.00;
  DECLARE v_total_amount DECIMAL(10,2) DEFAULT 0.00;
  DECLARE v_monthly_price DECIMAL(10,2) DEFAULT 0.00;
  DECLARE v_working_days INT DEFAULT 0;
  DECLARE v_daily_rate DECIMAL(10,2) DEFAULT 0.00;
  DECLARE v_year INT;
  DECLARE v_month INT;
  DECLARE v_day INT;
  DECLARE v_days_in_month INT;
  DECLARE v_current_date DATE;
  DECLARE v_day_of_week INT;

  -- Extract year and month
  SET v_year = CAST(SUBSTRING(p_billing_month, 1, 4) AS UNSIGNED);
  SET v_month = CAST(SUBSTRING(p_billing_month, 6, 2) AS UNSIGNED);
  SET v_days_in_month = DAY(LAST_DAY(CONCAT(p_billing_month, '-01')));

  -- Get the customer's monthly order price
  SELECT COALESCE(SUM(price), 0) INTO v_monthly_price
  FROM customer_orders
  WHERE customer_id = p_customer_id
    AND start_date <= LAST_DAY(CONCAT(p_billing_month, '-01'))
    AND end_date >= CONCAT(p_billing_month, '-01');

  -- Calculate total working days (Mon-Fri) in the month
  SET v_day = 1;
  SET v_working_days = 0;

  WHILE v_day <= v_days_in_month DO
    SET v_current_date = CONCAT(p_billing_month, '-', LPAD(v_day, 2, '0'));
    SET v_day_of_week = DAYOFWEEK(v_current_date); -- 1=Sunday, 7=Saturday

    -- Count only Mon-Fri (2-6)
    IF v_day_of_week BETWEEN 2 AND 6 THEN
      SET v_working_days = v_working_days + 1;
    END IF;

    SET v_day = v_day + 1;
  END WHILE;

  -- Calculate daily rate
  IF v_working_days > 0 AND v_monthly_price > 0 THEN
    SET v_daily_rate = v_monthly_price / v_working_days;
  END IF;

  -- Count calendar entries
  SELECT
    COALESCE(SUM(CASE WHEN status = 'T' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'A' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'E' THEN 1 ELSE 0 END), 0)
  INTO v_total_delivered, v_total_absent, v_total_extra
  FROM tiffin_calendar_entries
  WHERE customer_id = p_customer_id
    AND DATE_FORMAT(delivery_date, '%Y-%m') = p_billing_month;

  SET v_total_days = v_total_delivered + v_total_absent + v_total_extra;

  -- Calculate amounts based on new logic:
  -- Base amount = delivered days * daily rate
  -- Absent days reduce the total
  -- Extra days add additional charges from actual extra orders
  SET v_base_amount = v_total_delivered * v_daily_rate;

  -- For extra tiffins, sum up the actual prices from extra orders
  -- Get total price from all extra order entries
  SELECT COALESCE(SUM(tce.price), 0) INTO v_extra_amount
  FROM tiffin_calendar_entries tce
  INNER JOIN customer_orders co ON tce.order_id = co.id
  WHERE tce.customer_id = p_customer_id
    AND tce.status = 'E'
    AND DATE_FORMAT(tce.delivery_date, '%Y-%m') = p_billing_month;

  -- Total = base amount (delivered) + extra amount
  -- Absent days are already not counted in delivered
  SET v_total_amount = v_base_amount + v_extra_amount;

  -- Insert or update monthly billing record
  INSERT INTO monthly_billing (
    customer_id, billing_month, total_delivered, total_absent,
    total_extra, total_days, base_amount, extra_amount,
    total_amount, status, calculated_at
  ) VALUES (
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
    calculated_at = NOW();
END$$

DELIMITER ;

-- Update the calendar entry triggers to recalculate billing
DROP TRIGGER IF EXISTS trg_calendar_entry_after_insert;
DROP TRIGGER IF EXISTS trg_calendar_entry_after_update;
DROP TRIGGER IF EXISTS trg_calendar_entry_after_delete;

DELIMITER $$

CREATE TRIGGER trg_calendar_entry_after_insert
AFTER INSERT ON tiffin_calendar_entries
FOR EACH ROW
BEGIN
  DECLARE billing_month VARCHAR(7);
  SET billing_month = DATE_FORMAT(NEW.delivery_date, '%Y-%m');
  CALL sp_calculate_monthly_billing(NEW.customer_id, billing_month);
END$$

CREATE TRIGGER trg_calendar_entry_after_update
AFTER UPDATE ON tiffin_calendar_entries
FOR EACH ROW
BEGIN
  DECLARE billing_month VARCHAR(7);
  SET billing_month = DATE_FORMAT(NEW.delivery_date, '%Y-%m');
  CALL sp_calculate_monthly_billing(NEW.customer_id, billing_month);
END$$

CREATE TRIGGER trg_calendar_entry_after_delete
AFTER DELETE ON tiffin_calendar_entries
FOR EACH ROW
BEGIN
  DECLARE billing_month VARCHAR(7);
  SET billing_month = DATE_FORMAT(OLD.delivery_date, '%Y-%m');
  CALL sp_calculate_monthly_billing(OLD.customer_id, billing_month);
END$$

DELIMITER ;
