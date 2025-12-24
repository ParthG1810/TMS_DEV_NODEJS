import type { NextApiRequest, NextApiResponse } from 'next';
import { query, getConnection } from '../../../../src/config/database';
import { ApiResponse, PaymentRecordWithDetails } from '../../../../src/types';
import cors from '../../../../src/utils/cors';
import { markTransactionAllocated } from '../../../../src/services/interacScanner';

/**
 * Allocation result
 */
interface AllocationResult {
  success: boolean;
  payment_record_id: number;
  total_allocated: number;
  credit_applied: number;
  excess_amount: number;
  allocation_status: string;
  message: string;
  allocations: {
    billing_id: number;
    allocated_amount: number;
    resulting_status: string;
  }[];
}

/**
 * @api {post} /api/payment-records/:id/allocate Allocate payment to invoices
 * @apiBody {Array<{invoice_id: number, amount: number}>} allocations - Array of allocations with custom amounts
 * @apiBody {number} [created_by] - User ID who performed allocation
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<AllocationResult>>
) {
  await cors(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      error: 'Payment record ID is required',
    });
  }

  const paymentId = parseInt(id);
  const connection = await getConnection();

  try {
    const { allocations: requestedAllocations, billing_ids, created_by, credit_to_apply } = req.body;

    // Support both new format (allocations) and legacy format (billing_ids)
    let allocationRequests: { invoice_id: number; amount: number }[] = [];

    if (requestedAllocations && Array.isArray(requestedAllocations) && requestedAllocations.length > 0) {
      // New format: { invoice_id, amount }[]
      allocationRequests = requestedAllocations;
    } else if (billing_ids && Array.isArray(billing_ids) && billing_ids.length > 0) {
      // Legacy format: just invoice IDs, amounts will be calculated automatically
      allocationRequests = billing_ids.map((id: number) => ({ invoice_id: id, amount: null }));
    } else {
      return res.status(400).json({
        success: false,
        error: 'allocations array is required and must not be empty',
      });
    }

    await connection.beginTransaction();

    // Verify payment record exists and is not already fully allocated
    const [payments]: any = await connection.query(`
      SELECT * FROM payment_records
      WHERE id = ? AND deleted_flag = 0
    `, [paymentId]);

    if (payments.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: 'Payment record not found',
      });
    }

    const payment = payments[0];

    if (payment.allocation_status === 'fully_allocated') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: 'Payment is already fully allocated',
      });
    }

    // Extract invoice IDs for query
    const invoiceIds = allocationRequests.map(a => a.invoice_id);
    const placeholders = invoiceIds.map(() => '?').join(',');
    const [billings]: any = await connection.query(`
      SELECT id, customer_id, total_amount,
             COALESCE(amount_paid, 0) as amount_paid,
             balance_due,
             payment_status as status
      FROM invoices
      WHERE id IN (${placeholders})
      AND payment_status IN ('unpaid', 'partial_paid')
    `, invoiceIds);

    if (billings.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: 'No valid invoices found for allocation',
      });
    }

    // Build billing map for quick lookup
    const billingMap = new Map();
    billings.forEach((b: any) => billingMap.set(b.id, b));

    // Process allocations using custom amounts
    let remainingAmount = payment.amount - (payment.total_allocated || 0);
    let allocationOrder = 1;
    const allocations: any[] = [];

    for (const allocationReq of allocationRequests) {
      if (remainingAmount <= 0) break;

      const billing = billingMap.get(allocationReq.invoice_id);
      if (!billing || billing.balance_due <= 0) continue;

      // Use custom amount if provided, otherwise use minimum of remaining and balance
      let allocateAmount: number;
      if (allocationReq.amount !== null && allocationReq.amount !== undefined) {
        // Custom amount: validate it doesn't exceed balance or remaining payment
        allocateAmount = Math.min(allocationReq.amount, billing.balance_due, remainingAmount);
      } else {
        // Auto-calculate: allocate as much as possible
        allocateAmount = Math.min(remainingAmount, billing.balance_due);
      }

      if (allocateAmount <= 0) continue;

      const invoiceId = allocationReq.invoice_id;

      // Insert allocation record (billing_id column stores invoice ID)
      await connection.query(`
        INSERT INTO payment_allocations (
          payment_record_id, billing_id, customer_id,
          allocation_order, allocated_amount,
          invoice_balance_before, invoice_balance_after,
          resulting_status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        paymentId,
        invoiceId,
        billing.customer_id,
        allocationOrder,
        allocateAmount,
        billing.balance_due,
        billing.balance_due - allocateAmount,
        billing.balance_due - allocateAmount <= 0 ? 'paid' : 'partial_paid',
        created_by || null,
      ]);

      // Update invoice record
      await connection.query(`
        UPDATE invoices SET
          amount_paid = COALESCE(amount_paid, 0) + ?,
          balance_due = balance_due - ?,
          payment_status = IF((balance_due - ?) <= 0, 'paid', 'partial_paid'),
          updated_at = NOW()
        WHERE id = ?
      `, [allocateAmount, allocateAmount, allocateAmount, invoiceId]);

      allocations.push({
        billing_id: invoiceId,
        allocated_amount: allocateAmount,
        resulting_status: billing.balance_due - allocateAmount <= 0 ? 'paid' : 'partial_paid',
      });

      remainingAmount -= allocateAmount;
      allocationOrder++;
    }

    // Apply customer credit if requested
    let creditApplied = 0;
    if (credit_to_apply && credit_to_apply > 0) {
      // Get available credits for this customer (oldest first)
      const [availableCredits]: any = await connection.query(`
        SELECT id, current_balance
        FROM customer_credit
        WHERE customer_id = ?
        AND status = 'available'
        AND current_balance > 0
        ORDER BY created_at ASC
      `, [payment.customer_id]);

      let remainingCreditToApply = credit_to_apply;

      // Apply credit to invoices that still have balance after payment allocation
      for (const allocationReq of allocationRequests) {
        if (remainingCreditToApply <= 0) break;

        const billing = billingMap.get(allocationReq.invoice_id);
        if (!billing) continue;

        // Calculate remaining balance after payment allocation
        const paymentAllocation = allocations.find(a => a.billing_id === allocationReq.invoice_id);
        const balanceAfterPayment = billing.balance_due - (paymentAllocation?.allocated_amount || 0);

        if (balanceAfterPayment <= 0) continue;

        // Apply credit to this invoice
        const creditForThisInvoice = Math.min(remainingCreditToApply, balanceAfterPayment);

        // Deduct from available credits
        let creditToDeduct = creditForThisInvoice;
        for (const credit of availableCredits) {
          if (creditToDeduct <= 0) break;
          if (credit.current_balance <= 0) continue;

          const deductAmount = Math.min(creditToDeduct, credit.current_balance);

          // Update credit record
          await connection.query(`
            UPDATE customer_credit SET
              current_balance = current_balance - ?,
              status = IF(current_balance - ? <= 0, 'used', 'available'),
              updated_at = NOW()
            WHERE id = ?
          `, [deductAmount, deductAmount, credit.id]);

          // Record credit usage (use invoices table ID)
          await connection.query(`
            INSERT INTO customer_credit_usage (credit_id, billing_id, amount_used)
            VALUES (?, ?, ?)
          `, [credit.id, allocationReq.invoice_id, deductAmount]);

          credit.current_balance -= deductAmount;
          creditToDeduct -= deductAmount;
        }

        // Update invoice with credit applied
        await connection.query(`
          UPDATE invoices SET
            amount_paid = COALESCE(amount_paid, 0) + ?,
            balance_due = balance_due - ?,
            payment_status = IF((balance_due - ?) <= 0, 'paid', 'partial_paid'),
            updated_at = NOW()
          WHERE id = ?
        `, [creditForThisInvoice, creditForThisInvoice, creditForThisInvoice, allocationReq.invoice_id]);

        creditApplied += creditForThisInvoice;
        remainingCreditToApply -= creditForThisInvoice;
      }
    }

    // Calculate totals
    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated_amount, 0) + (payment.total_allocated || 0);
    const excessAmount = payment.amount - totalAllocated;
    let allocationStatus = 'fully_allocated';

    // Handle excess payment
    if (excessAmount > 0) {
      allocationStatus = 'has_excess';

      // Create customer credit record
      await connection.query(`
        INSERT INTO customer_credit (
          customer_id, payment_record_id,
          original_amount, current_balance,
          status, notes
        ) VALUES (?, ?, ?, ?, 'available', 'Auto-created from excess payment')
      `, [payment.customer_id, paymentId, excessAmount, excessAmount]);

      const [creditResult]: any = await connection.query('SELECT LAST_INSERT_ID() as id');

      // Create notification for excess payment (use payment_received if excess_payment not in ENUM)
      try {
        await connection.query(`
          INSERT INTO payment_notifications (
            customer_id, notification_type, title, message,
            priority, action_url, billing_id
          ) VALUES (?, 'payment_received', ?, ?, 'medium', ?, ?)
        `, [
          payment.customer_id,
          `Excess Payment: $${excessAmount.toFixed(2)}`,
          `Customer has $${excessAmount.toFixed(2)} credit available from payment. Consider refund if needed.`,
          `/dashboard/payments/credit/${creditResult[0].id}`,
          paymentId,
        ]);
      } catch (notifError) {
        console.log('Note: Could not create excess payment notification', notifError);
      }
    }

    // Update payment record
    await connection.query(`
      UPDATE payment_records SET
        total_allocated = ?,
        excess_amount = ?,
        allocation_status = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [totalAllocated, excessAmount, allocationStatus, paymentId]);

    // If this payment came from an Interac transaction, mark it as allocated
    if (payment.interac_transaction_id) {
      await markTransactionAllocated(payment.interac_transaction_id);
    }

    // Dismiss any pending interac_received notifications for this customer
    // Note: This dismisses by customer_id since related_payment_id column may not exist
    if (payment.customer_id) {
      try {
        await connection.query(`
          UPDATE payment_notifications SET
            is_dismissed = 1,
            dismissed_at = NOW()
          WHERE customer_id = ?
            AND notification_type = 'interac_received'
            AND is_dismissed = 0
        `, [payment.customer_id]);
      } catch (dismissError) {
        console.log('Note: Could not dismiss interac notifications', dismissError);
      }
    }

    await connection.commit();

    let message = `Successfully allocated $${totalAllocated.toFixed(2)} to ${allocations.length} invoice(s).`;
    if (creditApplied > 0) {
      message += ` Applied $${creditApplied.toFixed(2)} from credit.`;
    }
    if (excessAmount > 0) {
      message = `Allocated $${totalAllocated.toFixed(2)}. Excess $${excessAmount.toFixed(2)} saved as credit.`;
    }

    const result: AllocationResult = {
      success: true,
      payment_record_id: paymentId,
      total_allocated: totalAllocated,
      credit_applied: creditApplied,
      excess_amount: excessAmount,
      allocation_status: allocationStatus,
      message,
      allocations,
    };

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Error allocating payment:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to allocate payment',
    });
  } finally {
    connection.release();
  }
}
