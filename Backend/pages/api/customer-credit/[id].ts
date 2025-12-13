import type { NextApiRequest, NextApiResponse } from 'next';
import { query, getConnection } from '../../../src/config/database';
import { ApiResponse, CustomerCreditWithDetails, CustomerCreditUsage } from '../../../src/types';
import cors from '../../../src/utils/cors';

/**
 * Credit detail with usage history
 */
interface CreditDetailResponse extends CustomerCreditWithDetails {
  usage_history: CustomerCreditUsage[];
}

/**
 * @api {get} /api/customer-credit/:id Get credit details with usage history
 * @api {post} /api/customer-credit/:id/apply Apply credit to an invoice (use /apply endpoint)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<CreditDetailResponse>>
) {
  await cors(req, res);

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      error: 'Credit ID is required',
    });
  }

  const creditId = parseInt(id);

  if (req.method === 'GET') {
    return handleGet(creditId, res);
  } else {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }
}

/**
 * GET /api/customer-credit/:id
 */
async function handleGet(
  id: number,
  res: NextApiResponse<ApiResponse<CreditDetailResponse>>
) {
  try {
    // Get credit details
    const credits = await query<CustomerCreditWithDetails[]>(`
      SELECT
        cc.*,
        c.name as customer_name,
        pr.payment_date
      FROM customer_credit cc
      INNER JOIN customers c ON cc.customer_id = c.id
      INNER JOIN payment_records pr ON cc.payment_record_id = pr.id
      WHERE cc.id = ?
    `, [id]);

    if (credits.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Credit not found',
      });
    }

    // Get usage history
    const usageHistory = await query<CustomerCreditUsage[]>(`
      SELECT ccu.*, mb.billing_month
      FROM customer_credit_usage ccu
      JOIN monthly_billing mb ON ccu.billing_id = mb.id
      WHERE ccu.credit_id = ?
      ORDER BY ccu.used_at DESC
    `, [id]);

    const response: CreditDetailResponse = {
      ...credits[0],
      usage_history: usageHistory,
    };

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error('Error fetching customer credit:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch customer credit',
    });
  }
}
