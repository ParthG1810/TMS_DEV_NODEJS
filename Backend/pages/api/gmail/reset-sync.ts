import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse } from '../../../src/types';
import cors from '../../../src/utils/cors';
import { query } from '../../../src/config/database';

/**
 * @api {post} /api/gmail/reset-sync Reset Gmail sync state
 * @apiDescription Resets the last sync marker to allow re-scanning all emails
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<{ message: string }>>
) {
  await cors(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    const { id } = req.body;

    if (id) {
      // Reset specific account
      await query(`
        UPDATE gmail_oauth_settings
        SET last_sync_email_id = NULL, last_sync_at = NULL, updated_at = NOW()
        WHERE id = ?
      `, [id]);

      console.log(`[Gmail] Reset sync state for account ID: ${id}`);
    } else {
      // Reset all accounts
      await query(`
        UPDATE gmail_oauth_settings
        SET last_sync_email_id = NULL, last_sync_at = NULL, updated_at = NOW()
      `);

      console.log('[Gmail] Reset sync state for all accounts');
    }

    return res.status(200).json({
      success: true,
      data: { message: 'Sync state reset successfully. Next sync will scan all emails.' },
    });
  } catch (error: any) {
    console.error('Error resetting Gmail sync:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to reset sync state',
    });
  }
}
