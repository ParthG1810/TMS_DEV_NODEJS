import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';
import {
  ApiResponse,
  PaymentNotification,
  PaymentNotificationWithDetails,
} from '../../../src/types';
import cors from '../../../src/utils/cors';

/**
 * @api {get} /api/payment-notifications Get payment notifications
 * @api {post} /api/payment-notifications Create payment notification
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PaymentNotificationWithDetails[] | PaymentNotificationWithDetails>>
) {
  // Enable CORS
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
 * GET /api/payment-notifications
 * Query params:
 * - unread_only: boolean (default: false)
 * - limit: number (default: 50)
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PaymentNotificationWithDetails[]>>
) {
  try {
    const { unread_only = 'false', limit = '50' } = req.query;

    let sql = `
      SELECT
        pn.*,
        c.name AS customer_name
      FROM payment_notifications pn
      LEFT JOIN customers c ON pn.customer_id = c.id
      WHERE pn.is_dismissed = FALSE
    `;

    if (unread_only === 'true') {
      sql += ' AND pn.is_read = FALSE';
    }

    sql += ' ORDER BY pn.priority DESC, pn.created_at DESC';
    sql += ` LIMIT ${parseInt(limit as string, 10)}`;

    const notifications = await query<PaymentNotificationWithDetails[]>(sql);

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch notifications',
    });
  }
}

/**
 * POST /api/payment-notifications
 * Create a new notification
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PaymentNotificationWithDetails>>
) {
  try {
    const {
      notification_type,
      billing_id,
      customer_id,
      billing_month,
      title,
      message,
      priority = 'medium',
      action_url,
    } = req.body;

    if (!notification_type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'notification_type, title, and message are required',
      });
    }

    const result = await query(
      `
        INSERT INTO payment_notifications (
          notification_type, billing_id, customer_id, billing_month,
          title, message, priority, action_url
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        notification_type,
        billing_id || null,
        customer_id || null,
        billing_month || null,
        title,
        message,
        priority,
        action_url || null,
      ]
    );

    // Fetch created notification
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
      [(result as any).insertId]
    );

    return res.status(201).json({
      success: true,
      data: notifications[0],
    });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create notification',
    });
  }
}
