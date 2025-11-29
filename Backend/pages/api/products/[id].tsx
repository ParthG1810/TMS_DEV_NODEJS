import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query, getConnection } from 'src/config/database';
import {
  ProductWithVendors,
  UpdateProductRequest,
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

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required',
      });
    }

    const productId = parseInt(id, 10);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID',
      });
    }

    if (req.method === 'GET') {
      return await handleGetProduct(productId, res);
    } else if (req.method === 'PUT') {
      return await handleUpdateProduct(productId, req, res);
    } else if (req.method === 'DELETE') {
      return await handleDeleteProduct(productId, res);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in product handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/products/:id
 * Fetch a single product with vendors
 */
async function handleGetProduct(
  productId: number,
  res: NextApiResponse<ApiResponse>
) {
  try {
    // Fetch product
    const products = (await query('SELECT * FROM products WHERE id = ?', [
      productId,
    ])) as any[];

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    // Fetch vendors
    const vendors = (await query('SELECT * FROM vendors WHERE product_id = ?', [
      productId,
    ])) as any[];

    const result: ProductWithVendors = {
      ...products[0],
      vendors,
    };

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error fetching product:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch product',
    });
  }
}

/**
 * PUT /api/products/:id
 * Update a product and its vendors
 */
async function handleUpdateProduct(
  productId: number,
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const { name, description, vendors } = req.body as UpdateProductRequest;

    // Check if product exists
    const existingProducts = (await query('SELECT * FROM products WHERE id = ?', [
      productId,
    ])) as any[];

    if (existingProducts.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    // Validation if updating vendors
    if (vendors) {
      const errors = validateVendorsInput(vendors);
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
    }

    // Use transaction for atomic operation
    const connection = await getConnection();

    try {
      await connection.beginTransaction();

      // Update product if name or description provided
      if (name !== undefined || description !== undefined) {
        const updateFields: string[] = [];
        const updateValues: any[] = [];

        if (name !== undefined) {
          updateFields.push('name = ?');
          updateValues.push(name);
        }

        if (description !== undefined) {
          updateFields.push('description = ?');
          updateValues.push(description || null);
        }

        updateValues.push(productId);

        await connection.execute(
          `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      // Update vendors if provided
      if (vendors) {
        // Delete existing vendors
        await connection.execute('DELETE FROM vendors WHERE product_id = ?', [
          productId,
        ]);

        // Insert new vendors
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
      }

      await connection.commit();

      // Fetch updated product with vendors
      const updatedProduct = (await query('SELECT * FROM products WHERE id = ?', [
        productId,
      ])) as any[];

      const updatedVendors = (await query('SELECT * FROM vendors WHERE product_id = ?', [
        productId,
      ])) as any[];

      const result: ProductWithVendors = {
        ...updatedProduct[0],
        vendors: updatedVendors,
      };

      return res.status(200).json({
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
    console.error('Error updating product:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update product',
    });
  }
}

/**
 * DELETE /api/products/:id
 * Delete a product and its vendors (CASCADE)
 */
async function handleDeleteProduct(
  productId: number,
  res: NextApiResponse<ApiResponse>
) {
  try {
    // Check if product exists
    const products = (await query('SELECT * FROM products WHERE id = ?', [
      productId,
    ])) as any[];

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    // Check if product is used in any recipes
    const recipeIngredients = (await query(
      'SELECT * FROM recipe_ingredients WHERE product_id = ?',
      [productId]
    )) as any[];

    if (recipeIngredients.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete product: it is used in one or more recipes',
      });
    }

    // Delete product (vendors will be deleted automatically due to CASCADE)
    await query('DELETE FROM products WHERE id = ?', [productId]);

    return res.status(200).json({
      success: true,
      data: { id: productId },
    });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete product',
    });
  }
}

/**
 * Validate vendors input data
 */
function validateVendorsInput(vendors: VendorInput[]): string[] {
  const errors: string[] = [];

  if (vendors.length === 0) {
    errors.push('At least one vendor is required');
  }

  if (vendors.length > 3) {
    errors.push('Maximum of 3 vendors allowed per product');
  }

  vendors.forEach((vendor: VendorInput, index: number) => {
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

  return errors;
}
