import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query } from 'src/config/database';
import {
  Customer,
  UpdateCustomerRequest,
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
        error: 'Invalid customer ID',
      });
    }

    if (req.method === 'GET') {
      return await handleGetCustomer(req, res, parseInt(id));
    } else if (req.method === 'PUT') {
      return await handleUpdateCustomer(req, res, parseInt(id));
    } else if (req.method === 'DELETE') {
      return await handleDeleteCustomer(req, res, parseInt(id));
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in customer handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/customers/:id
 * Fetch a single customer by ID
 */
async function handleGetCustomer(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  id: number
) {
  try {
    const customers = (await query('SELECT * FROM customers WHERE id = ?', [id])) as Customer[];

    if (customers.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: customers[0],
    });
  } catch (error: any) {
    console.error('Error fetching customer:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch customer',
    });
  }
}

/**
 * PUT /api/customers/:id
 * Update a customer
 */
async function handleUpdateCustomer(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  id: number
) {
  try {
    const { name, phone, address } = req.body as UpdateCustomerRequest;

    // Check if customer exists
    const existingCustomers = (await query('SELECT * FROM customers WHERE id = ?', [
      id,
    ])) as Customer[];

    if (existingCustomers.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      if (name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Customer name cannot be empty',
        });
      }
      if (name.length > 255) {
        return res.status(400).json({
          success: false,
          error: 'Customer name must be less than 255 characters',
        });
      }
      updates.push('name = ?');
      values.push(name);
    }

    if (phone !== undefined) {
      if (phone && phone.length > 50) {
        return res.status(400).json({
          success: false,
          error: 'Phone number must be less than 50 characters',
        });
      }

      // Check for duplicate phone number (if phone is provided and not empty)
      if (phone && phone.trim() !== '') {
        const duplicateCheck = (await query(
          'SELECT id FROM customers WHERE phone = ? AND id != ? LIMIT 1',
          [phone.trim(), id]
        )) as any[];

        if (duplicateCheck.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Duplicate customer: A customer with this phone number already exists',
          });
        }
      }

      updates.push('phone = ?');
      values.push(phone || null);
    }

    if (address !== undefined) {
      if (address.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Address cannot be empty',
        });
      }
      updates.push('address = ?');
      values.push(address);
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
    await query(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`, values);

    // Fetch updated customer
    const updatedCustomers = (await query('SELECT * FROM customers WHERE id = ?', [
      id,
    ])) as Customer[];

    return res.status(200).json({
      success: true,
      data: updatedCustomers[0],
    });
  } catch (error: any) {
    console.error('Error updating customer:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update customer',
    });
  }
}

/**
 * DELETE /api/customers/:id
 * Delete a customer (cascade deletes their orders)
 */
async function handleDeleteCustomer(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  id: number
) {
  try {
    // Check if customer exists
    const existingCustomers = (await query('SELECT * FROM customers WHERE id = ?', [
      id,
    ])) as Customer[];

    if (existingCustomers.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }

    // Delete customer (orders will be cascade deleted due to FK constraint)
    await query('DELETE FROM customers WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      data: { message: 'Customer deleted successfully' },
    });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete customer',
    });
  }
}
