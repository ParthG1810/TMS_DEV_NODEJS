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
  status: 'calculating' | 'finalized';
}

interface CombinedInvoice {
  customer_id: number;
  customer_name: string;
  billing_month: string;
  orders: OrderBilling[];
  all_finalized: boolean;
  grand_total: number;
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

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    const { order_id, billing_month, finalized_by } = req.body;

    // Validate required parameters
    if (!order_id || !billing_month) {
      return res.status(400).json({
        success: false,
        error: 'order_id and billing_month are required',
      });
    }

    // Ensure order_id is a valid positive number
    const orderIdNum = Number(order_id);
    if (!orderIdNum || orderIdNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order_id - must be a positive number',
      });
    }

    // Validate billing_month format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(billing_month)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid billing_month format - must be YYYY-MM',
      });
    }

    console.log(`[Finalize] Processing order_id=${orderIdNum}, billing_month=${billing_month}`);

    // First, ensure the order billing record exists (calculate if needed)
    await query('CALL sp_calculate_order_billing(?, ?)', [orderIdNum, billing_month]);

    // Get the order billing record
    const billings = await query<any[]>(
      `SELECT ob.*, co.customer_id
       FROM order_billing ob
       INNER JOIN customer_orders co ON ob.order_id = co.id
       WHERE ob.order_id = ? AND ob.billing_month = ?`,
      [orderIdNum, billing_month]
    );

    if (billings.length === 0) {
      console.log(`[Finalize] No billing record found for order_id=${orderIdNum}, billing_month=${billing_month}`);
      return res.status(404).json({
        success: false,
        error: 'Order billing not found',
      });
    }

    const billing = billings[0];
    console.log(`[Finalize] Found billing record: id=${billing.id}, customer_id=${billing.customer_id}, current_status=${billing.status}`);

    // Check if already finalized
    if (billing.status === 'finalized') {
      console.log(`[Finalize] Order already finalized at ${billing.finalized_at}`);
      return res.status(400).json({
        success: false,
        error: 'This order billing is already finalized',
      });
    }

    // Finalize ONLY this specific order's billing
    const updateResult = await query(
      `UPDATE order_billing
       SET status = 'finalized', finalized_at = NOW(), finalized_by = ?
       WHERE order_id = ? AND billing_month = ? AND id = ?`,
      [finalized_by || 'admin', orderIdNum, billing_month, billing.id]
    );

    console.log(`[Finalize] Updated ${(updateResult as any).affectedRows} row(s) to finalized status`);

    // Check if all orders for this customer are now finalized
    const customerOrders = await query<any[]>(
      `SELECT co.id as order_id, ob.status
       FROM customer_orders co
       LEFT JOIN order_billing ob ON co.id = ob.order_id AND ob.billing_month = ?
       WHERE co.customer_id = ?
       AND co.start_date <= LAST_DAY(CONCAT(?, '-01'))
       AND co.end_date >= CONCAT(?, '-01')
       AND (co.parent_order_id IS NULL OR co.parent_order_id = 0)`,
      [billing_month, billing.customer_id, billing_month, billing_month]
    );

    const allFinalized = customerOrders.every(o => o.status === 'finalized');

    // Get updated billing details
    const updatedBillings = await query<any[]>(
      `SELECT
        ob.*,
        c.name as customer_name,
        mp.meal_name as meal_plan_name,
        co.price as order_price
      FROM order_billing ob
      INNER JOIN customers c ON ob.customer_id = c.id
      INNER JOIN customer_orders co ON ob.order_id = co.id
      INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
      WHERE ob.order_id = ? AND ob.billing_month = ?`,
      [orderIdNum, billing_month]
    );

    const finalizedCount = customerOrders.filter(o => o.status === 'finalized').length;

    console.log(`[Finalize] Summary: ${finalizedCount}/${customerOrders.length} orders finalized for customer ${billing.customer_id}`);

    return res.status(200).json({
      success: true,
      data: {
        order_billing: updatedBillings[0],
        all_orders_finalized: allFinalized,
        total_orders: customerOrders.length,
        finalized_orders: finalizedCount,
      },
    });
  } catch (error: any) {
    console.error('Error finalizing order billing:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to finalize order billing',
    });
  }
}
