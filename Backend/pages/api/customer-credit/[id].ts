import type { NextApiRequest, NextApiResponse } from 'next';
import { query, getConnection } from '../../../src/config/database';
import { ApiResponse, CustomerCreditWithDetails, CustomerCreditUsage } from '../../../src/types';
import cors from '../../../src/utils/cors';

interface SourcePayment {
  id: number;
  payment_date: string;
  amount: number;
  payment_type: string;
  reference_number: string | null;
}

interface CreditUsageDetail {
  id: number;
  billing_id: number;
  invoice_number: string | null;
  billing_month: string;
  amount_used: number;
  used_at: string;
}

interface CreditRefund {
  id: number;
  refund_amount: number;
  refund_method: string;
  refund_date: string;
  reference_number: string | null;
  status: string;
  created_at: string;
}

/**
 * Credit detail with full history
 */
interface CreditDetailResponse extends CustomerCreditWithDetails {
  source_payment: SourcePayment | null;
  usage_history: CreditUsageDetail[];
  refund_history: CreditRefund[];
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

    const credit = credits[0];

    // Get source payment details
    const sourcePayments = await query<SourcePayment[]>(`
      SELECT id, payment_date, amount, payment_type, reference_number
      FROM payment_records
      WHERE id = ?
    `, [credit.payment_record_id]);

    // Get usage history with invoice details
    const usageHistory = await query<CreditUsageDetail[]>(`
      SELECT
        ccu.id,
        ccu.billing_id,
        i.invoice_number,
        DATE_FORMAT(i.generated_at, '%Y-%m') as billing_month,
        ccu.amount_used,
        ccu.used_at
      FROM customer_credit_usage ccu
      LEFT JOIN invoices i ON ccu.billing_id = i.id
      WHERE ccu.credit_id = ?
      ORDER BY ccu.used_at DESC
    `, [id]);

    // Get refund history
    const refundHistory = await query<CreditRefund[]>(`
      SELECT
        id, refund_amount, refund_method, refund_date,
        reference_number, status, created_at
      FROM refund_records
      WHERE credit_id = ? AND deleted_flag = 0
      ORDER BY created_at DESC
    `, [id]);

    const response: CreditDetailResponse = {
      ...credit,
      source_payment: sourcePayments.length > 0 ? sourcePayments[0] : null,
      usage_history: usageHistory,
      refund_history: refundHistory,
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
