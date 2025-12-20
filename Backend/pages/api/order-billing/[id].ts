import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface OrderBilling {
  id: number;
  order_id: number;
  customer_id: number;
  billing_month: string;
  total_delivered: number;
  total_absent: number;
  total_extra: number;
  total_plan_days: number;
  base_amount: number;
  extra_amount: number;
  total_amount: number;
  status: 'calculating' | 'finalized' | 'approved' | 'invoiced';
  finalized_at: string | null;
  finalized_by: string | null;
  invoice_id: number | null;
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
      error: 'Invalid order billing ID',
    });
  }

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res, id);
      case 'PUT':
        return handleUpdate(req, res, id);
      default:
        return res.status(405).json({
          success: false,
          error: `Method ${req.method} not allowed`,
        });
    }
  } catch (error: any) {
    console.error('Order billing API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * GET /api/order-billing/:id
 * Get a single order billing record
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<OrderBilling>>,
  id: string
) {
  const billings = await query<OrderBilling[]>(
    `
      SELECT
        ob.*,
        c.name as customer_name,
        mp.meal_name as meal_plan_name,
        co.price as order_price
      FROM order_billing ob
      INNER JOIN customers c ON ob.customer_id = c.id
      INNER JOIN customer_orders co ON ob.order_id = co.id
      INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
      WHERE ob.id = ?
    `,
    [id]
  );

  if (billings.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Order billing not found',
    });
  }

  return res.status(200).json({
    success: true,
    data: billings[0],
  });
}

/**
 * PUT /api/order-billing/:id
 * Update order billing (mainly for finalization)
 * Body: { status, finalized_by }
 */
async function handleUpdate(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<OrderBilling>>,
  id: string
) {
  const { status, finalized_by } = req.body;

  // Validate status
  if (status && !['calculating', 'finalized', 'approved', 'invoiced'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status. Must be "calculating", "finalized", "approved", or "invoiced"',
    });
  }

  // Get current billing record
  const currentBillings = await query<OrderBilling[]>(
    'SELECT * FROM order_billing WHERE id = ?',
    [id]
  );

  if (currentBillings.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Order billing not found',
    });
  }

  const currentBilling = currentBillings[0];

  // Check if trying to change status from invoiced or to calculating when has invoice
  if (currentBilling.status === 'invoiced') {
    return res.status(400).json({
      success: false,
      error: 'Cannot modify an order billing that has an invoice. Delete the invoice first.',
    });
  }

  if (currentBilling.invoice_id && status === 'calculating') {
    return res.status(400).json({
      success: false,
      error: 'Cannot reject an order billing that has an invoice. Delete the invoice first.',
    });
  }

  // Build update query
  const updates: string[] = [];
  const params: any[] = [];

  if (status) {
    updates.push('status = ?');
    params.push(status);

    if (status === 'finalized') {
      updates.push('finalized_at = NOW()');
      if (finalized_by) {
        updates.push('finalized_by = ?');
        params.push(finalized_by);
      }
    } else if (status === 'approved') {
      // Keep finalized_at but update finalized_by if provided
      if (finalized_by) {
        updates.push('finalized_by = ?');
        params.push(finalized_by);
      }
    } else if (status === 'calculating') {
      updates.push('finalized_at = NULL');
      updates.push('finalized_by = NULL');
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No valid fields to update',
    });
  }

  params.push(id);
  await query(
    `UPDATE order_billing SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  // Update customer_orders payment_status based on new status
  if (status === 'calculating') {
    // Rejected - set order back to calculating
    await query(
      `UPDATE customer_orders SET payment_status = 'calculating' WHERE id = ?`,
      [currentBilling.order_id]
    );
  } else if (status === 'finalized') {
    // Finalized - set order to pending
    await query(
      `UPDATE customer_orders SET payment_status = 'pending' WHERE id = ?`,
      [currentBilling.order_id]
    );
  } else if (status === 'approved') {
    // Approved - set order to approved
    await query(
      `UPDATE customer_orders SET payment_status = 'approved' WHERE id = ?`,
      [currentBilling.order_id]
    );

    // Create notification for approval
    try {
      // Get customer details for notification
      const customerDetails = await query<any[]>(
        `SELECT c.name, c.id as customer_id, ob.billing_month, ob.total_amount
         FROM order_billing ob
         INNER JOIN customers c ON ob.customer_id = c.id
         WHERE ob.id = ?`,
        [id]
      );

      if (customerDetails.length > 0) {
        const customer = customerDetails[0];

        // Delete any existing pending approval notifications for this order billing
        await query(
          `DELETE FROM payment_notifications
           WHERE order_billing_id = ? AND notification_type IN ('billing_pending_approval', 'order_approved')`,
          [id]
        );

        // Create new approval notification (using order_billing_id, not billing_id)
        await query(
          `INSERT INTO payment_notifications (
            notification_type, order_billing_id, customer_id, billing_month,
            title, message, priority, action_url
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'order_approved',
            id,
            customer.customer_id,
            customer.billing_month,
            `Order Approved - ${customer.name}`,
            `Order billing for ${customer.name} (${customer.billing_month}) has been approved. Total amount: CAD $${Number(customer.total_amount).toFixed(2)}. Ready for invoice generation.`,
            'medium',
            `/dashboard/tiffin/order-invoice-details?orderId=${currentBilling.order_id}&month=${customer.billing_month}`,
          ]
        );
      }
    } catch (notificationError) {
      // Log but don't fail the request if notification creation fails
      console.error('Error creating approval notification:', notificationError);
    }
  }

  // Fetch updated record
  const updatedBillings = await query<OrderBilling[]>(
    `
      SELECT
        ob.*,
        c.name as customer_name,
        mp.meal_name as meal_plan_name,
        co.price as order_price
      FROM order_billing ob
      INNER JOIN customers c ON ob.customer_id = c.id
      INNER JOIN customer_orders co ON ob.order_id = co.id
      INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
      WHERE ob.id = ?
    `,
    [id]
  );

  return res.status(200).json({
    success: true,
    data: updatedBillings[0],
  });
}
