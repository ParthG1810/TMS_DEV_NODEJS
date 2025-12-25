import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query, getConnection } from 'src/config/database';
import {
  CustomerWithPrintOrder,
  UpdateCustomerPrintOrderRequest,
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
      return await handleGetCustomerPrintOrder(req, res);
    } else if (req.method === 'PUT') {
      return await handleUpdatePrintOrder(req, res);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in customer-print-order handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/customer-print-order
 * Fetch all customers ordered by their print order
 */
async function handleGetCustomerPrintOrder(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    // Get customers with print order (use view if available, fallback to query)
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

    return res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error: any) {
    console.error('Error fetching customer print order:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch customer print order',
    });
  }
}

/**
 * PUT /api/customer-print-order
 * Bulk update customer print orders
 */
async function handleUpdatePrintOrder(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const connection = await getConnection();

  try {
    const { orders } = req.body as UpdateCustomerPrintOrderRequest;

    // Validation
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Orders array is required',
      });
    }

    // Validate each order item
    for (const order of orders) {
      if (!order.customer_id || order.print_order === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Each order must have customer_id and print_order',
        });
      }
    }

    await connection.beginTransaction();

    // Delete existing print orders for the customers being updated
    const customerIds = orders.map((o) => o.customer_id);
    await connection.query(
      `DELETE FROM customer_print_order WHERE customer_id IN (${customerIds.map(() => '?').join(',')})`,
      customerIds
    );

    // Insert new print orders
    const insertValues = orders.map((o) => [o.customer_id, o.print_order]);
    for (const [customerId, printOrder] of insertValues) {
      await connection.query(
        'INSERT INTO customer_print_order (customer_id, print_order) VALUES (?, ?)',
        [customerId, printOrder]
      );
    }

    await connection.commit();

    // Fetch updated customer list
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

    return res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Error updating customer print order:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update customer print order',
    });
  } finally {
    connection.release();
  }
}
