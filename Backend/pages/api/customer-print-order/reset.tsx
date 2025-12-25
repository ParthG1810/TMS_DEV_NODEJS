import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query, getConnection } from 'src/config/database';
import {
  CustomerWithPrintOrder,
  ApiResponse,
} from 'src/types';

// ----------------------------------------------------------------------

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    await cors(req, res);

    if (req.method === 'POST') {
      return await handleResetPrintOrder(req, res);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in customer-print-order reset handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * POST /api/customer-print-order/reset
 * Reset customer print order to alphabetical order
 */
async function handleResetPrintOrder(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    // Delete all existing print orders
    await connection.query('DELETE FROM customer_print_order');

    // Get all customers ordered alphabetically
    const customers = (await connection.query(
      'SELECT id FROM customers ORDER BY name ASC'
    )) as any[];

    // Insert print orders in alphabetical order
    let printOrder = 0;
    for (const customer of customers[0]) {
      await connection.query(
        'INSERT INTO customer_print_order (customer_id, print_order) VALUES (?, ?)',
        [customer.id, printOrder]
      );
      printOrder++;
    }

    await connection.commit();

    // Fetch updated customer list
    const updatedCustomers = (await query(`
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
      data: {
        message: `Print order reset to alphabetical for ${printOrder} customers`,
        customers: updatedCustomers,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Error resetting customer print order:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset customer print order',
    });
  } finally {
    connection.release();
  }
}
