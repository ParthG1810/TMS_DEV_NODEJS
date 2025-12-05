import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query } from 'src/config/database';
import {
  CustomerOrder,
  CustomerOrderWithDetails,
  CreateCustomerOrderRequest,
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
      return await handleGetCustomerOrders(req, res);
    } else if (req.method === 'POST') {
      return await handleCreateCustomerOrder(req, res);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in customer orders handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/customer-orders
 * Fetch all customer orders with details
 * Query params:
 * - filter: 'monthly' | 'all' (default: 'all')
 * - month: YYYY-MM (for monthly filter)
 * - page: number (for pagination)
 * - limit: number (for pagination)
 */
async function handleGetCustomerOrders(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const { filter, month, page = '1', limit = '50' } = req.query;

    let whereClause = '';
    const params: any[] = [];

    // Apply monthly filter
    if (filter === 'monthly') {
      const targetMonth = month ? `${month}` : new Date().toISOString().slice(0, 7);
      whereClause = `WHERE DATE_FORMAT(co.start_date, '%Y-%m') <= ? AND DATE_FORMAT(co.end_date, '%Y-%m') >= ?`;
      params.push(targetMonth, targetMonth);
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Fetch orders with joined data
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
      ${whereClause}
      ORDER BY co.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
      `,
      params
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
      ${whereClause}
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
      },
    });
  } catch (error: any) {
    console.error('Error fetching customer orders:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch customer orders',
    });
  }
}

/**
 * POST /api/customer-orders
 * Create a new customer order
 */
async function handleCreateCustomerOrder(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const {
      customer_id,
      meal_plan_id,
      quantity,
      selected_days,
      price,
      start_date,
      end_date,
    } = req.body as CreateCustomerOrderRequest;

    // Validation
    const errors = await validateCustomerOrderInput({
      customer_id,
      meal_plan_id,
      quantity,
      selected_days,
      price,
      start_date,
      end_date,
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors.join(', '),
      });
    }

    // Convert selected_days to JSON string
    const selectedDaysJson = JSON.stringify(selected_days);

    // Insert customer order
    const result = (await query(
      'INSERT INTO customer_orders (customer_id, meal_plan_id, quantity, selected_days, price, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [customer_id, meal_plan_id, quantity, selectedDaysJson, price, start_date, end_date]
    )) as any;

    const orderId = result.insertId;

    // Fetch the created order with details
    const createdOrders = (await query(
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
      WHERE co.id = ?
      `,
      [orderId]
    )) as any[];

    // Parse JSON selected_days
    const orderWithParsedDays = {
      ...createdOrders[0],
      selected_days: JSON.parse(createdOrders[0].selected_days),
    } as CustomerOrderWithDetails;

    return res.status(201).json({
      success: true,
      data: orderWithParsedDays,
    });
  } catch (error: any) {
    console.error('Error creating customer order:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create customer order',
    });
  }
}

/**
 * Validate customer order input data
 */
async function validateCustomerOrderInput(
  data: CreateCustomerOrderRequest
): Promise<string[]> {
  const errors: string[] = [];

  // Validate customer_id
  if (!data.customer_id) {
    errors.push('Customer is required');
  } else {
    const customers = (await query('SELECT id FROM customers WHERE id = ?', [
      data.customer_id,
    ])) as any[];
    if (customers.length === 0) {
      errors.push('Customer does not exist');
    }
  }

  // Validate meal_plan_id
  if (!data.meal_plan_id) {
    errors.push('Meal plan is required');
  } else {
    const mealPlans = (await query('SELECT id FROM meal_plans WHERE id = ?', [
      data.meal_plan_id,
    ])) as any[];
    if (mealPlans.length === 0) {
      errors.push('Meal plan does not exist');
    }
  }

  // Validate quantity
  if (!data.quantity || data.quantity < 1) {
    errors.push('Quantity must be at least 1');
  }

  // Validate selected_days
  if (!data.selected_days || !Array.isArray(data.selected_days)) {
    errors.push('Selected days must be an array');
  } else {
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const invalidDays = data.selected_days.filter((day) => !validDays.includes(day));
    if (invalidDays.length > 0) {
      errors.push(`Invalid days: ${invalidDays.join(', ')}`);
    }
  }

  // Validate price
  if (!data.price || data.price <= 0) {
    errors.push('Price must be a positive number');
  }

  // Validate dates
  if (!data.start_date) {
    errors.push('Start date is required');
  }

  if (!data.end_date) {
    errors.push('End date is required');
  }

  if (data.start_date && data.end_date) {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (isNaN(startDate.getTime())) {
      errors.push('Invalid start date format');
    }

    if (isNaN(endDate.getTime())) {
      errors.push('Invalid end date format');
    }

    if (endDate <= startDate) {
      errors.push('End date must be after start date');
    }
  }

  return errors;
}
