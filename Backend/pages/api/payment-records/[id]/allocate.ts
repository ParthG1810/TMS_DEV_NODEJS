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
 * @apiBody {number[]} billing_ids - Array of billing IDs in allocation order
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
    const { billing_ids, created_by } = req.body;

    if (!billing_ids || !Array.isArray(billing_ids) || billing_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'billing_ids array is required and must not be empty',
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

    // Verify all billing IDs exist and are valid
    const placeholders = billing_ids.map(() => '?').join(',');
    const [billings]: any = await connection.query(`
      SELECT id, customer_id, total_amount,
             COALESCE(amount_paid, 0) as amount_paid,
             COALESCE(credit_applied, 0) as credit_applied,
             (total_amount - COALESCE(amount_paid, 0) - COALESCE(credit_applied, 0)) as balance_due,
             status
      FROM monthly_billing
      WHERE id IN (${placeholders})
      AND status IN ('finalized', 'partial_paid')
    `, billing_ids);

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

    // Process allocations
    let remainingAmount = payment.amount - (payment.total_allocated || 0);
    let allocationOrder = 1;
    const allocations: any[] = [];

    for (const billingId of billing_ids) {
      if (remainingAmount <= 0) break;

      const billing = billingMap.get(billingId);
      if (!billing || billing.balance_due <= 0) continue;

      const allocateAmount = Math.min(remainingAmount, billing.balance_due);

      // Insert allocation record
      await connection.query(`
        INSERT INTO payment_allocations (
          payment_record_id, billing_id, customer_id,
          allocation_order, allocated_amount,
          invoice_balance_before, invoice_balance_after,
          resulting_status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        paymentId,
        billingId,
        billing.customer_id,
        allocationOrder,
        allocateAmount,
        billing.balance_due,
        billing.balance_due - allocateAmount,
        billing.balance_due - allocateAmount <= 0 ? 'paid' : 'partial_paid',
        created_by || null,
      ]);

      // Update billing record
      await connection.query(`
        UPDATE monthly_billing SET
          amount_paid = COALESCE(amount_paid, 0) + ?,
          status = IF((total_amount - COALESCE(amount_paid, 0) - ? - COALESCE(credit_applied, 0)) <= 0, 'paid', 'partial_paid'),
          last_payment_date = CURDATE(),
          payment_count = COALESCE(payment_count, 0) + 1,
          updated_at = NOW()
        WHERE id = ?
      `, [allocateAmount, allocateAmount, billingId]);

      allocations.push({
        billing_id: billingId,
        allocated_amount: allocateAmount,
        resulting_status: billing.balance_due - allocateAmount <= 0 ? 'paid' : 'partial_paid',
      });

      remainingAmount -= allocateAmount;
      allocationOrder++;
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

      // Create notification for excess payment
      await connection.query(`
        INSERT INTO payment_notifications (
          customer_id, notification_type, title, message,
          priority, action_url, related_payment_id, auto_delete_on_action
        ) VALUES (?, 'excess_payment', ?, ?, 'medium', ?, ?, 1)
      `, [
        payment.customer_id,
        `Excess Payment: $${excessAmount.toFixed(2)}`,
        `Customer has $${excessAmount.toFixed(2)} credit available from payment. Consider refund if needed.`,
        `/dashboard/payments/credit/${creditResult[0].id}`,
        paymentId,
      ]);
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

    // Delete related 'interac_received' notifications
    await connection.query(`
      UPDATE payment_notifications SET
        is_dismissed = 1,
        dismissed_at = NOW()
      WHERE related_payment_id = ? AND notification_type = 'interac_received'
    `, [paymentId]);

    await connection.commit();

    const result: AllocationResult = {
      success: true,
      payment_record_id: paymentId,
      total_allocated: totalAllocated,
      excess_amount: excessAmount,
      allocation_status: allocationStatus,
      message: excessAmount > 0
        ? `Allocated $${totalAllocated.toFixed(2)}. Excess $${excessAmount.toFixed(2)} saved as credit.`
        : `Successfully allocated $${totalAllocated.toFixed(2)} to ${allocations.length} invoice(s).`,
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
