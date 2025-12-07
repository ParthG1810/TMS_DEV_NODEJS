import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query } from 'src/config/database';
import {
  CustomerOrderWithDetails,
  UpdateCustomerOrderRequest,
  ApiResponse,
} from 'src/types';

// ----------------------------------------------------------------------

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    await cors(req, res);

    const { id } = req.query;

    // Validate ID
    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID',
      });
    }

    if (req.method === 'GET') {
      return await handleGetCustomerOrder(req, res, parseInt(id));
    } else if (req.method === 'PUT') {
      return await handleUpdateCustomerOrder(req, res, parseInt(id));
    } else if (req.method === 'DELETE') {
      return await handleDeleteCustomerOrder(req, res, parseInt(id));
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in customer order handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/customer-orders/:id
 * Fetch a single customer order by ID
 */
async function handleGetCustomerOrder(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  id: number
) {
  try {
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
      WHERE co.id = ?
      `,
      [id]
    )) as any[];

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Parse JSON selected_days with defensive handling
    let parsedDays: string[];

    // Check if it's already an array (MySQL driver may auto-parse JSON columns)
    if (Array.isArray(orders[0].selected_days)) {
      parsedDays = orders[0].selected_days;
    } else if (typeof orders[0].selected_days === 'string') {
      try {
        parsedDays = JSON.parse(orders[0].selected_days);
      } catch (error) {
        // If parse fails, try to handle as comma-separated string
        parsedDays = orders[0].selected_days.split(',').map((day: string) => day.trim()).filter(Boolean);
      }
    } else {
      parsedDays = [];
    }

    const orderWithParsedDays = {
      ...orders[0],
      selected_days: parsedDays,
    } as CustomerOrderWithDetails;

    return res.status(200).json({
      success: true,
      data: orderWithParsedDays,
    });
  } catch (error: any) {
    console.error('Error fetching customer order:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch customer order',
    });
  }
}

/**
 * PUT /api/customer-orders/:id
 * Update a customer order
 */
async function handleUpdateCustomerOrder(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  id: number
) {
  try {
    let {
      customer_id,
      meal_plan_id,
      quantity,
      selected_days,
      price,
      start_date,
      end_date,
    } = req.body as any; // Use any to allow flexible type handling

    // Robust handling of selected_days - ensure it's always an array if provided
    if (selected_days !== undefined) {
      let daysArray: string[] = [];

      if (Array.isArray(selected_days)) {
        // Already an array - use as is
        daysArray = selected_days;
      } else if (typeof selected_days === 'string') {
        // String format - could be comma-separated or JSON string
        try {
          // Try parsing as JSON first
          daysArray = JSON.parse(selected_days);
        } catch {
          // If JSON parse fails, treat as comma-separated string
          daysArray = selected_days.split(',').map((day: string) => day.trim()).filter(Boolean);
        }
      }

      // Replace selected_days with the parsed array
      selected_days = daysArray as any;
    }

    // Check if order exists
    const existingOrders = (await query('SELECT * FROM customer_orders WHERE id = ?', [
      id,
    ])) as any[];

    if (existingOrders.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (customer_id !== undefined) {
      const customers = (await query('SELECT id FROM customers WHERE id = ?', [
        customer_id,
      ])) as any[];
      if (customers.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Customer does not exist',
        });
      }
      updates.push('customer_id = ?');
      values.push(customer_id);
    }

    if (meal_plan_id !== undefined) {
      const mealPlans = (await query('SELECT id FROM meal_plans WHERE id = ?', [
        meal_plan_id,
      ])) as any[];
      if (mealPlans.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Meal plan does not exist',
        });
      }
      updates.push('meal_plan_id = ?');
      values.push(meal_plan_id);
    }

    if (quantity !== undefined) {
      if (quantity < 1) {
        return res.status(400).json({
          success: false,
          error: 'Quantity must be at least 1',
        });
      }
      updates.push('quantity = ?');
      values.push(quantity);
    }

    if (selected_days !== undefined) {
      if (!Array.isArray(selected_days)) {
        return res.status(400).json({
          success: false,
          error: 'Selected days must be an array',
        });
      }
      const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const invalidDays = selected_days.filter((day) => !validDays.includes(day));
      if (invalidDays.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid days: ${invalidDays.join(', ')}`,
        });
      }
      updates.push('selected_days = ?');
      values.push(JSON.stringify(selected_days));
    }

    if (price !== undefined) {
      if (price <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Price must be a positive number',
        });
      }
      updates.push('price = ?');
      values.push(price);
    }

    if (start_date !== undefined) {
      const startDate = new Date(start_date);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid start date format',
        });
      }
      updates.push('start_date = ?');
      values.push(startDate.toISOString().split('T')[0]);
    }

    if (end_date !== undefined) {
      const endDate = new Date(end_date);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid end date format',
        });
      }
      updates.push('end_date = ?');
      values.push(endDate.toISOString().split('T')[0]);
    }

    // Validate date range if both are provided
    if (start_date !== undefined || end_date !== undefined) {
      const finalStartDate = start_date || existingOrders[0].start_date;
      const finalEndDate = end_date || existingOrders[0].end_date;

      if (new Date(finalEndDate) <= new Date(finalStartDate)) {
        return res.status(400).json({
          success: false,
          error: 'End date must be after start date',
        });
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
      });
    }

    // Add ID to values for WHERE clause
    values.push(id);

    // Execute update
    await query(`UPDATE customer_orders SET ${updates.join(', ')} WHERE id = ?`, values);

    // Fetch updated order with details
    const updatedOrders = (await query(
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
      [id]
    )) as any[];

    // Parse JSON selected_days with defensive handling
    let parsedUpdatedDays: string[];

    // Check if it's already an array (MySQL driver may auto-parse JSON columns)
    if (Array.isArray(updatedOrders[0].selected_days)) {
      parsedUpdatedDays = updatedOrders[0].selected_days;
    } else if (typeof updatedOrders[0].selected_days === 'string') {
      try {
        parsedUpdatedDays = JSON.parse(updatedOrders[0].selected_days);
      } catch (error) {
        // If parse fails, try to handle as comma-separated string
        parsedUpdatedDays = updatedOrders[0].selected_days.split(',').map((day: string) => day.trim()).filter(Boolean);
      }
    } else {
      parsedUpdatedDays = [];
    }

    const orderWithParsedDays = {
      ...updatedOrders[0],
      selected_days: parsedUpdatedDays,
    } as CustomerOrderWithDetails;

    return res.status(200).json({
      success: true,
      data: orderWithParsedDays,
    });
  } catch (error: any) {
    console.error('Error updating customer order:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update customer order',
    });
  }
}

/**
 * DELETE /api/customer-orders/:id
 * Delete a customer order
 */
async function handleDeleteCustomerOrder(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  id: number
) {
  try {
    // Check if order exists
    const existingOrders = (await query('SELECT * FROM customer_orders WHERE id = ?', [
      id,
    ])) as any[];

    if (existingOrders.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Delete order
    await query('DELETE FROM customer_orders WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      data: { message: 'Order deleted successfully' },
    });
  } catch (error: any) {
    console.error('Error deleting customer order:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete customer order',
    });
  }
}
