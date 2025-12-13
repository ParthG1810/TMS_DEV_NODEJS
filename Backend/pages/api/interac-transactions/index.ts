import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';
import { ApiResponse, InteracTransactionWithDetails } from '../../../src/types';
import cors from '../../../src/utils/cors';

/**
 * @api {get} /api/interac-transactions Get all Interac transactions
 * @apiQuery {string} status - Filter by status (pending, allocated, ignored, deleted)
 * @apiQuery {string} start_date - Filter by start date (YYYY-MM-DD)
 * @apiQuery {string} end_date - Filter by end date (YYYY-MM-DD)
 * @apiQuery {number} customer_id - Filter by confirmed customer
 * @apiQuery {boolean} include_deleted - Include soft-deleted transactions (default: false)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<InteracTransactionWithDetails[]>>
) {
  await cors(req, res);

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    const {
      status,
      start_date,
      end_date,
      customer_id,
      include_deleted,
    } = req.query;

    let sql = `
      SELECT
        it.*,
        c1.name as auto_matched_customer_name,
        c2.name as confirmed_customer_name
      FROM interac_transactions it
      LEFT JOIN customers c1 ON it.auto_matched_customer_id = c1.id
      LEFT JOIN customers c2 ON it.confirmed_customer_id = c2.id
      WHERE 1=1
    `;

    const params: any[] = [];

    // Filter by deleted flag (default: exclude deleted)
    if (include_deleted !== 'true') {
      sql += ' AND it.deleted_flag = 0';
    }

    // Filter by status
    if (status) {
      sql += ' AND it.status = ?';
      params.push(status);
    }

    // Filter by date range
    if (start_date) {
      sql += ' AND DATE(it.email_date) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND DATE(it.email_date) <= ?';
      params.push(end_date);
    }

    // Filter by customer
    if (customer_id) {
      sql += ' AND (it.confirmed_customer_id = ? OR it.auto_matched_customer_id = ?)';
      params.push(customer_id, customer_id);
    }

    sql += ' ORDER BY it.email_date DESC';

    const transactions = await query<InteracTransactionWithDetails[]>(sql, params);

    return res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error: any) {
    console.error('Error fetching Interac transactions:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Interac transactions',
    });
  }
}
