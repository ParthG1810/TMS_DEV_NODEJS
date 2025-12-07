import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query } from 'src/config/database';
import {
  Customer,
  CreateCustomerRequest,
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
      return await handleGetCustomers(req, res);
    } else if (req.method === 'POST') {
      return await handleCreateCustomer(req, res);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in customers handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/customers
 * Fetch all customers
 */
async function handleGetCustomers(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const customers = (await query(
      'SELECT * FROM customers ORDER BY created_at DESC'
    )) as Customer[];

    return res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch customers',
    });
  }
}

/**
 * POST /api/customers
 * Create a new customer
 */
async function handleCreateCustomer(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const { name, phone, address } = req.body as CreateCustomerRequest;

    // Validation
    const errors = validateCustomerInput({ name, phone, address });
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors.join(', '),
      });
    }

    // Check for duplicate customer by phone number (if phone is provided)
    if (phone && phone.trim() !== '') {
      const duplicateCheck = (await query(
        'SELECT id FROM customers WHERE phone = ? LIMIT 1',
        [phone.trim()]
      )) as any[];

      if (duplicateCheck.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Duplicate customer: A customer with this phone number already exists',
        });
      }
    }

    // Insert customer
    const result = (await query(
      'INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)',
      [name, phone || null, address]
    )) as any;

    const customerId = result.insertId;

    // Fetch the created customer
    const createdCustomer = (await query('SELECT * FROM customers WHERE id = ?', [
      customerId,
    ])) as Customer[];

    return res.status(201).json({
      success: true,
      data: createdCustomer[0],
    });
  } catch (error: any) {
    console.error('Error creating customer:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to create customer',
    });
  }
}

/**
 * Validate customer input data
 */
function validateCustomerInput(data: CreateCustomerRequest): string[] {
  const errors: string[] = [];

  // Validate name
  if (!data.name || data.name.trim() === '') {
    errors.push('Customer name is required');
  }

  if (data.name && data.name.length > 255) {
    errors.push('Customer name must be less than 255 characters');
  }

  // Validate phone (optional but validate format if provided)
  if (data.phone && data.phone.length > 50) {
    errors.push('Phone number must be less than 50 characters');
  }

  // Validate address
  if (!data.address || data.address.trim() === '') {
    errors.push('Address is required');
  }

  return errors;
}
