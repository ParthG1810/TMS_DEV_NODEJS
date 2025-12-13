import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';
import { ApiResponse, InteracTransactionWithDetails } from '../../../src/types';
import cors from '../../../src/utils/cors';
import {
  getInteracTransactionById,
  confirmCustomerMatch,
  ignoreInteracTransaction,
} from '../../../src/services/interacScanner';

/**
 * @api {get} /api/interac-transactions/:id Get single Interac transaction
 * @api {put} /api/interac-transactions/:id Update Interac transaction
 * @api {delete} /api/interac-transactions/:id Soft delete (ignore) transaction
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<InteracTransactionWithDetails | null>>
) {
  await cors(req, res);

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      error: 'Transaction ID is required',
    });
  }

  const transactionId = parseInt(id);

  if (req.method === 'GET') {
    return handleGet(transactionId, res);
  } else if (req.method === 'PUT') {
    return handleUpdate(req, transactionId, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, transactionId, res);
  } else {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }
}

/**
 * GET /api/interac-transactions/:id
 */
async function handleGet(
  id: number,
  res: NextApiResponse<ApiResponse<InteracTransactionWithDetails | null>>
) {
  try {
    const transaction = await getInteracTransactionById(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: transaction as InteracTransactionWithDetails,
    });
  } catch (error: any) {
    console.error('Error fetching Interac transaction:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch transaction',
    });
  }
}

/**
 * PUT /api/interac-transactions/:id
 * Body: { action: 'confirm_customer', customer_id: number } or { action: 'ignore' }
 */
async function handleUpdate(
  req: NextApiRequest,
  id: number,
  res: NextApiResponse<ApiResponse<InteracTransactionWithDetails | null>>
) {
  try {
    const { action, customer_id } = req.body;

    if (action === 'confirm_customer') {
      if (!customer_id) {
        return res.status(400).json({
          success: false,
          error: 'customer_id is required for confirm_customer action',
        });
      }

      const success = await confirmCustomerMatch(id, customer_id);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found',
        });
      }

      // Fetch updated transaction
      const updated = await getInteracTransactionById(id);

      return res.status(200).json({
        success: true,
        data: updated as InteracTransactionWithDetails,
      });
    } else if (action === 'ignore') {
      // Use the delete handler for ignore
      const deletedBy = req.body.deleted_by || 0;
      await ignoreInteracTransaction(id, deletedBy);

      return res.status(200).json({
        success: true,
        data: null,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Use "confirm_customer" or "ignore"',
      });
    }
  } catch (error: any) {
    console.error('Error updating Interac transaction:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update transaction',
    });
  }
}

/**
 * DELETE /api/interac-transactions/:id
 * Soft deletes (ignores) the transaction
 */
async function handleDelete(
  req: NextApiRequest,
  id: number,
  res: NextApiResponse<ApiResponse<null>>
) {
  try {
    const deletedBy = req.body?.deleted_by || 0;

    const success = await ignoreInteracTransaction(id, deletedBy);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error: any) {
    console.error('Error deleting Interac transaction:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete transaction',
    });
  }
}
