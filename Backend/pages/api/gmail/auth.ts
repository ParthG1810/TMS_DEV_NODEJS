import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse } from '../../../src/types';
import cors from '../../../src/utils/cors';
import { getAuthUrl } from '../../../src/services/gmailService';

/**
 * @api {get} /api/gmail/auth Get Gmail OAuth authorization URL
 * @apiDescription Returns the URL to redirect user for Gmail OAuth consent
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<{ authUrl: string }>>
) {
  await cors(req, res);

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    const authUrl = getAuthUrl();

    return res.status(200).json({
      success: true,
      data: { authUrl },
    });
  } catch (error: any) {
    console.error('Error generating Gmail auth URL:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate Gmail authorization URL',
    });
  }
}
