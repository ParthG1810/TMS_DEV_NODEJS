import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query, getConnection } from 'src/config/database';
import {
  IngredientWithVendors,
  UpdateIngredientRequest,
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
        error: 'Ingredient ID is required',
      });
    }

    const ingredientId = parseInt(id, 10);

    if (isNaN(ingredientId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ingredient ID',
      });
    }

    if (req.method === 'GET') {
      return await handleGetIngredient(ingredientId, res);
    } else if (req.method === 'PUT') {
      return await handleUpdateIngredient(ingredientId, req, res);
    } else if (req.method === 'DELETE') {
      return await handleDeleteIngredient(ingredientId, res);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in ingredient handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/ingredients/:id
 * Fetch a single ingredient with vendors
 */
async function handleGetIngredient(
  ingredientId: number,
  res: NextApiResponse<ApiResponse>
) {
  try {
    // Fetch ingredient
    const ingredients = (await query('SELECT * FROM ingredients WHERE id = ?', [
      ingredientId,
    ])) as any[];

    if (ingredients.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found',
      });
    }

    // Fetch vendors
    const vendors = (await query('SELECT * FROM vendors WHERE ingredient_id = ?', [
      ingredientId,
    ])) as any[];

    const result: IngredientWithVendors = {
      ...ingredients[0],
      vendors,
    };

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error fetching ingredient:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch ingredient',
    });
  }
}

/**
 * PUT /api/ingredients/:id
 * Update a ingredient and its vendors
 */
async function handleUpdateIngredient(
  ingredientId: number,
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const { name, description, vendors } = req.body as UpdateIngredientRequest;

    // Check if ingredient exists
    const existingIngredients = (await query('SELECT * FROM ingredients WHERE id = ?', [
      ingredientId,
    ])) as any[];

    if (existingIngredients.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found',
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

      // Update ingredient if name or description provided
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

        updateValues.push(ingredientId);

        await connection.execute(
          `UPDATE ingredients SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      // Update vendors if provided
      if (vendors) {
        // Delete existing vendors
        await connection.execute('DELETE FROM vendors WHERE ingredient_id = ?', [
          ingredientId,
        ]);

        // Insert new vendors
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
      }

      await connection.commit();

      // Fetch updated ingredient with vendors
      const updatedIngredient = (await query('SELECT * FROM ingredients WHERE id = ?', [
        ingredientId,
      ])) as any[];

      const updatedVendors = (await query('SELECT * FROM vendors WHERE ingredient_id = ?', [
        ingredientId,
      ])) as any[];

      const result: IngredientWithVendors = {
        ...updatedIngredient[0],
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
    console.error('Error updating ingredient:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update ingredient',
    });
  }
}

/**
 * DELETE /api/ingredients/:id
 * Delete a ingredient and its vendors (CASCADE)
 */
async function handleDeleteIngredient(
  ingredientId: number,
  res: NextApiResponse<ApiResponse>
) {
  try {
    // Check if ingredient exists
    const ingredients = (await query('SELECT * FROM ingredients WHERE id = ?', [
      ingredientId,
    ])) as any[];

    if (ingredients.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found',
      });
    }

    // Check if ingredient is used in any recipes
    const recipeIngredients = (await query(
      'SELECT * FROM recipe_ingredients WHERE ingredient_id = ?',
      [ingredientId]
    )) as any[];

    if (recipeIngredients.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete ingredient: it is used in one or more recipes',
      });
    }

    // Delete ingredient (vendors will be deleted automatically due to CASCADE)
    await query('DELETE FROM ingredients WHERE id = ?', [ingredientId]);

    return res.status(200).json({
      success: true,
      data: { id: ingredientId },
    });
  } catch (error: any) {
    console.error('Error deleting ingredient:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete ingredient',
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
    errors.push('Maximum of 3 vendors allowed per ingredient');
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
