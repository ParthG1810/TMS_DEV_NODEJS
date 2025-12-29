import type { NextApiRequest, NextApiResponse } from 'next';
import { query, getConnection } from '../../../src/config/database';
import { ApiResponse } from '../../../src/types';
import cors from '../../../src/utils/cors';

interface AllocationRequest {
  invoice_id: number;
  amount: number;
}

interface ApplyCreditResult {
  success: boolean;
  total_applied: number;
  allocations: {
    invoice_id: number;
    amount_applied: number;
    resulting_status: string;
  }[];
  message: string;
}

/**
 * @api {post} /api/customer-credit/apply Apply customer credit to invoices
 * @apiBody {number} customer_id - Customer ID
 * @apiBody {Array<{invoice_id: number, amount: number}>} allocations - Array of allocations
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ApplyCreditResult>>
) {
  await cors(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  const connection = await getConnection();

  try {
    const { customer_id, allocations: requestedAllocations } = req.body;

    if (!customer_id) {
      return res.status(400).json({
        success: false,
        error: 'customer_id is required',
      });
    }

    if (!requestedAllocations || !Array.isArray(requestedAllocations) || requestedAllocations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'allocations array is required and must not be empty',
      });
    }

    // Calculate total requested credit
    const totalRequested = requestedAllocations.reduce((sum: number, a: AllocationRequest) => sum + (a.amount || 0), 0);

    if (totalRequested <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Total credit amount must be greater than 0',
      });
    }

    await connection.beginTransaction();

    // Get available credits for this customer (oldest first)
    const [availableCredits]: any = await connection.query(`
      SELECT id, current_balance
      FROM customer_credit
      WHERE customer_id = ?
      AND status = 'available'
      AND current_balance > 0
      ORDER BY created_at ASC
    `, [customer_id]);

    // Calculate total available credit
    const totalAvailable = availableCredits.reduce((sum: number, c: any) => sum + Number(c.current_balance), 0);

    if (totalAvailable < totalRequested) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: `Insufficient credit. Available: $${totalAvailable.toFixed(2)}, Requested: $${totalRequested.toFixed(2)}`,
      });
    }

    // Get invoice details to validate
    const invoiceIds = requestedAllocations.map((a: AllocationRequest) => a.invoice_id);
    const placeholders = invoiceIds.map(() => '?').join(',');

    const [invoices]: any = await connection.query(`
      SELECT id, customer_id, total_amount, balance_due, payment_status
      FROM invoices
      WHERE id IN (${placeholders})
      AND payment_status IN ('unpaid', 'partial_paid')
    `, invoiceIds);

    if (invoices.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: 'No valid unpaid invoices found',
      });
    }

    // Validate all invoices belong to the same customer
    const invoiceMap = new Map();
    for (const inv of invoices) {
      if (inv.customer_id !== customer_id) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: `Invoice ${inv.id} does not belong to customer ${customer_id}`,
        });
      }
      invoiceMap.set(inv.id, inv);
    }

    // Apply credit to each invoice
    const appliedAllocations: { invoice_id: number; amount_applied: number; resulting_status: string }[] = [];
    let totalApplied = 0;

    for (const allocationReq of requestedAllocations) {
      const invoice = invoiceMap.get(allocationReq.invoice_id);
      if (!invoice) continue;

      // Calculate amount to apply (can't exceed balance due)
      let creditToApply = Math.min(allocationReq.amount, Number(invoice.balance_due));
      creditToApply = Math.round(creditToApply * 100) / 100;

      if (creditToApply <= 0) continue;

      // Deduct from available credits (FIFO)
      let creditToDeduct = creditToApply;
      for (const credit of availableCredits) {
        if (creditToDeduct <= 0) break;
        if (credit.current_balance <= 0) continue;

        let deductAmount = Math.min(creditToDeduct, credit.current_balance);
        deductAmount = Math.round(deductAmount * 100) / 100;

        // Update credit record
        await connection.query(`
          UPDATE customer_credit SET
            current_balance = ROUND(current_balance - ?, 2),
            status = IF(ROUND(current_balance - ?, 2) <= 0, 'used', 'available'),
            updated_at = NOW()
          WHERE id = ?
        `, [deductAmount, deductAmount, credit.id]);

        // Record credit usage
        try {
          await connection.query(`
            INSERT INTO customer_credit_usage (credit_id, billing_id, amount_used)
            VALUES (?, ?, ?)
          `, [credit.id, allocationReq.invoice_id, deductAmount]);
        } catch (insertError: any) {
          throw insertError;
        }

        credit.current_balance -= deductAmount;
        creditToDeduct -= deductAmount;
      }

      // Update invoice
      const newBalance = Math.round((Number(invoice.balance_due) - creditToApply) * 100) / 100;
      const resultingStatus = newBalance <= 0.001 ? 'paid' : 'partial_paid';

      await connection.query(`
        UPDATE invoices SET
          amount_paid = COALESCE(amount_paid, 0) + ?,
          balance_due = ROUND(balance_due - ?, 2),
          payment_status = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [creditToApply, creditToApply, resultingStatus, allocationReq.invoice_id]);

      // Update local invoice balance for subsequent calculations
      invoice.balance_due = newBalance;

      appliedAllocations.push({
        invoice_id: allocationReq.invoice_id,
        amount_applied: creditToApply,
        resulting_status: resultingStatus,
      });

      totalApplied += creditToApply;
    }

    // Update customer_orders payment_status based on invoice payment_status
    if (invoiceIds.length > 0) {
      const invoicePlaceholders = invoiceIds.map(() => '?').join(',');

      // Get all invoice payment statuses and their linked order_ids
      const [invoiceOrders]: any = await connection.query(`
        SELECT i.id as invoice_id, i.payment_status, ob.order_id
        FROM invoices i
        INNER JOIN order_billing ob ON ob.invoice_id = i.id
        WHERE i.id IN (${invoicePlaceholders})
      `, invoiceIds);

      // Group orders by their new payment status
      const ordersByStatus: { [status: string]: number[] } = {};
      for (const row of invoiceOrders) {
        const status = row.payment_status;
        if (!ordersByStatus[status]) {
          ordersByStatus[status] = [];
        }
        ordersByStatus[status].push(row.order_id);
      }

      // Update customer_orders for each status group
      for (const [status, orderIds] of Object.entries(ordersByStatus)) {
        if (orderIds.length > 0) {
          const orderPlaceholders = orderIds.map(() => '?').join(',');
          await connection.query(`
            UPDATE customer_orders
            SET payment_status = ?
            WHERE id IN (${orderPlaceholders})
          `, [status, ...orderIds]);
        }
      }
    }

    await connection.commit();

    const result: ApplyCreditResult = {
      success: true,
      total_applied: totalApplied,
      allocations: appliedAllocations,
      message: `Successfully applied $${totalApplied.toFixed(2)} credit to ${appliedAllocations.length} invoice(s).`,
    };

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Error applying customer credit:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to apply customer credit',
    });
  } finally {
    connection.release();
  }
}
