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
  status: 'calculating' | 'finalized';
  finalized_at: string | null;
  finalized_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  customer_name?: string;
  meal_plan_name?: string;
  order_price?: number;
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

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res);
      case 'POST':
        return handleCalculate(req, res);
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
 * GET /api/order-billing
 * Get order billings for a customer and month
 * Query params: customer_id, billing_month
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<OrderBilling[]>>
) {
  const { customer_id, billing_month, order_id } = req.query;

  let sql = `
    SELECT
      ob.*,
      c.name as customer_name,
      mp.meal_name as meal_plan_name,
      co.price as order_price
    FROM order_billing ob
    INNER JOIN customers c ON ob.customer_id = c.id
    INNER JOIN customer_orders co ON ob.order_id = co.id
    INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (order_id) {
    sql += ' AND ob.order_id = ?';
    params.push(order_id);
  }

  if (customer_id) {
    sql += ' AND ob.customer_id = ?';
    params.push(customer_id);
  }

  if (billing_month) {
    sql += ' AND ob.billing_month = ?';
    params.push(billing_month);
  }

  sql += ' ORDER BY c.name ASC, mp.meal_name ASC';

  const billings = await query<OrderBilling[]>(sql, params);

  return res.status(200).json({
    success: true,
    data: billings,
  });
}

/**
 * POST /api/order-billing
 * Calculate billing for a specific order
 * Body: { order_id, billing_month }
 */
async function handleCalculate(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<OrderBilling>>
) {
  const { order_id, billing_month } = req.body;

  if (!order_id || !billing_month) {
    return res.status(400).json({
      success: false,
      error: 'order_id and billing_month are required',
    });
  }

  // Call stored procedure to calculate
  await query('CALL sp_calculate_order_billing(?, ?)', [order_id, billing_month]);

  // Fetch the calculated billing
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
      WHERE ob.order_id = ? AND ob.billing_month = ?
    `,
    [order_id, billing_month]
  );

  if (billings.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'No billing data found after calculation',
    });
  }

  return res.status(200).json({
    success: true,
    data: billings[0],
  });
}
