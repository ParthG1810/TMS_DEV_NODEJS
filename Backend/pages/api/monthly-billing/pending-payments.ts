import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';
import { ApiResponse, MonthlyBillingWithBalance } from '../../../src/types';
import cors from '../../../src/utils/cors';

/**
 * @api {get} /api/monthly-billing/pending-payments Get invoices awaiting payment
 * @apiQuery {number} customer_id - Filter by customer (optional)
 * @apiQuery {number} limit - Max number of results (default: 50)
 * @apiDescription Returns invoices with status 'finalized' or 'partial_paid' that have outstanding balance
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<MonthlyBillingWithBalance[]>>
) {
  await cors(req, res);

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    const { customer_id, limit = '50' } = req.query;

    let sql = `
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
      WHERE mb.status IN ('finalized', 'partial_paid')
      AND (mb.total_amount - COALESCE(mb.amount_paid, 0) - COALESCE(mb.credit_applied, 0)) > 0
    `;

    const params: any[] = [];

    if (customer_id) {
      sql += ' AND mb.customer_id = ?';
      params.push(customer_id);
    }

    // Order by partial_paid first, then by oldest month
    sql += `
      ORDER BY
        CASE mb.status
          WHEN 'partial_paid' THEN 1
          ELSE 2
        END,
        mb.billing_month ASC
      LIMIT ?
    `;
    params.push(parseInt(limit as string));

    const invoices = await query<MonthlyBillingWithBalance[]>(sql, params);

    return res.status(200).json({
      success: true,
      data: invoices,
    });
  } catch (error: any) {
    console.error('Error fetching pending payment invoices:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch pending payment invoices',
    });
  }
}
