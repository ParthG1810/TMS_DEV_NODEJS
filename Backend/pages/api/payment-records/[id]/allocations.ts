import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../src/config/database';
import { ApiResponse } from '../../../../src/types';
import cors from '../../../../src/utils/cors';

interface PaymentAllocation {
  id: number;
  billing_id: number;
  invoice_number: string;
  customer_name: string;
  billing_month: string;
  allocated_amount: number;
  credit_amount: number;
  resulting_status: string;
  created_at: string;
}

/**
 * @api {get} /api/payment-records/:id/allocations Get payment allocations
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PaymentAllocation[]>>
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
      error: 'Payment record ID is required',
    });
  }

  try {
    // Get payment allocations with credit usage
    const allocations = await query<PaymentAllocation[]>(`
      SELECT
        pa.id,
        pa.billing_id,
        i.invoice_number,
        c.name as customer_name,
        i.generated_at as billing_month,
        pa.allocated_amount,
        COALESCE(cu.credit_amount, 0) as credit_amount,
        pa.resulting_status,
        pa.created_at
      FROM payment_allocations pa
      LEFT JOIN invoices i ON pa.billing_id = i.id
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN (
        SELECT billing_id, payment_record_id, SUM(amount_used) as credit_amount
        FROM customer_credit_usage
        GROUP BY billing_id, payment_record_id
      ) cu ON cu.billing_id = pa.billing_id AND cu.payment_record_id = pa.payment_record_id
      WHERE pa.payment_record_id = ?
      ORDER BY pa.allocation_order ASC
    `, [id]);

    return res.status(200).json({
      success: true,
      data: allocations,
    });
  } catch (error: any) {
    console.error('Error fetching payment allocations:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch payment allocations',
    });
  }
}
