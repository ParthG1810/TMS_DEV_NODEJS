import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse } from '../../../src/types';
import cors from '../../../src/utils/cors';
import { disconnectGmail, getGmailSettingsById } from '../../../src/services/gmailService';

/**
 * @api {delete} /api/gmail/disconnect Disconnect Gmail account
 * @apiDescription Removes OAuth tokens and disables sync for a Gmail account
 * @apiQuery {number} id - The Gmail settings ID to disconnect
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<{ disconnected: boolean }>>
) {
  await cors(req, res);

  if (req.method !== 'DELETE') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Gmail settings ID is required',
      });
    }

    const settingsId = parseInt(id as string);

    // Verify settings exist
    const settings = await getGmailSettingsById(settingsId);
    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'Gmail settings not found',
      });
    }

    // Disconnect
    const disconnected = await disconnectGmail(settingsId);

    return res.status(200).json({
      success: true,
      data: { disconnected },
    });
  } catch (error: any) {
    console.error('Error disconnecting Gmail:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to disconnect Gmail',
    });
  }
}
