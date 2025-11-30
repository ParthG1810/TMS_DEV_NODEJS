import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query, getConnection } from 'src/config/database';
import {
  IngredientWithVendors,
  CreateIngredientRequest,
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
      return await handleGetIngredients(req, res);
    } else if (req.method === 'POST') {
      return await handleCreateIngredient(req, res);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in ingredients handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/ingredients
 * Fetch all ingredients with their vendors
 */
async function handleGetIngredients(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    // Fetch all ingredients
    const ingredients = (await query('SELECT * FROM ingredients ORDER BY created_at DESC')) as any[];

    // Fetch vendors for each ingredient
    const ingredientsWithVendors: IngredientWithVendors[] = [];

    for (const ingredient of ingredients) {
      const vendors = (await query('SELECT * FROM vendors WHERE ingredient_id = ?', [
        ingredient.id,
      ])) as any[];

      ingredientsWithVendors.push({
        ...ingredient,
        vendors,
      });
    }

    return res.status(200).json({
      success: true,
      data: ingredientsWithVendors,
    });
  } catch (error: any) {
    console.error('Error fetching ingredients:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch ingredients',
    });
  }
}

/**
 * POST /api/ingredients
 * Create a new ingredient with vendors
 */
async function handleCreateIngredient(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const { name, description, vendors } = req.body as CreateIngredientRequest;

    // Validation
    const errors = validateIngredientInput({ name, description, vendors });
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

      // Insert ingredient
      const [ingredientResult] = await connection.execute(
        'INSERT INTO ingredients (name, description) VALUES (?, ?)',
        [name, description || null]
      );
      const ingredientId = (ingredientResult as any).insertId;

      // Insert vendors
      for (const vendor of vendors) {
        await connection.execute(
          'INSERT INTO vendors (ingredient_id, vendor_name, price, weight, package_size, is_default) VALUES (?, ?, ?, ?, ?, ?)',
          [
            ingredientId,
            vendor.vendor_name,
            vendor.price,
            vendor.weight,
            vendor.package_size,
            vendor.is_default,
          ]
        );
      }

      await connection.commit();

      // Fetch the created ingredient with vendors
      const createdIngredient = (await query('SELECT * FROM ingredients WHERE id = ?', [
        ingredientId,
      ])) as any[];

      const createdVendors = (await query('SELECT * FROM vendors WHERE ingredient_id = ?', [
        ingredientId,
      ])) as any[];

      const result: IngredientWithVendors = {
        ...createdIngredient[0],
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
    console.error('Error creating ingredient:', error);

    // Handle duplicate entry error
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'Ingredient with this name already exists',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create ingredient',
    });
  }
}

/**
 * Validate ingredient input data
 */
function validateIngredientInput(data: CreateIngredientRequest): string[] {
  const errors: string[] = [];

  // Validate name
  if (!data.name || data.name.trim() === '') {
    errors.push('Ingredient name is required');
  }

  if (data.name && data.name.length > 255) {
    errors.push('Ingredient name must be less than 255 characters');
  }

  // Validate vendors
  if (!data.vendors || data.vendors.length === 0) {
    errors.push('At least one vendor is required');
  }

  if (data.vendors && data.vendors.length > 3) {
    errors.push('Maximum of 3 vendors allowed per ingredient');
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
