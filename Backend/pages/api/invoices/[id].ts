import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface OrderBillingDetail {
  id: number;
  order_id: number;
  billing_month: string;
  total_delivered: number;
  total_absent: number;
  total_extra: number;
  total_plan_days: number;
  base_amount: number;
  extra_amount: number;
  total_amount: number;
  meal_plan_name: string;
  order_price: number;
  start_date: string;
  end_date: string;
}

interface InvoiceDetail {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  invoice_type: 'individual' | 'combined';
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: 'unpaid' | 'partial_paid' | 'paid';
  generated_at: string;
  generated_by: string | null;
  due_date: string | null;
  notes: string | null;
  orders: OrderBillingDetail[];
  payments: PaymentRecord[];
}

interface PaymentRecord {
  id: number;
  amount_applied: number;
  applied_at: string;
  applied_by: string | null;
  payment_type: string;
  payment_source: string | null;
  reference_number: string | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any>>
) {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid invoice ID',
    });
  }

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res, id);
      case 'PUT':
        return handleUpdate(req, res, id);
      case 'DELETE':
        return handleDelete(req, res, id);
      default:
        return res.status(405).json({
          success: false,
          error: `Method ${req.method} not allowed`,
        });
    }
  } catch (error: any) {
    console.error('Invoice API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * GET /api/invoices/:id
 * Get invoice details with all linked orders and payments
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<InvoiceDetail>>,
  id: string
) {
  // Get invoice with customer details
  const invoices = await query<any[]>(
    `SELECT
      i.*,
      c.name as customer_name,
      c.phone as customer_phone,
      c.address as customer_address
    FROM invoices i
    INNER JOIN customers c ON i.customer_id = c.id
    WHERE i.id = ?`,
    [id]
  );

  if (invoices.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Invoice not found',
    });
  }

  const invoice = invoices[0];

  // Get linked order_billing records
  const orderBillings = await query<any[]>(
    `SELECT
      ob.id,
      ob.order_id,
      ob.billing_month,
      ob.total_delivered,
      ob.total_absent,
      ob.total_extra,
      ob.total_plan_days,
      ob.base_amount,
      ob.extra_amount,
      ob.total_amount,
      mp.meal_name as meal_plan_name,
      co.price as order_price,
      DATE_FORMAT(co.start_date, '%Y-%m-%d') as start_date,
      DATE_FORMAT(co.end_date, '%Y-%m-%d') as end_date
    FROM order_billing ob
    INNER JOIN customer_orders co ON ob.order_id = co.id
    INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
    WHERE ob.invoice_id = ?
    ORDER BY ob.billing_month, mp.meal_name`,
    [id]
  );

  // Get payment records
  const payments = await query<any[]>(
    `SELECT
      ip.id,
      ip.amount_applied,
      ip.applied_at,
      ip.applied_by,
      pr.payment_type,
      pr.payment_source,
      pr.reference_number
    FROM invoice_payments ip
    INNER JOIN payment_records pr ON ip.payment_record_id = pr.id
    WHERE ip.invoice_id = ?
    ORDER BY ip.applied_at DESC`,
    [id]
  );

  const response: InvoiceDetail = {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    customer_id: invoice.customer_id,
    customer_name: invoice.customer_name,
    customer_phone: invoice.customer_phone || '',
    customer_address: invoice.customer_address || '',
    invoice_type: invoice.invoice_type,
    total_amount: Number(invoice.total_amount),
    amount_paid: Number(invoice.amount_paid),
    balance_due: Number(invoice.balance_due),
    payment_status: invoice.payment_status,
    generated_at: invoice.generated_at,
    generated_by: invoice.generated_by,
    due_date: invoice.due_date,
    notes: invoice.notes,
    orders: orderBillings.map(ob => ({
      ...ob,
      base_amount: Number(ob.base_amount),
      extra_amount: Number(ob.extra_amount),
      total_amount: Number(ob.total_amount),
      order_price: Number(ob.order_price),
    })),
    payments: payments.map(p => ({
      ...p,
      amount_applied: Number(p.amount_applied),
    })),
  };

  return res.status(200).json({
    success: true,
    data: response,
  });
}

/**
 * PUT /api/invoices/:id
 * Update invoice (notes, due_date) or record payment
 */
