import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse } from '../../../src/types';
import cors from '../../../src/utils/cors';
import { scanAllGmailAccounts } from '../../../src/services/interacScanner';

/**
 * Sync result response
 */
interface SyncResultResponse {
  totalProcessed: number;
  totalNewTransactions: number;
  totalErrors: number;
  accountResults: {
    email: string;
    processed: number;
    newTransactions: number;
    errors: number;
  }[];
}

/**
 * @api {post} /api/gmail/sync Trigger manual Gmail sync
 * @apiDescription Manually triggers email scanning for all active Gmail accounts
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<SyncResultResponse>>
) {
  await cors(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    console.log('[Gmail Sync] Manual sync triggered');

    const results = await scanAllGmailAccounts();

    const response: SyncResultResponse = {
      totalProcessed: results.totalProcessed,
      totalNewTransactions: results.totalNewTransactions,
      totalErrors: results.totalErrors,
      accountResults: results.accountResults.map(ar => ({
        email: ar.email,
        processed: ar.results.processed,
        newTransactions: ar.results.newTransactions,
        errors: ar.results.errors,
      })),
    };

    console.log(`[Gmail Sync] Completed: ${results.totalNewTransactions} new transactions found`);

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error('Error during Gmail sync:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync Gmail',
    });
  }
}
