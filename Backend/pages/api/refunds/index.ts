import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';
import { ApiResponse, RefundRecordWithDetails, CreateRefundRequest } from '../../../src/types';
import cors from '../../../src/utils/cors';

/**
 * @api {get} /api/refunds Get all refund records
 * @api {post} /api/refunds Create a new refund request
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<RefundRecordWithDetails[] | RefundRecordWithDetails>>
) {
  await cors(req, res);

  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }
}

/**
 * GET /api/refunds
 * @apiQuery {string} status - Filter by status: pending, completed, cancelled
 * @apiQuery {number} customer_id - Filter by customer
 * @apiQuery {string} start_date - Filter by date range start
 * @apiQuery {string} end_date - Filter by date range end
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<RefundRecordWithDetails[]>>
) {
  try {
    const { status, customer_id, start_date, end_date } = req.query;

    let sql = `
      SELECT
        rr.*,
        c.name as customer_name
      FROM refund_records rr
      INNER JOIN customers c ON rr.customer_id = c.id
      WHERE rr.deleted_flag = 0
    `;

    const params: any[] = [];

    if (status) {
      sql += ' AND rr.status = ?';
      params.push(status);
    }

    if (customer_id) {
      sql += ' AND rr.customer_id = ?';
      params.push(customer_id);
    }

    if (start_date) {
      sql += ' AND rr.refund_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND rr.refund_date <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY rr.created_at DESC';

    const refunds = await query<RefundRecordWithDetails[]>(sql, params);

    return res.status(200).json({
      success: true,
      data: refunds,
    });
  } catch (error: any) {
    console.error('Error fetching refunds:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch refunds',
    });
  }
}

/**
 * POST /api/refunds
 * Create a new refund request
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<RefundRecordWithDetails>>
) {
  try {
    const body: CreateRefundRequest & { requested_by: number } = req.body;

    // Validate required fields
    if (!body.source_type || !body.customer_id || !body.refund_amount ||
        !body.refund_method || !body.refund_date || !body.reason || !body.requested_by) {
      return res.status(400).json({
        success: false,
        error: 'source_type, customer_id, refund_amount, refund_method, refund_date, reason, and requested_by are required',
      });
    }

    // Validate source
    if (body.source_type === 'credit' && !body.credit_id) {
      return res.status(400).json({
        success: false,
        error: 'credit_id is required when source_type is "credit"',
      });
    }

    if (body.source_type === 'payment' && !body.payment_record_id) {
      return res.status(400).json({
        success: false,
        error: 'payment_record_id is required when source_type is "payment"',
      });
    }

    // Validate credit has sufficient balance if refunding from credit
    if (body.source_type === 'credit') {
      const credits = await query<any[]>(`
        SELECT current_balance FROM customer_credit
        WHERE id = ? AND status = 'available'
      `, [body.credit_id]);

      if (credits.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Credit not found or not available',
        });
      }

      if (credits[0].current_balance < body.refund_amount) {
        return res.status(400).json({
          success: false,
          error: `Insufficient credit balance. Available: $${credits[0].current_balance.toFixed(2)}`,
        });
      }
    }

    // Create refund record
    const result = await query<any>(`
      INSERT INTO refund_records (
        source_type, credit_id, payment_record_id, customer_id,
        refund_amount, refund_method, refund_date, reference_number,
        reason, status, requested_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `, [
      body.source_type,
      body.credit_id || null,
      body.payment_record_id || null,
      body.customer_id,
      body.refund_amount,
      body.refund_method,
      body.refund_date,
      body.reference_number || null,
      body.reason,
      body.requested_by,
    ]);

    // Create notification for admin
    await query(`
      INSERT INTO payment_notifications (
        customer_id, notification_type, title, message,
        priority, action_url, auto_delete_on_action
      ) VALUES (?, 'refund_request', ?, ?, 'high', ?, 1)
    `, [
      body.customer_id,
      `Refund Request: $${body.refund_amount.toFixed(2)}`,
      `Refund of $${body.refund_amount.toFixed(2)} requested. Reason: ${body.reason}`,
      `/dashboard/payments/refunds/${result.insertId}`,
    ]);

    // Fetch the created refund
    const refunds = await query<RefundRecordWithDetails[]>(`
      SELECT rr.*, c.name as customer_name
      FROM refund_records rr
      INNER JOIN customers c ON rr.customer_id = c.id
      WHERE rr.id = ?
    `, [result.insertId]);

    return res.status(201).json({
      success: true,
      data: refunds[0],
    });
  } catch (error: any) {
    console.error('Error creating refund:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create refund',
    });
  }
}
