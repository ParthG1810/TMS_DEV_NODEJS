import type { NextApiRequest, NextApiResponse } from 'next';
import { query, getConnection } from '../../../src/config/database';
import {
  ApiResponse,
  PaymentRecordWithDetails,
  PaymentAllocationWithDetails,
} from '../../../src/types';
import cors from '../../../src/utils/cors';

/**
 * Payment record with allocations
 */
interface PaymentRecordFull extends PaymentRecordWithDetails {
  allocations: PaymentAllocationWithDetails[];
}

/**
 * @api {get} /api/payment-records/:id Get single payment record with allocations
 * @api {put} /api/payment-records/:id Update payment record
 * @api {delete} /api/payment-records/:id Soft delete payment record
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PaymentRecordFull | null>>
) {
  await cors(req, res);

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      error: 'Payment record ID is required',
    });
  }

  const paymentId = parseInt(id);

  if (req.method === 'GET') {
    return handleGet(paymentId, res);
  } else if (req.method === 'PUT') {
    return handleUpdate(req, paymentId, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, paymentId, res);
  } else {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }
}

/**
 * GET /api/payment-records/:id
 */
async function handleGet(
  id: number,
  res: NextApiResponse<ApiResponse<PaymentRecordFull | null>>
) {
  try {
    // Get payment record
    const payments = await query<PaymentRecordWithDetails[]>(`
      SELECT pr.*, c.name as customer_name
      FROM payment_records pr
      LEFT JOIN customers c ON pr.customer_id = c.id
      WHERE pr.id = ? AND pr.deleted_flag = 0
    `, [id]);

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payment record not found',
      });
    }

    // Get allocations
    const allocations = await query<PaymentAllocationWithDetails[]>(`
      SELECT
        pa.*,
        mb.billing_month,
        c.name as customer_name
      FROM payment_allocations pa
      JOIN monthly_billing mb ON pa.billing_id = mb.id
      JOIN customers c ON pa.customer_id = c.id
      WHERE pa.payment_record_id = ? AND pa.deleted_flag = 0
      ORDER BY pa.allocation_order ASC
    `, [id]);

    const paymentRecord: PaymentRecordFull = {
      ...payments[0],
      allocations,
    };

    return res.status(200).json({
      success: true,
      data: paymentRecord,
    });
  } catch (error: any) {
    console.error('Error fetching payment record:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch payment record',
    });
  }
}

/**
 * PUT /api/payment-records/:id
 * Update payment record (only notes and payer_name can be updated after creation)
 */
async function handleUpdate(
  req: NextApiRequest,
  id: number,
  res: NextApiResponse<ApiResponse<PaymentRecordFull | null>>
) {
  try {
    const { notes, payer_name, updated_by } = req.body;

    // Update allowed fields
    await query(`
      UPDATE payment_records SET
        notes = COALESCE(?, notes),
        payer_name = COALESCE(?, payer_name),
        updated_by = ?,
        updated_at = NOW()
      WHERE id = ? AND deleted_flag = 0
    `, [notes, payer_name, updated_by || null, id]);

    // Return updated record
    return handleGet(id, res);
  } catch (error: any) {
    console.error('Error updating payment record:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update payment record',
    });
  }
}

/**
 * DELETE /api/payment-records/:id
 * Soft delete payment record and reverse allocations
 */
async function handleDelete(
  req: NextApiRequest,
  id: number,
  res: NextApiResponse<ApiResponse<null>>
) {
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    const { deleted_by, delete_reason } = req.body;

    // Verify record exists
    const [payments]: any = await connection.query(`
      SELECT * FROM payment_records WHERE id = ? AND deleted_flag = 0
    `, [id]);

    if (payments.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: 'Payment record not found',
      });
    }

    // Call stored procedure to reverse allocations
    await connection.query('CALL sp_reverse_payment_allocation(?, ?, @result)', [id, deleted_by || 0]);

    // Soft delete the payment record
    await connection.query(`
      UPDATE payment_records SET
        deleted_flag = 1,
        deleted_at = NOW(),
        deleted_by = ?,
        delete_reason = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [deleted_by || null, delete_reason || null, id]);

    // Delete related notifications
    await connection.query(`
      UPDATE payment_notifications SET
        is_dismissed = 1,
        dismissed_at = NOW()
      WHERE related_payment_id = ?
    `, [id]);

    await connection.commit();

    return res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Error deleting payment record:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete payment record',
    });
  } finally {
    connection.release();
  }
}
