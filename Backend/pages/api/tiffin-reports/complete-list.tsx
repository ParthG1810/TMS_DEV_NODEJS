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
      return await handleGetCompleteTiffinList(req, res);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in complete tiffin list handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/tiffin-reports/complete-list
 * Get all tiffin orders from database inception to current date
 * Query params:
 * - search: string (search in customer name, meal plan name)
 * - page: number (for pagination, default: 1)
 * - limit: number (for pagination, default: 50)
 * - sortBy: string (field to sort by, default: 'created_at')
 * - sortOrder: 'asc' | 'desc' (default: 'desc')
 */
async function handleGetCompleteTiffinList(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const {
      search = '',
      page = '1',
      limit = '50',
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = req.query;

    // Validate pagination params
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Page and limit must be positive numbers',
      });
    }

    const offset = (pageNum - 1) * limitNum;

    // Validate sort order
    const validSortOrders = ['asc', 'desc'];
    const finalSortOrder = validSortOrders.includes(sortOrder as string)
      ? (sortOrder as string).toUpperCase()
      : 'DESC';

    // Validate sort by field
    const validSortFields = ['created_at', 'start_date', 'end_date', 'customer_name', 'meal_plan_name', 'price', 'quantity'];
    const finalSortBy = validSortFields.includes(sortBy as string)
      ? sortBy as string
      : 'created_at';

    // Build search condition
    let searchCondition = '';
    const params: any[] = [];

    if (search && (search as string).trim() !== '') {
      searchCondition = `WHERE (c.name LIKE ? OR mp.meal_name LIKE ?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    // Fetch orders with search and pagination
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
      ${searchCondition}
      ORDER BY ${finalSortBy === 'customer_name' ? 'c.name' : finalSortBy === 'meal_plan_name' ? 'mp.meal_name' : 'co.' + finalSortBy} ${finalSortOrder}
      LIMIT ? OFFSET ?
      `,
      [...params, limitNum, offset]
    )) as any[];

    // Parse JSON selected_days
    const ordersWithParsedDays = orders.map((order) => ({
      ...order,
      selected_days: JSON.parse(order.selected_days),
    })) as CustomerOrderWithDetails[];

    // Get total count for pagination
    const countResult = (await query(
      `
      SELECT COUNT(*) as total
      FROM customer_orders co
      INNER JOIN customers c ON co.customer_id = c.id
      INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
      ${searchCondition}
      `,
      params
    )) as any[];

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      success: true,
      data: {
        orders: ordersWithParsedDays,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
        filters: {
          search: search || '',
          sortBy: finalSortBy,
          sortOrder: finalSortOrder.toLowerCase(),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching complete tiffin list:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch complete tiffin list',
    });
  }
}
