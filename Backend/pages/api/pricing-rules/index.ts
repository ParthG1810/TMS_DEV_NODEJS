import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';
import { ApiResponse, PricingRule } from '../../../src/types';
import cors from '../../../src/utils/cors';

/**
 * @api {get} /api/pricing-rules Get pricing rules
 * @api {post} /api/pricing-rules Create pricing rule
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PricingRule[] | PricingRule>>
) {
  // Enable CORS
  await cors(req, res);

  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }
}

/**
 * GET /api/pricing-rules
 * Query params:
 * - is_default: boolean (optional)
 * - meal_plan_id: number (optional)
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PricingRule[]>>
) {
  try {
    const { is_default, meal_plan_id } = req.query;

    let sql = 'SELECT * FROM pricing_rules WHERE 1=1';
    const params: any[] = [];

    if (is_default === 'true') {
      sql += ' AND is_default = TRUE';
    }

    if (meal_plan_id) {
      sql += ' AND (meal_plan_id = ? OR meal_plan_id IS NULL)';
      params.push(meal_plan_id);
    }

    sql += ' ORDER BY is_default DESC, effective_from DESC';

    const rules = await query<PricingRule[]>(sql, params);

    return res.status(200).json({
      success: true,
      data: rules,
    });
  } catch (error: any) {
    console.error('Error fetching pricing rules:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch pricing rules',
    });
  }
}

/**
 * POST /api/pricing-rules
 * Create a new pricing rule
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PricingRule>>
) {
  try {
    const {
      meal_plan_id,
      rule_name,
      delivered_price,
      extra_price,
      is_default = false,
      effective_from,
      effective_to,
    } = req.body;

    if (!rule_name || !delivered_price || !extra_price || !effective_from) {
      return res.status(400).json({
        success: false,
        error: 'rule_name, delivered_price, extra_price, and effective_from are required',
      });
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await query('UPDATE pricing_rules SET is_default = FALSE WHERE is_default = TRUE');
    }

    const result = await query(
      `
        INSERT INTO pricing_rules (
          meal_plan_id, rule_name, delivered_price, extra_price,
          is_default, effective_from, effective_to
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        meal_plan_id || null,
        rule_name,
        delivered_price,
        extra_price,
        is_default,
        effective_from,
        effective_to || null,
      ]
    );

    // Fetch created rule
    const rules = await query<PricingRule[]>(
      'SELECT * FROM pricing_rules WHERE id = ? LIMIT 1',
      [(result as any).insertId]
    );

    return res.status(201).json({
      success: true,
      data: rules[0],
    });
  } catch (error: any) {
    console.error('Error creating pricing rule:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create pricing rule',
    });
  }
}
