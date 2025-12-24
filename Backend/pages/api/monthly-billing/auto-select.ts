import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';
import { ApiResponse, MonthlyBillingWithBalance } from '../../../src/types';
import cors from '../../../src/utils/cors';

/**
 * Auto-selected invoice with allocation preview
 */
interface AutoSelectedInvoice extends MonthlyBillingWithBalance {
  selection_order: number;
  will_allocate: number;
  balance_after: number;
  will_be_paid: boolean;
}

/**
 * Auto-selection result
 */
interface AutoSelectResult {
  payment_amount: number;
  selected_invoices: AutoSelectedInvoice[];
  total_to_allocate: number;
  remaining_amount: number;
  has_excess: boolean;
}

/**
 * @api {get} /api/monthly-billing/auto-select Auto-select invoices for payment allocation
 * @apiQuery {number} customer_id - Required: Customer ID
 * @apiQuery {number} payment_amount - Required: Payment amount to allocate
 * @apiQuery {number} max_invoices - Max invoices to select (default: 3)
 * @apiDescription Returns up to 3 oldest unpaid invoices with allocation preview
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<AutoSelectResult>>
) {
  await cors(req, res);

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    const { customer_id, payment_amount, max_invoices = '3' } = req.query;

    if (!customer_id || !payment_amount) {
      return res.status(400).json({
        success: false,
        error: 'customer_id and payment_amount are required',
      });
    }

    const customerId = parseInt(customer_id as string);
    const amount = parseFloat(payment_amount as string);
    const maxInvoices = parseInt(max_invoices as string);
    const fetchLimit = Math.max(1, Math.min(maxInvoices + 5, 20)); // Limit to max 20

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'payment_amount must be a positive number',
      });
    }

    if (isNaN(customerId) || customerId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'customer_id must be a positive number',
      });
    }

    // Get all unpaid/partially paid invoices for customer, oldest first
    // Prioritize partial_paid, then finalized, ordered by billing_month
    const invoices = await query<MonthlyBillingWithBalance[]>(`
      SELECT
        mb.*,
        COALESCE(mb.amount_paid, 0) as amount_paid,
        COALESCE(mb.credit_applied, 0) as credit_applied,
        (mb.total_amount - COALESCE(mb.amount_paid, 0) - COALESCE(mb.credit_applied, 0)) as balance_due,
        COALESCE(mb.payment_count, 0) as payment_count,
        c.name as customer_name,
        c.phone as customer_phone
      FROM monthly_billing mb
      INNER JOIN customers c ON mb.customer_id = c.id
      WHERE mb.customer_id = ?
      AND mb.status IN ('finalized', 'partial_paid')
      AND (mb.total_amount - COALESCE(mb.amount_paid, 0) - COALESCE(mb.credit_applied, 0)) > 0
      ORDER BY
        CASE mb.status
          WHEN 'partial_paid' THEN 1
          ELSE 2
        END,
        mb.billing_month ASC
      LIMIT ${fetchLimit}
    `, [customerId]); // Fetch a few extra in case we need more

    // Calculate allocations
    let remainingAmount = amount;
    let selectionOrder = 1;
    const selectedInvoices: AutoSelectedInvoice[] = [];
    let totalToAllocate = 0;

    for (const invoice of invoices) {
      if (selectedInvoices.length >= maxInvoices && remainingAmount <= 0) {
        break;
      }

      const balanceDue = invoice.balance_due;
      const willAllocate = Math.min(remainingAmount, balanceDue);
      const balanceAfter = balanceDue - willAllocate;

      selectedInvoices.push({
        ...invoice,
        selection_order: selectionOrder,
        will_allocate: willAllocate,
        balance_after: balanceAfter,
        will_be_paid: balanceAfter <= 0,
      });

      totalToAllocate += willAllocate;
      remainingAmount -= willAllocate;
      selectionOrder++;

      // Stop if we've allocated everything
      if (remainingAmount <= 0) break;

      // Continue adding invoices up to maxInvoices if there's still money
      if (selectedInvoices.length >= maxInvoices) break;
    }

    // If there's still remaining amount, add more invoices if available
    if (remainingAmount > 0) {
      for (let i = selectedInvoices.length; i < invoices.length && remainingAmount > 0; i++) {
        const invoice = invoices[i];
        const balanceDue = invoice.balance_due;
        const willAllocate = Math.min(remainingAmount, balanceDue);
        const balanceAfter = balanceDue - willAllocate;

        selectedInvoices.push({
          ...invoice,
          selection_order: selectionOrder,
          will_allocate: willAllocate,
          balance_after: balanceAfter,
          will_be_paid: balanceAfter <= 0,
        });

        totalToAllocate += willAllocate;
        remainingAmount -= willAllocate;
        selectionOrder++;
      }
    }

    const result: AutoSelectResult = {
      payment_amount: amount,
      selected_invoices: selectedInvoices,
      total_to_allocate: totalToAllocate,
      remaining_amount: Math.max(0, amount - totalToAllocate),
      has_excess: amount > totalToAllocate,
    };

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error auto-selecting invoices:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to auto-select invoices',
    });
  }
}
