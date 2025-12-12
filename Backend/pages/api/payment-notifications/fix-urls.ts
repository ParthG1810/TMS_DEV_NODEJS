import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';
import { ApiResponse } from '../../../src/types';
import cors from '../../../src/utils/cors';

/**
 * @api {post} /api/payment-notifications/fix-urls Fix notification URLs
 * Updates old notification URLs to point to billing details page
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<{ updated: number }>>
) {
  await cors(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    // Update all billing_pending_approval notifications to use billing-details URL
    const result = await query<any>(
      `
        UPDATE payment_notifications
        SET action_url = CONCAT('/dashboard/tiffin/billing-details?id=', billing_id)
        WHERE notification_type = 'billing_pending_approval'
          AND billing_id IS NOT NULL
          AND (action_url LIKE '%billing-calendar%' OR action_url NOT LIKE '%billing-details%')
      `
    );

    const updated = result.affectedRows || 0;

    return res.status(200).json({
      success: true,
      data: { updated },
    });
  } catch (error: any) {
    console.error('Error fixing notification URLs:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fix notification URLs',
    });
  }
}
