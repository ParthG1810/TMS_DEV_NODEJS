import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query } from 'src/config/database';
import {
  CustomerWithPrintOrder,
  LabelPrintData,
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
      return await handleGetCustomersForPrint(req, res);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in print-labels customers handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/print-labels/customers
 * Fetch all customers for label printing, ordered by print order
 * Optionally includes active order details
 */
async function handleGetCustomersForPrint(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const { include_orders } = req.query;

    // Get customers with print order
    const customers = (await query(`
      SELECT
        c.id,
        c.name,
        c.phone,
        c.address,
        COALESCE(cpo.print_order, 999999) as print_order,
        c.created_at,
        c.updated_at
      FROM customers c
      LEFT JOIN customer_print_order cpo ON c.id = cpo.customer_id
      ORDER BY COALESCE(cpo.print_order, 999999) ASC, c.name ASC
    `)) as CustomerWithPrintOrder[];

    // If requested, include active order information
    if (include_orders === 'true') {
      const today = new Date().toISOString().split('T')[0];

      const customersWithOrders = await Promise.all(
        customers.map(async (customer) => {
          // Get active orders for this customer
          const activeOrders = (await query(
            `SELECT co.*, mp.meal_name as meal_plan_name
             FROM customer_orders co
             INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
             WHERE co.customer_id = ?
               AND co.start_date <= ?
               AND co.end_date >= ?
             ORDER BY co.created_at DESC`,
            [customer.id, today, today]
          )) as any[];

          // Calculate total quantity from active orders
          const totalQuantity = activeOrders.reduce(
            (sum, order) => sum + (order.quantity || 1),
            0
          );

          // Get meal plan names
          const mealPlanNames = Array.from(new Set(activeOrders.map((o) => o.meal_plan_name))).join(', ');

          return {
            ...customer,
            active_orders: activeOrders.length,
            total_quantity: totalQuantity || 1,
            meal_plan_name: mealPlanNames || null,
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: customersWithOrders,
      });
    }

    // Transform to LabelPrintData format for easy frontend consumption
    const labelData: LabelPrintData[] = customers.map((customer, index) => ({
      customer_id: customer.id,
      customer_name: customer.name,
      customer_address: customer.address,
      customer_phone: customer.phone,
      current_date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      serial_number: String(index + 1).padStart(3, '0'),
    }));

    return res.status(200).json({
      success: true,
      data: {
        customers,
        labelData,
      },
    });
  } catch (error: any) {
    console.error('Error fetching customers for print:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch customers for printing',
    });
  }
}
