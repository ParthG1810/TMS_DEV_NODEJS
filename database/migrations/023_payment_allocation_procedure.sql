-- Migration: 023_payment_allocation_procedure.sql
-- Description: Add stored procedure for payment allocation
-- Date: 2025-12-13

-- =====================================================
-- Stored Procedure: Allocate Payment to Invoices
-- =====================================================
-- Allocates payment to invoices in specified order
-- Handles excess payments by creating customer credit

DELIMITER //

DROP PROCEDURE IF EXISTS sp_allocate_payment//

CREATE PROCEDURE sp_allocate_payment(
    IN p_payment_record_id INT,
    IN p_billing_ids TEXT,           -- Comma-separated billing IDs in order: "1,2,3"
    IN p_created_by INT,
    OUT p_excess_amount DECIMAL(10,2),
    OUT p_result_message VARCHAR(255)
)
BEGIN
    DECLARE v_payment_amount DECIMAL(10,2);
    DECLARE v_remaining_amount DECIMAL(10,2);
    DECLARE v_billing_id INT;
    DECLARE v_balance_due DECIMAL(10,2);
    DECLARE v_allocate_amount DECIMAL(10,2);
    DECLARE v_order INT DEFAULT 1;
    DECLARE v_customer_id INT;
    DECLARE v_credit_id INT;
    DECLARE v_total_allocated DECIMAL(10,2) DEFAULT 0;
    DECLARE v_ids_remaining TEXT;
    DECLARE v_current_id VARCHAR(20);
    DECLARE v_comma_pos INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_result_message = 'Error occurred during allocation';
        SET p_excess_amount = 0;
    END;

    -- Start transaction
    START TRANSACTION;

    -- Get payment amount and customer
    SELECT amount, customer_id INTO v_payment_amount, v_customer_id
    FROM payment_records
    WHERE id = p_payment_record_id AND deleted_flag = 0;

    IF v_payment_amount IS NULL THEN
        SET p_result_message = 'Payment record not found';
        SET p_excess_amount = 0;
        ROLLBACK;
    ELSE
        SET v_remaining_amount = v_payment_amount;
        SET v_ids_remaining = p_billing_ids;

        -- Process each billing ID in order
        WHILE v_remaining_amount > 0 AND LENGTH(v_ids_remaining) > 0 DO
            -- Get next billing ID from comma-separated list
            SET v_comma_pos = LOCATE(',', v_ids_remaining);
            IF v_comma_pos > 0 THEN
                SET v_current_id = SUBSTRING(v_ids_remaining, 1, v_comma_pos - 1);
                SET v_ids_remaining = SUBSTRING(v_ids_remaining, v_comma_pos + 1);
            ELSE
                SET v_current_id = v_ids_remaining;
                SET v_ids_remaining = '';
            END IF;

            SET v_billing_id = CAST(v_current_id AS UNSIGNED);

            IF v_billing_id > 0 THEN
                -- Get billing balance (computed from total_amount - amount_paid - credit_applied)
                SELECT
                    (total_amount - COALESCE(amount_paid, 0) - COALESCE(credit_applied, 0)),
                    customer_id
                INTO v_balance_due, v_customer_id
                FROM monthly_billing
                WHERE id = v_billing_id AND status IN ('finalized', 'partial_paid');

                IF v_balance_due IS NOT NULL AND v_balance_due > 0 THEN
                    -- Calculate allocation amount
                    SET v_allocate_amount = LEAST(v_remaining_amount, v_balance_due);

                    -- Create allocation record
                    INSERT INTO payment_allocations (
                        payment_record_id, billing_id, customer_id,
                        allocation_order, allocated_amount,
                        invoice_balance_before, invoice_balance_after,
                        resulting_status, created_by
                    ) VALUES (
                        p_payment_record_id, v_billing_id, v_customer_id,
                        v_order, v_allocate_amount,
                        v_balance_due, v_balance_due - v_allocate_amount,
                        IF(v_balance_due - v_allocate_amount <= 0, 'paid', 'partial_paid'),
                        p_created_by
                    );

                    -- Update billing record
                    UPDATE monthly_billing SET
                        amount_paid = COALESCE(amount_paid, 0) + v_allocate_amount,
                        status = IF((total_amount - COALESCE(amount_paid, 0) - v_allocate_amount - COALESCE(credit_applied, 0)) <= 0, 'paid', 'partial_paid'),
                        last_payment_date = CURDATE(),
                        payment_count = COALESCE(payment_count, 0) + 1,
                        updated_at = NOW()
                    WHERE id = v_billing_id;

                    SET v_remaining_amount = v_remaining_amount - v_allocate_amount;
                    SET v_total_allocated = v_total_allocated + v_allocate_amount;
                    SET v_order = v_order + 1;
                END IF;
            END IF;
        END WHILE;

        -- Handle excess payment
        SET p_excess_amount = v_remaining_amount;

        IF v_remaining_amount > 0 THEN
            -- Create customer credit record
            INSERT INTO customer_credit (
                customer_id, payment_record_id,
                original_amount, current_balance,
                status, notes
            ) VALUES (
                v_customer_id, p_payment_record_id,
                v_remaining_amount, v_remaining_amount,
                'available', 'Auto-created from excess payment'
            );

            SET v_credit_id = LAST_INSERT_ID();

            -- Update payment record with excess info
            UPDATE payment_records SET
                total_allocated = v_total_allocated,
                excess_amount = v_remaining_amount,
                allocation_status = 'has_excess',
                updated_at = NOW()
            WHERE id = p_payment_record_id;

            -- Create notification for excess payment
            INSERT INTO payment_notifications (
                customer_id, notification_type,
                title, message, priority, action_url,
                related_payment_id, auto_delete_on_action
            ) VALUES (
                v_customer_id, 'excess_payment',
                'Excess Payment Recorded',
                CONCAT('Customer has $', v_remaining_amount, ' credit available. Consider refund if needed.'),
                'medium',
                CONCAT('/dashboard/payments/credit/', v_credit_id),
                p_payment_record_id, 1
            );

            SET p_result_message = CONCAT('Allocated $', v_total_allocated, '. Excess $', v_remaining_amount, ' added as credit.');
        ELSE
            -- Update payment record as fully allocated
            UPDATE payment_records SET
                total_allocated = v_total_allocated,
                excess_amount = 0,
                allocation_status = 'fully_allocated',
                updated_at = NOW()
            WHERE id = p_payment_record_id;

            SET p_result_message = CONCAT('Successfully allocated $', v_total_allocated, ' to ', v_order - 1, ' invoice(s).');
        END IF;

        COMMIT;
    END IF;
