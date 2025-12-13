import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse, GmailOAuthSettings } from '../../../src/types';
import cors from '../../../src/utils/cors';
import { getAllGmailSettings, getActiveGmailSettings } from '../../../src/services/gmailService';

/**
 * Gmail connection status response
 */
interface GmailStatusResponse {
  connected: boolean;
  accounts: {
    id: number;
    account_name: string;
    email_address: string;
    last_sync_at: Date | null;
    sync_enabled: boolean;
    is_active: boolean;
  }[];
  activeAccount: {
    id: number;
    email_address: string;
    last_sync_at: Date | null;
  } | null;
}

/**
 * @api {get} /api/gmail/status Get Gmail connection status
 * @apiDescription Returns the current Gmail OAuth connection status
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<GmailStatusResponse>>
) {
  await cors(req, res);

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    const allSettings = await getAllGmailSettings();
    const activeSettings = await getActiveGmailSettings();

    const response: GmailStatusResponse = {
      connected: allSettings.some(s => s.sync_enabled && s.is_active),
      accounts: allSettings.map(s => ({
        id: s.id,
        account_name: s.account_name,
        email_address: s.email_address,
        last_sync_at: s.last_sync_at || null,
        sync_enabled: s.sync_enabled,
        is_active: s.is_active,
      })),
      activeAccount: activeSettings ? {
        id: activeSettings.id,
        email_address: activeSettings.email_address,
        last_sync_at: activeSettings.last_sync_at || null,
      } : null,
    };

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error('Error getting Gmail status:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get Gmail connection status',
    });
  }
}
