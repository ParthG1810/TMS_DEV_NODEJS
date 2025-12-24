import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';
import { ApiResponse } from '../../../src/types';
import cors from '../../../src/utils/cors';

/**
 * @api {post} /api/migrations/run Run a database migration
 * DANGEROUS: Only use for development/admin purposes
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Enable CORS
  await cors(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    // Drop the unique_order constraint if it exists
    await query(`
      ALTER TABLE customer_orders
      DROP INDEX IF EXISTS unique_order
    `);

    return res.status(200).json({
      success: true,
      data: { message: 'Migration completed: unique_order constraint removed' },
    });
  } catch (error: any) {
    console.error('Error running migration:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to run migration',
    });
  }
}
