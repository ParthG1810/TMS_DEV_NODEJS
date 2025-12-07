import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';
import {
  ApiResponse,
  PaymentNotificationWithDetails,
} from '../../../src/types';
import cors from '../../../src/utils/cors';

/**
 * @api {get} /api/payment-notifications/:id Get notification by ID
 * @api {put} /api/payment-notifications/:id Update notification (mark as read/dismissed)
 * @api {delete} /api/payment-notifications/:id Delete notification
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PaymentNotificationWithDetails | null>>
) {
  // Enable CORS
  await cors(req, res);

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      error: 'Valid notification ID is required',
    });
  }

  if (req.method === 'GET') {
    return handleGet(req, res, parseInt(id));
  } else if (req.method === 'PUT') {
    return handlePut(req, res, parseInt(id));
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res, parseInt(id));
  } else {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }
}

/**
 * GET /api/payment-notifications/:id
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PaymentNotificationWithDetails>>,
  id: number
) {
  try {
    const notifications = await query<PaymentNotificationWithDetails[]>(
      `
        SELECT
          pn.*,
          c.name AS customer_name
        FROM payment_notifications pn
        LEFT JOIN customers c ON pn.customer_id = c.id
        WHERE pn.id = ?
        LIMIT 1
      `,
      [id]
    );

    if (notifications.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: notifications[0],
    });
  } catch (error: any) {
    console.error('Error fetching notification:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch notification',
    });
  }
}

/**
 * PUT /api/payment-notifications/:id
 * Update notification (mark as read, dismiss, etc.)
 */
async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PaymentNotificationWithDetails>>,
  id: number
) {
  try {
    const { is_read, is_dismissed } = req.body;

    // Check if notification exists
    const existing = await query<any[]>(
      'SELECT id FROM payment_notifications WHERE id = ? LIMIT 1',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (is_read !== undefined) {
      updates.push('is_read = ?');
      params.push(is_read);

      if (is_read) {
        updates.push('read_at = CURRENT_TIMESTAMP');
      }
    }

    if (is_dismissed !== undefined) {
      updates.push('is_dismissed = ?');
      params.push(is_dismissed);

      if (is_dismissed) {
        updates.push('dismissed_at = CURRENT_TIMESTAMP');
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    params.push(id);

    await query(
      `UPDATE payment_notifications SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Fetch updated notification
    const notifications = await query<PaymentNotificationWithDetails[]>(
      `
        SELECT
          pn.*,
          c.name AS customer_name
        FROM payment_notifications pn
        LEFT JOIN customers c ON pn.customer_id = c.id
        WHERE pn.id = ?
        LIMIT 1
      `,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: notifications[0],
    });
  } catch (error: any) {
    console.error('Error updating notification:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update notification',
    });
  }
}

/**
 * DELETE /api/payment-notifications/:id
 */
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<null>>,
  id: number
) {
  try {
    // Check if notification exists
    const existing = await query<any[]>(
      'SELECT id FROM payment_notifications WHERE id = ? LIMIT 1',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    // Delete notification
    await query('DELETE FROM payment_notifications WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete notification',
    });
  }
}