async function handleUpdate(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any>>,
  id: string
) {
  const { action, ...data } = req.body;

  // Get current invoice
  const invoices = await query<any[]>(
    'SELECT * FROM invoices WHERE id = ?',
    [id]
  );

  if (invoices.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Invoice not found',
    });
  }

  const invoice = invoices[0];

  if (action === 'update') {
    // Update invoice metadata (notes, due_date)
    const { notes, due_date } = data;
    const updates: string[] = [];
    const params: any[] = [];

    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (due_date !== undefined) {
      updates.push('due_date = ?');
      params.push(due_date || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    params.push(id);
    await query(
      `UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return res.status(200).json({
      success: true,
      data: { message: 'Invoice updated successfully' },
    });
  }

  if (action === 'pay') {
    // Record payment against this invoice
    const { payment_record_id, amount, applied_by } = data;

    if (!payment_record_id || !amount) {
      return res.status(400).json({
        success: false,
        error: 'payment_record_id and amount are required',
      });
    }

    const paymentAmount = Number(amount);
    if (paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount must be positive',
      });
    }

    const currentBalance = Number(invoice.balance_due);
    if (paymentAmount > currentBalance) {
      return res.status(400).json({
        success: false,
        error: `Payment amount (${paymentAmount}) exceeds balance due (${currentBalance})`,
      });
    }

    // Create invoice_payment record
    await query(
      `INSERT INTO invoice_payments (invoice_id, payment_record_id, amount_applied, applied_by)
       VALUES (?, ?, ?, ?)`,
      [id, payment_record_id, paymentAmount, applied_by || null]
    );

    // Update invoice amounts
    const newAmountPaid = Number(invoice.amount_paid) + paymentAmount;
    const newBalance = Number(invoice.total_amount) - newAmountPaid;
    const newStatus = newBalance <= 0 ? 'paid' : 'partial_paid';

    await query(
      `UPDATE invoices
       SET amount_paid = ?, balance_due = ?, payment_status = ?
       WHERE id = ?`,
      [newAmountPaid, newBalance, newStatus, id]
    );

    // If fully paid, update linked order_billing and customer_orders
    if (newStatus === 'paid') {
      // Get linked order_ids
      const linkedOrders = await query<any[]>(
        'SELECT order_id FROM order_billing WHERE invoice_id = ?',
        [id]
      );

      if (linkedOrders.length > 0) {
        const orderIds = linkedOrders.map(o => o.order_id);
        const placeholders = orderIds.map(() => '?').join(', ');
        await query(
          `UPDATE customer_orders SET payment_status = 'paid' WHERE id IN (${placeholders})`,
          orderIds
        );
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        message: 'Payment recorded successfully',
        new_amount_paid: newAmountPaid,
        new_balance_due: newBalance,
        new_status: newStatus,
      },
    });
  }

  return res.status(400).json({
    success: false,
    error: 'Invalid action. Use "update" or "pay"',
  });
}

/**
 * DELETE /api/invoices/:id
 * Delete an invoice (only if unpaid)
 */
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any>>,
  id: string
) {
  // Get current invoice
  const invoices = await query<any[]>(
    'SELECT * FROM invoices WHERE id = ?',
    [id]
  );

  if (invoices.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Invoice not found',
    });
  }

  const invoice = invoices[0];

  // Only allow deletion of unpaid invoices
  if (invoice.payment_status !== 'unpaid') {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete an invoice that has received payments',
    });
  }

  // Get linked order_billing IDs before deletion
  const linkedBillings = await query<any[]>(
    'SELECT id, order_id FROM order_billing WHERE invoice_id = ?',
    [id]
  );

  // Reset order_billing records back to finalized state
  if (linkedBillings.length > 0) {
    const billingIds = linkedBillings.map(b => b.id);
    const orderIds = linkedBillings.map(b => b.order_id);

    const billingPlaceholders = billingIds.map(() => '?').join(', ');
    await query(
      `UPDATE order_billing SET invoice_id = NULL, status = 'finalized' WHERE id IN (${billingPlaceholders})`,
      billingIds
    );

    // Reset customer_orders payment_status back to pending
    const orderPlaceholders = orderIds.map(() => '?').join(', ');
    await query(
      `UPDATE customer_orders SET payment_status = 'pending' WHERE id IN (${orderPlaceholders})`,
      orderIds
    );
  }

  // Delete the invoice
  await query('DELETE FROM invoices WHERE id = ?', [id]);

  console.log(`[Invoice Delete] Deleted invoice ${invoice.invoice_number}, reset ${linkedBillings.length} order billing(s) to finalized`);

  return res.status(200).json({
    success: true,
    data: {
      message: 'Invoice deleted successfully',
      reset_billings: linkedBillings.length,
    },
  });
}
