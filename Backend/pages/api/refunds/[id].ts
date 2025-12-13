import type { NextApiRequest, NextApiResponse } from 'next';
import { query, getConnection } from '../../../src/config/database';
import { ApiResponse, RefundRecordWithDetails } from '../../../src/types';
import cors from '../../../src/utils/cors';

/**
 * @api {get} /api/refunds/:id Get refund details
 * @api {put} /api/refunds/:id Update refund (approve, complete, cancel)
 * @api {delete} /api/refunds/:id Soft delete refund
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<RefundRecordWithDetails | null>>
) {
  await cors(req, res);

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      error: 'Refund ID is required',
    });
  }

  const refundId = parseInt(id);

  if (req.method === 'GET') {
    return handleGet(refundId, res);
  } else if (req.method === 'PUT') {
    return handleUpdate(req, refundId, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, refundId, res);
  } else {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }
}

/**
 * GET /api/refunds/:id
 */
async function handleGet(
  id: number,
  res: NextApiResponse<ApiResponse<RefundRecordWithDetails | null>>
) {
  try {
    const refunds = await query<RefundRecordWithDetails[]>(`
      SELECT rr.*, c.name as customer_name
      FROM refund_records rr
      INNER JOIN customers c ON rr.customer_id = c.id
      WHERE rr.id = ? AND rr.deleted_flag = 0
    `, [id]);

    if (refunds.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Refund not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: refunds[0],
    });
  } catch (error: any) {
    console.error('Error fetching refund:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch refund',
    });
  }
}

/**
 * PUT /api/refunds/:id
 * Actions: approve, complete, cancel
 */
async function handleUpdate(
  req: NextApiRequest,
  id: number,
  res: NextApiResponse<ApiResponse<RefundRecordWithDetails | null>>
) {
  const connection = await getConnection();

  try {
    const { action, approved_by, reference_number } = req.body;

    if (!action || !['approve', 'complete', 'cancel'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Valid action (approve, complete, cancel) is required',
      });
    }

    await connection.beginTransaction();

    // Get current refund
    const [refunds]: any = await connection.query(`
      SELECT * FROM refund_records WHERE id = ? AND deleted_flag = 0
    `, [id]);

    if (refunds.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: 'Refund not found',
      });
    }

    const refund = refunds[0];

    if (action === 'approve') {
      if (refund.status !== 'pending') {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: 'Only pending refunds can be approved',
        });
      }

      // Update status to completed and deduct from credit
      await connection.query(`
        UPDATE refund_records SET
          status = 'completed',
          approved_by = ?,
          approved_at = NOW(),
          reference_number = COALESCE(?, reference_number),
          updated_at = NOW()
        WHERE id = ?
      `, [approved_by, reference_number, id]);

      // If refund is from credit, update credit balance
      if (refund.credit_id) {
        await connection.query(`
          UPDATE customer_credit SET
            current_balance = current_balance - ?,
            status = IF(current_balance - ? <= 0, 'refunded', status),
            updated_at = NOW()
          WHERE id = ?
        `, [refund.refund_amount, refund.refund_amount, refund.credit_id]);
      }

      // Create completion notification
      await connection.query(`
        INSERT INTO payment_notifications (
          customer_id, notification_type, title, message,
          priority, auto_delete_on_action
        ) VALUES (?, 'refund_completed', ?, ?, 'low', 0)
      `, [
        refund.customer_id,
        `Refund Processed: $${refund.refund_amount.toFixed(2)}`,
        `Refund of $${refund.refund_amount.toFixed(2)} has been processed via ${refund.refund_method}.`,
      ]);

      // Dismiss the refund_request notification
      await connection.query(`
        UPDATE payment_notifications SET
          is_dismissed = 1,
          dismissed_at = NOW()
        WHERE notification_type = 'refund_request'
        AND action_url LIKE ?
      `, [`%/refunds/${id}%`]);

    } else if (action === 'complete') {
      // Same as approve for now
      await connection.query(`
        UPDATE refund_records SET
          status = 'completed',
          approved_by = COALESCE(approved_by, ?),
          approved_at = COALESCE(approved_at, NOW()),
          reference_number = COALESCE(?, reference_number),
          updated_at = NOW()
        WHERE id = ?
      `, [approved_by, reference_number, id]);

    } else if (action === 'cancel') {
      if (refund.status !== 'pending') {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: 'Only pending refunds can be cancelled',
        });
      }

      await connection.query(`
        UPDATE refund_records SET
          status = 'cancelled',
          updated_at = NOW()
        WHERE id = ?
      `, [id]);

      // Dismiss the refund_request notification
      await connection.query(`
        UPDATE payment_notifications SET
          is_dismissed = 1,
          dismissed_at = NOW()
        WHERE notification_type = 'refund_request'
        AND action_url LIKE ?
      `, [`%/refunds/${id}%`]);
    }

    await connection.commit();

    // Return updated refund
    const updatedRefunds = await query<RefundRecordWithDetails[]>(`
      SELECT rr.*, c.name as customer_name
      FROM refund_records rr
      INNER JOIN customers c ON rr.customer_id = c.id
      WHERE rr.id = ?
    `, [id]);

    return res.status(200).json({
      success: true,
      data: updatedRefunds[0],
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Error updating refund:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update refund',
    });
  } finally {
    connection.release();
  }
}

/**
 * DELETE /api/refunds/:id
 */
async function handleDelete(
  req: NextApiRequest,
  id: number,
  res: NextApiResponse<ApiResponse<null>>
) {
  try {
    const { deleted_by } = req.body;

    const result = await query<any>(`
      UPDATE refund_records SET
        deleted_flag = 1,
        deleted_at = NOW(),
        deleted_by = ?,
        updated_at = NOW()
      WHERE id = ? AND status = 'pending'
    `, [deleted_by || null, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Refund not found or cannot be deleted (only pending refunds can be deleted)',
      });
    }

    return res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error: any) {
    console.error('Error deleting refund:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete refund',
    });
  }
}
