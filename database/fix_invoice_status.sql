-- Fix inconsistent invoice payment_status
-- Run this query to correct invoices that show 'paid' but still have a balance
UPDATE invoices 
SET payment_status = CASE 
    WHEN ROUND(balance_due, 2) <= 0 THEN 'paid'
    WHEN ROUND(balance_due, 2) > 0 AND ROUND(balance_due, 2) < ROUND(total_amount, 2) THEN 'partial_paid'
    ELSE 'unpaid'
END
WHERE payment_status = 'paid' AND ROUND(balance_due, 2) > 0;

-- Verify the fix
SELECT id, invoice_number, total_amount, amount_paid, balance_due, payment_status 
FROM invoices 
WHERE balance_due > 0;
