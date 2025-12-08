import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query } from 'src/config/database';
import {
  DailyTiffinCount,
  DailyTiffinSummary,
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
      return await handleGetDailyTiffinCount(req, res);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in daily tiffin count handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/tiffin-reports/daily-count
 * Get daily tiffin count for a specific date
 * Query params:
 * - date: YYYY-MM-DD (default: today)
 */
async function handleGetDailyTiffinCount(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const { date } = req.query;

    // Use provided date or default to today
    const targetDate = date
      ? `${date}`
      : new Date().toISOString().split('T')[0];

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(targetDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = new Date(targetDate).getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[dayOfWeek];

    // Fetch orders that are active on the target date and include the current day
    const orders = (await query(
      `
      SELECT
        c.name as customer_name,
        co.quantity,
        mp.meal_name as meal_plan_name,
        co.selected_days
      FROM customer_orders co
      INNER JOIN customers c ON co.customer_id = c.id
      INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
      WHERE co.start_date <= ? AND co.end_date >= ?
      ORDER BY c.name ASC
      `,
      [targetDate, targetDate]
    )) as any[];

    // Filter orders that include the current day with defensive parsing
    const filteredOrders: DailyTiffinCount[] = orders
      .filter((order) => {
        let selectedDays: string[];

        // Check if it's already an array (MySQL driver may auto-parse JSON columns)
        if (Array.isArray(order.selected_days)) {
          selectedDays = order.selected_days;
        } else if (typeof order.selected_days === 'string') {
          try {
            selectedDays = JSON.parse(order.selected_days);
          } catch (error) {
            // If parse fails, try to handle as comma-separated string
            selectedDays = order.selected_days.split(',').map((day: string) => day.trim()).filter(Boolean);
          }
        } else {
          selectedDays = [];
        }

        // If selected_days is empty array, it means all days are included (for Daily frequency)
        return selectedDays.length === 0 || selectedDays.includes(currentDayName);
      })
      .map((order) => ({
        customer_name: order.customer_name,
        quantity: order.quantity,
        meal_plan_name: order.meal_plan_name,
      }));

    // Calculate total count
    const totalCount = filteredOrders.reduce((sum, order) => sum + order.quantity, 0);

    const summary: DailyTiffinSummary = {
      date: targetDate,
      orders: filteredOrders,
      total_count: totalCount,
    };

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('Error fetching daily tiffin count:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch daily tiffin count',
    });
  }
}
