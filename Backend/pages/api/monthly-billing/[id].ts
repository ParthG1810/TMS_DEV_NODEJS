import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';
import {
  ApiResponse,
  MonthlyBillingWithDetails,
  FinalizeBillingRequest,
} from '../../../src/types';
import cors from '../../../src/utils/cors';

/**
 * @api {get} /api/monthly-billing/:id Get billing by ID
 * @api {put} /api/monthly-billing/:id Update billing
 * @api {delete} /api/monthly-billing/:id Delete billing
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<MonthlyBillingWithDetails | null>>
) {
  // Enable CORS
  await cors(req, res);

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      error: 'Valid billing ID is required',
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
 * GET /api/monthly-billing/:id
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<MonthlyBillingWithDetails>>,
  id: number
) {
  try {
    const billings = await query<MonthlyBillingWithDetails[]>(
      `
        SELECT
          mb.*,
          c.name AS customer_name,
          c.phone AS customer_phone,
          c.address AS customer_address
        FROM monthly_billing mb
        INNER JOIN customers c ON mb.customer_id = c.id
        WHERE mb.id = ?
        LIMIT 1
      `,
      [id]
    );

    if (billings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Billing record not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: billings[0],
    });
  } catch (error: any) {
    console.error('Error fetching billing:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch billing',
    });
  }
}

/**
 * PUT /api/monthly-billing/:id
 * Update billing or finalize it
 */
async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<MonthlyBillingWithDetails>>,
  id: number
) {
  try {
    const body = req.body;

    // Check if billing exists
    const existing = await query<any[]>(
      'SELECT id, status FROM monthly_billing WHERE id = ? LIMIT 1',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Billing record not found',
      });
    }

    // Handle finalize action
    if (body.action === 'finalize') {
      const finalize: FinalizeBillingRequest = body;

      if (!finalize.finalized_by) {
        return res.status(400).json({
          success: false,
          error: 'finalized_by is required',
        });
      }

      // Get billing info first (we need customer_id and billing_month)
      const billingInfo = await query<any[]>(
        'SELECT mb.customer_id, mb.billing_month, mb.total_amount, c.name AS customer_name FROM monthly_billing mb INNER JOIN customers c ON mb.customer_id = c.id WHERE mb.id = ?',
        [id]
      );

      if (billingInfo.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Billing record not found',
        });
      }

      const { customer_id, billing_month } = billingInfo[0];

      // Update monthly_billing to pending status
      await query(
        `
          UPDATE monthly_billing
          SET
            status = 'pending',
            finalized_at = CURRENT_TIMESTAMP,
            finalized_by = ?,
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [finalize.finalized_by, finalize.notes || null, id]
      );

      // Update all customer_orders for this customer in this month to payment_status='pending'
      // This ensures orders are marked as pending when billing is finalized
      const [year, month] = billing_month.split('-');
      const firstDay = `${billing_month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const lastDayStr = `${billing_month}-${String(lastDay).padStart(2, '0')}`;

      await query(
        `
          UPDATE customer_orders
          SET payment_status = 'pending',
              updated_at = CURRENT_TIMESTAMP
          WHERE customer_id = ?
            AND (
              (start_date <= ? AND end_date >= ?)
              OR (start_date >= ? AND start_date <= ?)
            )
        `,
        [customer_id, lastDayStr, firstDay, firstDay, lastDayStr]
      );

      // Delete any existing notifications for this billing (in case of re-finalize)
      await query(
        'DELETE FROM payment_notifications WHERE billing_id = ? AND notification_type = ?',
        [id, 'billing_pending_approval']
      );

      // Use the billing info we already fetched
      const billing = billingInfo;

      if (billing.length > 0) {
        await query(
          `
            INSERT INTO payment_notifications (
              notification_type, billing_id, customer_id, billing_month,
              title, message, priority, action_url
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            'billing_pending_approval',
            id,
            billing[0].customer_id,
            billing[0].billing_month,
            `Billing Pending Approval - ${billing[0].customer_name}`,
            `Billing for ${billing[0].customer_name} (${billing[0].billing_month}) has been finalized and is pending approval. Total amount: CAD $${Number(billing[0].total_amount).toFixed(2)}`,
            'high',
            `/dashboard/tiffin/billing-details?id=${id}`,
          ]
        );
      }
    } else {
      // Regular update
      const updates: string[] = [];
      const params: any[] = [];

      if (body.notes !== undefined) {
        updates.push('notes = ?');
        params.push(body.notes || null);
      }

      // Check if status is being changed to 'calculating' (rejection)
      const isRejection = body.status === 'calculating' && existing[0].status !== 'calculating';

      if (body.status && ['calculating', 'pending', 'finalized', 'paid'].includes(body.status)) {
        updates.push('status = ?');
        params.push(body.status);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update',
        });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      await query(
        `UPDATE monthly_billing SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      // Handle rejection: delete notifications and reset related statuses
      if (isRejection) {
        // Get billing info for customer_id and billing_month
        const billingInfo = await query<any[]>(
          'SELECT customer_id, billing_month FROM monthly_billing WHERE id = ?',
          [id]
        );

        if (billingInfo.length > 0) {
          const { customer_id, billing_month } = billingInfo[0];

          // Delete all notifications related to this billing
          await query(
            'DELETE FROM payment_notifications WHERE billing_id = ?',
            [id]
          );

          // Reset customer_orders payment_status back to 'calculating' for this billing period
          const [year, month] = billing_month.split('-');
          const firstDay = `${billing_month}-01`;
          const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
          const lastDayStr = `${billing_month}-${String(lastDay).padStart(2, '0')}`;

          await query(
            `
              UPDATE customer_orders
              SET payment_status = 'calculating',
                  updated_at = CURRENT_TIMESTAMP
              WHERE customer_id = ?
                AND (
                  (start_date <= ? AND end_date >= ?)
                  OR (start_date >= ? AND start_date <= ?)
                )
            `,
            [customer_id, lastDayStr, firstDay, firstDay, lastDayStr]
          );

          // Trigger recalculation by clearing finalized_at and finalized_by
          await query(
            `
              UPDATE monthly_billing
              SET finalized_at = NULL,
                  finalized_by = NULL,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `,
            [id]
          );
        }
      }
    }

    // Fetch updated billing
    const billings = await query<MonthlyBillingWithDetails[]>(
      `
        SELECT
          mb.*,
          c.name AS customer_name,
          c.phone AS customer_phone,
          c.address AS customer_address
        FROM monthly_billing mb
        INNER JOIN customers c ON mb.customer_id = c.id
        WHERE mb.id = ?
        LIMIT 1
      `,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: billings[0],
    });
  } catch (error: any) {
    console.error('Error updating billing:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update billing',
    });
  }
}

/**
 * DELETE /api/monthly-billing/:id
 */
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<null>>,
  id: number
) {
  try {
    // Check if billing exists
    const existing = await query<any[]>(
      'SELECT id FROM monthly_billing WHERE id = ? LIMIT 1',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Billing record not found',
      });
    }

    // Delete billing
    await query('DELETE FROM monthly_billing WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error: any) {
    console.error('Error deleting billing:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete billing',
    });
  }
}
