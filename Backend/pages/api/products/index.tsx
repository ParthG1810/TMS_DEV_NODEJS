import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query, getConnection } from 'src/config/database';
import {
  ProductWithVendors,
  CreateProductRequest,
  ApiResponse,
  VendorInput,
} from 'src/types';

// ----------------------------------------------------------------------

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    await cors(req, res);

    if (req.method === 'GET') {
      return await handleGetProducts(req, res);
    } else if (req.method === 'POST') {
      return await handleCreateProduct(req, res);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in products handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/products
 * Fetch all products with their vendors
 */
async function handleGetProducts(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    // Fetch all products
    const products = (await query('SELECT * FROM products ORDER BY created_at DESC')) as any[];

    // Fetch vendors for each product
    const productsWithVendors: ProductWithVendors[] = [];

    for (const product of products) {
      const vendors = (await query('SELECT * FROM vendors WHERE product_id = ?', [
        product.id,
      ])) as any[];

      productsWithVendors.push({
        ...product,
        vendors,
      });
    }

    return res.status(200).json({
      success: true,
      data: productsWithVendors,
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
    });
  }
}

/**
 * POST /api/products
 * Create a new product with vendors
 */
async function handleCreateProduct(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const { name, description, vendors } = req.body as CreateProductRequest;

    // Validation
    const errors = validateProductInput({ name, description, vendors });
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors.join(', '),
      });
    }

    // Ensure at least one vendor is marked as default
    const hasDefault = vendors.some((v) => v.is_default);
    if (!hasDefault && vendors.length > 0) {
      vendors[0].is_default = true;
    }

    // Use transaction for atomic operation
    const connection = await getConnection();

    try {
      await connection.beginTransaction();

      // Insert product
      const [productResult] = await connection.execute(
        'INSERT INTO products (name, description) VALUES (?, ?)',
        [name, description || null]
      );
      const productId = (productResult as any).insertId;

      // Insert vendors
      for (const vendor of vendors) {
        await connection.execute(
          'INSERT INTO vendors (product_id, vendor_name, price, weight, package_size, is_default) VALUES (?, ?, ?, ?, ?, ?)',
          [
            productId,
            vendor.vendor_name,
            vendor.price,
            vendor.weight,
            vendor.package_size,
            vendor.is_default,
          ]
        );
      }

      await connection.commit();

      // Fetch the created product with vendors
      const createdProduct = (await query('SELECT * FROM products WHERE id = ?', [
        productId,
      ])) as any[];

      const createdVendors = (await query('SELECT * FROM vendors WHERE product_id = ?', [
        productId,
      ])) as any[];

      const result: ProductWithVendors = {
        ...createdProduct[0],
        vendors: createdVendors,
      };

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Error creating product:', error);

    // Handle duplicate entry error
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'Product with this name already exists',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create product',
    });
  }
}

/**
 * Validate product input data
 */
function validateProductInput(data: CreateProductRequest): string[] {
  const errors: string[] = [];

  // Validate name
  if (!data.name || data.name.trim() === '') {
    errors.push('Product name is required');
  }

  if (data.name && data.name.length > 255) {
    errors.push('Product name must be less than 255 characters');
  }

  // Validate vendors
  if (!data.vendors || data.vendors.length === 0) {
    errors.push('At least one vendor is required');
  }

  if (data.vendors && data.vendors.length > 3) {
    errors.push('Maximum of 3 vendors allowed per product');
  }

  // Validate each vendor
  if (data.vendors) {
    data.vendors.forEach((vendor: VendorInput, index: number) => {
      if (!vendor.vendor_name || vendor.vendor_name.trim() === '') {
        errors.push(`Vendor ${index + 1}: name is required`);
      }

      if (!vendor.price || vendor.price <= 0) {
        errors.push(`Vendor ${index + 1}: price must be a positive number`);
      }

      if (!vendor.weight || vendor.weight <= 0) {
        errors.push(`Vendor ${index + 1}: weight must be a positive number`);
      }

      const validSizes = ['tsp', 'tbsp', 'c', 'pt', 'qt', 'gal', 'fl_oz', 'oz', 'lb', 'g', 'kg', 'ml', 'l', 'pcs'];
      if (!vendor.package_size || !validSizes.includes(vendor.package_size)) {
        errors.push(
          `Vendor ${index + 1}: package size must be one of: ${validSizes.join(', ')}`
        );
      }
    });
  }

  return errors;
}
