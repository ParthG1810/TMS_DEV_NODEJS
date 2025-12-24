import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../src/config/database';
import { ApiResponse } from '../../../../src/types';
import cors from '../../../../src/utils/cors';

interface CustomerCredit {
  id: number;
  customer_id: number;
  payment_record_id: number;
  original_amount: number;
  current_balance: number;
  status: string;
  created_at: string;
  notes: string | null;
}

interface CreditSummary {
  total_available: number;
  credits: CustomerCredit[];
}

/**
 * @api {get} /api/customers/:id/credit Get customer credit balance
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<CreditSummary>>
) {
  await cors(req, res);

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      error: 'Customer ID is required',
    });
  }

  const customerId = parseInt(id);

  try {
    // Get all available credits for the customer
    const credits = await query<CustomerCredit[]>(`
      SELECT id, customer_id, payment_record_id,
             original_amount, current_balance, status,
             created_at, notes
      FROM customer_credit
      WHERE customer_id = ?
      AND status = 'available'
      AND current_balance > 0
      ORDER BY created_at ASC
    `, [customerId]);

    // Calculate total available credit
    const totalAvailable = credits.reduce((sum, c) => sum + Number(c.current_balance), 0);

    return res.status(200).json({
      success: true,
      data: {
        total_available: totalAvailable,
        credits,
      },
    });
  } catch (error: any) {
    console.error('Error fetching customer credit:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch customer credit',
    });
  }
}