END//

DELIMITER ;

-- =====================================================
-- Stored Procedure: Reverse Payment Allocation
-- =====================================================
-- Reverses a payment allocation (used when soft-deleting payments)

DELIMITER //

DROP PROCEDURE IF EXISTS sp_reverse_payment_allocation//

CREATE PROCEDURE sp_reverse_payment_allocation(
    IN p_payment_record_id INT,
    IN p_deleted_by INT,
    OUT p_result_message VARCHAR(255)
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_allocation_id INT;
    DECLARE v_billing_id INT;
    DECLARE v_allocated_amount DECIMAL(10,2);

    DECLARE allocation_cursor CURSOR FOR
        SELECT id, billing_id, allocated_amount
        FROM payment_allocations
        WHERE payment_record_id = p_payment_record_id AND deleted_flag = 0;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_result_message = 'Error occurred during reversal';
    END;

    START TRANSACTION;

    OPEN allocation_cursor;

    read_loop: LOOP
        FETCH allocation_cursor INTO v_allocation_id, v_billing_id, v_allocated_amount;
        IF done THEN
            LEAVE read_loop;
        END IF;

        -- Reverse the billing update
        UPDATE monthly_billing SET
            amount_paid = GREATEST(0, COALESCE(amount_paid, 0) - v_allocated_amount),
            payment_count = GREATEST(0, COALESCE(payment_count, 0) - 1),
            status = IF((total_amount - COALESCE(amount_paid, 0) + v_allocated_amount - COALESCE(credit_applied, 0)) > 0,
                       IF(COALESCE(amount_paid, 0) - v_allocated_amount > 0, 'partial_paid', 'finalized'),
                       'paid'),
            updated_at = NOW()
        WHERE id = v_billing_id;

        -- Soft delete the allocation
        UPDATE payment_allocations SET
            deleted_flag = 1,
            deleted_at = NOW(),
            deleted_by = p_deleted_by
        WHERE id = v_allocation_id;
    END LOOP;

    CLOSE allocation_cursor;

    -- Also handle any customer credit that was created
    UPDATE customer_credit SET
        status = 'expired',
        notes = CONCAT(COALESCE(notes, ''), ' - Reversed due to payment deletion'),
        updated_at = NOW()
    WHERE payment_record_id = p_payment_record_id AND status = 'available';

    SET p_result_message = 'Payment allocation reversed successfully';

    COMMIT;
END//

DELIMITER ;

-- =====================================================
-- Rollback Script
-- =====================================================
-- DROP PROCEDURE IF EXISTS sp_reverse_payment_allocation;
-- DROP PROCEDURE IF EXISTS sp_allocate_payment;
