import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse } from '../../../src/types';
import cors from '../../../src/utils/cors';
import { scanAllGmailAccounts } from '../../../src/services/interacScanner';
import { query } from '../../../src/config/database';

/**
 * Sync result response
 */
interface SyncResultResponse {
  totalProcessed: number;
  totalNewTransactions: number;
  totalErrors: number;
  totalTransactionsInDb: number;
  message: string;
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

    // Get total transactions count from database
    const countResult = await query<any[]>(`
      SELECT COUNT(*) as total FROM interac_transactions WHERE deleted_flag = 0
    `);
    const totalTransactionsInDb = countResult[0]?.total || 0;

    // Create informative message
    let message = '';
    if (results.totalNewTransactions > 0) {
      message = `Found ${results.totalNewTransactions} new transaction(s) from ${results.totalProcessed} email(s)`;
    } else if (results.totalProcessed > 0) {
      message = `Processed ${results.totalProcessed} email(s), all were already imported`;
    } else {
      message = `No new emails since last sync. You have ${totalTransactionsInDb} transactions total.`;
    }

    const response: SyncResultResponse = {
      totalProcessed: results.totalProcessed,
      totalNewTransactions: results.totalNewTransactions,
      totalErrors: results.totalErrors,
      totalTransactionsInDb,
      message,
      accountResults: results.accountResults.map(ar => ({
        email: ar.email,
        processed: ar.results.processed,
        newTransactions: ar.results.newTransactions,
        errors: ar.results.errors,
      })),
    };

    console.log(`[Gmail Sync] Completed: ${message}`);

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
