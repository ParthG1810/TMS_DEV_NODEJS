import type { NextApiRequest, NextApiResponse } from 'next';
import { query, getConnection } from '../../../src/config/database';
import {
  ApiResponse,
  PaymentRecordWithDetails,
  CreateCashPaymentRequest,
} from '../../../src/types';
import cors from '../../../src/utils/cors';

/**
 * @api {get} /api/payment-records Get all payment records
 * @api {post} /api/payment-records Create a new payment record (cash)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PaymentRecordWithDetails[] | PaymentRecordWithDetails>>
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
 * GET /api/payment-records
 * Query params:
 * - payment_type: 'online' | 'cash'
 * - allocation_status: 'unallocated' | 'partial' | 'fully_allocated' | 'has_excess'
 * - customer_id: number
 * - start_date: YYYY-MM-DD
 * - end_date: YYYY-MM-DD
 * - include_deleted: boolean (default: false)
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PaymentRecordWithDetails[]>>
) {
  try {
    const {
      payment_type,
      allocation_status,
      customer_id,
      start_date,
      end_date,
      include_deleted,
    } = req.query;

    let sql = `
      SELECT
        pr.*,
        c.name as customer_name
      FROM payment_records pr
      LEFT JOIN customers c ON pr.customer_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];

    // Exclude deleted by default
    if (include_deleted !== 'true') {
      sql += ' AND pr.deleted_flag = 0';
    }

    // Filter by payment type
    if (payment_type) {
      sql += ' AND pr.payment_type = ?';
      params.push(payment_type);
    }

    // Filter by allocation status
    if (allocation_status) {
      sql += ' AND pr.allocation_status = ?';
      params.push(allocation_status);
    }

    // Filter by customer
    if (customer_id) {
      sql += ' AND pr.customer_id = ?';
      params.push(customer_id);
    }

    // Filter by date range
    if (start_date) {
      sql += ' AND pr.payment_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND pr.payment_date <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY pr.payment_date DESC, pr.created_at DESC';

    const payments = await query<PaymentRecordWithDetails[]>(sql, params);

    return res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error: any) {
    console.error('Error fetching payment records:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch payment records',
    });
  }
}

/**
 * POST /api/payment-records
 * Create a new cash payment
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PaymentRecordWithDetails>>
) {
  try {
    const body: CreateCashPaymentRequest = req.body;

    // Validate required fields
    if (!body.customer_id || !body.amount || !body.payment_date) {
      return res.status(400).json({
        success: false,
        error: 'customer_id, amount, and payment_date are required',
      });
    }

    // Validate customer exists
    const customers = await query<any[]>(
      'SELECT id, name FROM customers WHERE id = ?',
      [body.customer_id]
    );

    if (customers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Customer not found',
      });
    }

    // Format payment_date to YYYY-MM-DD for MySQL DATE column
    const paymentDate = new Date(body.payment_date);
    const formattedDate = paymentDate.toISOString().split('T')[0];

    // Create payment record
    const result = await query<any>(`
      INSERT INTO payment_records (
        payment_type, payment_source, customer_id, payer_name,
        payment_date, amount, notes, allocation_status, created_by
      ) VALUES ('cash', 'cash', ?, ?, ?, ?, ?, 'unallocated', ?)
    `, [
      body.customer_id,
      body.payer_name || customers[0].name,
      formattedDate,
      body.amount,
      body.notes || null,
      body.created_by || null,
    ]);

    // Fetch the created record
    const payments = await query<PaymentRecordWithDetails[]>(`
      SELECT pr.*, c.name as customer_name
      FROM payment_records pr
      LEFT JOIN customers c ON pr.customer_id = c.id
      WHERE pr.id = ?
    `, [result.insertId]);

    return res.status(201).json({
      success: true,
      data: payments[0],
    });
  } catch (error: any) {
    console.error('Error creating payment record:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create payment record',
    });
  }
}
