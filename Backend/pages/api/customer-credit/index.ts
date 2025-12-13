import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';
import { ApiResponse, CustomerCreditWithDetails } from '../../../src/types';
import cors from '../../../src/utils/cors';

/**
 * @api {get} /api/customer-credit Get all customer credits
 * @apiQuery {number} customer_id - Filter by customer (optional)
 * @apiQuery {string} status - Filter by status: available, used, refunded, expired (optional)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<CustomerCreditWithDetails[]>>
) {
  await cors(req, res);

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    const { customer_id, status } = req.query;

    let sql = `
      SELECT
        cc.*,
        c.name as customer_name,
        pr.payment_date
      FROM customer_credit cc
      INNER JOIN customers c ON cc.customer_id = c.id
      INNER JOIN payment_records pr ON cc.payment_record_id = pr.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (customer_id) {
      sql += ' AND cc.customer_id = ?';
      params.push(customer_id);
    }

    if (status) {
      sql += ' AND cc.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY cc.created_at DESC';

    const credits = await query<CustomerCreditWithDetails[]>(sql, params);

    return res.status(200).json({
      success: true,
      data: credits,
    });
  } catch (error: any) {
    console.error('Error fetching customer credits:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch customer credits',
    });
  }
}
