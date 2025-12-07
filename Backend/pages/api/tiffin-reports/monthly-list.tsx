import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query } from 'src/config/database';
import {
  CustomerOrderWithDetails,
  ApiResponse,
} from 'src/types';

// ----------------------------------------------------------------------

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    await cors(req, res);

    if (req.method === 'GET') {
      return await handleGetMonthlyTiffinList(req, res);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in monthly tiffin list handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/tiffin-reports/monthly-list
 * Get all tiffin orders for a specific month
 * Query params:
 * - month: YYYY-MM (default: current month)
 */
async function handleGetMonthlyTiffinList(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const { month } = req.query;

    // Use provided month or default to current month
    const targetMonth = month
      ? `${month}`
      : new Date().toISOString().slice(0, 7);

    // Validate month format
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(targetMonth)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid month format. Use YYYY-MM',
      });
    }

    // Fetch orders that are active during the target month
    const orders = (await query(
      `
      SELECT
        co.*,
        c.name as customer_name,
        c.phone as customer_phone,
        c.address as customer_address,
        mp.meal_name as meal_plan_name,
        mp.description as meal_plan_description,
        mp.frequency as meal_plan_frequency,
        mp.days as meal_plan_days
      FROM customer_orders co
      INNER JOIN customers c ON co.customer_id = c.id
      INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
      WHERE DATE_FORMAT(co.start_date, '%Y-%m') <= ? AND DATE_FORMAT(co.end_date, '%Y-%m') >= ?
      ORDER BY co.created_at DESC
      `,
      [targetMonth, targetMonth]
    )) as any[];

    // Parse JSON selected_days with defensive handling
    const ordersWithParsedDays = orders.map((order) => {
      let parsedDays: string[];

      // Check if it's already an array (MySQL driver may auto-parse JSON columns)
      if (Array.isArray(order.selected_days)) {
        parsedDays = order.selected_days;
      } else if (typeof order.selected_days === 'string') {
        try {
          parsedDays = JSON.parse(order.selected_days);
        } catch (error) {
          // If parse fails, try to handle as comma-separated string
          parsedDays = order.selected_days.split(',').map((day: string) => day.trim()).filter(Boolean);
        }
      } else {
        parsedDays = [];
      }

      return {
        ...order,
        selected_days: parsedDays,
      };
    }) as CustomerOrderWithDetails[];

    return res.status(200).json({
      success: true,
      data: {
        month: targetMonth,
        orders: ordersWithParsedDays,
        total_orders: ordersWithParsedDays.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching monthly tiffin list:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly tiffin list',
    });
  }
}
