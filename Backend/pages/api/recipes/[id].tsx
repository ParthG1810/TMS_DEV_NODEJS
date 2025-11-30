import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query, getConnection } from 'src/config/database';
import { parseForm, processUploadedFiles, deleteImages } from 'src/utils/upload';
import {
  RecipeWithDetails,
  UpdateRecipeRequest,
  ApiResponse,
  RecipeIngredientInput,
} from 'src/types';

// ----------------------------------------------------------------------

// Disable Next.js body parser to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

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
        error: 'Recipe ID is required',
      });
    }

    const recipeId = parseInt(id, 10);

    if (isNaN(recipeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipe ID',
      });
    }

    if (req.method === 'GET') {
      return await handleGetRecipe(recipeId, res);
    } else if (req.method === 'PUT') {
      return await handleUpdateRecipe(recipeId, req, res);
    } else if (req.method === 'DELETE') {
      return await handleDeleteRecipe(recipeId, res);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in recipe handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/recipes/:id
 * Fetch a single recipe with ingredients and images
 */
async function handleGetRecipe(
  recipeId: number,
  res: NextApiResponse<ApiResponse>
) {
  try {
    // Fetch recipe
    const recipes = (await query('SELECT * FROM recipes WHERE id = ?', [
      recipeId,
    ])) as any[];

    if (recipes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found',
      });
    }

    // Fetch ingredients with ingredient details
    const ingredients = (await query(
      `SELECT ri.*, i.name as ingredient_name, i.description as ingredient_description,
              v.price as unit_price, v.weight, v.package_size
       FROM recipe_ingredients ri
       JOIN ingredients i ON ri.ingredient_id = i.id
       LEFT JOIN vendors v ON i.id = v.ingredient_id AND v.is_default = true
       WHERE ri.recipe_id = ?`,
      [recipeId]
    )) as any[];

    // Fetch images
    const images = (await query(
      'SELECT * FROM recipe_images WHERE recipe_id = ? ORDER BY display_order',
      [recipeId]
    )) as any[];

    // Calculate total cost
    let totalCost = 0;
    const ingredientsWithPrice = ingredients.map((ing) => {
      const pricePerUnit = ing.unit_price && ing.weight ? ing.unit_price / ing.weight : 0;
      const totalPrice = pricePerUnit * ing.quantity;
      totalCost += totalPrice;

      return {
        ...ing,
        total_price: totalPrice,
      };
    });

    const result: RecipeWithDetails = {
      ...recipes[0],
      ingredients: ingredientsWithPrice,
      images,
      total_cost: totalCost,
    };

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error fetching recipe:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch recipe',
    });
  }
}

/**
 * PUT /api/recipes/:id
 * Update a recipe with ingredients and images
 */
async function handleUpdateRecipe(
  recipeId: number,
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    // Check if recipe exists
    const existingRecipes = (await query('SELECT * FROM recipes WHERE id = ?', [
      recipeId,
    ])) as any[];

    if (existingRecipes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found',
      });
    }

    // Parse multipart form data
    const { fields, files } = await parseForm(req);

    // Extract recipe data from fields
    const name = Array.isArray(fields.name) ? fields.name[0] : fields.name;
    const description = Array.isArray(fields.description)
      ? fields.description[0]
      : fields.description;
    const ingredientsJson = Array.isArray(fields.ingredients)
      ? fields.ingredients[0]
      : fields.ingredients;
    const keepExistingImages = Array.isArray(fields.keepExistingImages)
      ? fields.keepExistingImages[0] === 'true'
      : fields.keepExistingImages === 'true';

    // Parse ingredients JSON if provided
    let ingredients: RecipeIngredientInput[] | undefined;
    if (ingredientsJson) {
      try {
        ingredients = JSON.parse(ingredientsJson);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ingredients format',
        });
      }
    }

    // Validation if updating ingredients
    if (ingredients) {
      const errors = validateIngredientsInput(ingredients);
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: errors.join(', '),
        });
      }
    }

    // Process uploaded images
    let uploadedImages: any[] = [];
    try {
      uploadedImages = processUploadedFiles(files);
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    // Use transaction for atomic operation
    const connection = await getConnection();

    try {
      await connection.beginTransaction();

      // Update recipe if name or description provided
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

        updateValues.push(recipeId);

        await connection.execute(
          `UPDATE recipes SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      // Update ingredients if provided
      if (ingredients) {
        // Delete existing ingredients
        await connection.execute('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [
          recipeId,
        ]);

        // Insert new ingredients
        for (const ingredient of ingredients) {
          await connection.execute(
            'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES (?, ?, ?)',
            [recipeId, ingredient.ingredient_id, ingredient.quantity]
          );
        }
      }

      // Handle images
      if (!keepExistingImages || uploadedImages.length > 0) {
        // Get existing images to delete from filesystem
        const existingImages = (await connection.execute(
          'SELECT image_url FROM recipe_images WHERE recipe_id = ?',
          [recipeId]
        )) as any[];

        const imagesToDelete = existingImages[0].map((img: any) => img.image_url);

        // Delete existing image records
        await connection.execute('DELETE FROM recipe_images WHERE recipe_id = ?', [
          recipeId,
        ]);

        // Insert new images
        for (let i = 0; i < uploadedImages.length; i++) {
          const isPrimary = i === 0; // First image is primary
          await connection.execute(
            'INSERT INTO recipe_images (recipe_id, image_url, is_primary, display_order) VALUES (?, ?, ?, ?)',
            [recipeId, uploadedImages[i].url, isPrimary, i]
          );
        }

        // Delete old images from filesystem after successful DB update
        if (imagesToDelete.length > 0) {
          await deleteImages(imagesToDelete);
        }
      }

      await connection.commit();

      // Fetch updated recipe with details
      const updatedRecipe = (await query('SELECT * FROM recipes WHERE id = ?', [
        recipeId,
      ])) as any[];

      const updatedIngredients = (await query(
        `SELECT ri.*, i.name as ingredient_name
         FROM recipe_ingredients ri
         JOIN ingredients i ON ri.ingredient_id = i.id
         WHERE ri.recipe_id = ?`,
        [recipeId]
      )) as any[];

      const updatedImages = (await query(
        'SELECT * FROM recipe_images WHERE recipe_id = ? ORDER BY display_order',
        [recipeId]
      )) as any[];

      const result: RecipeWithDetails = {
        ...updatedRecipe[0],
        ingredients: updatedIngredients,
        images: updatedImages,
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
    console.error('Error updating recipe:', error);

    // Handle foreign key constraint error
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ingredient ID in ingredients',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update recipe',
    });
  }
}

/**
 * DELETE /api/recipes/:id
 * Delete a recipe and its images (CASCADE)
 */
async function handleDeleteRecipe(
  recipeId: number,
  res: NextApiResponse<ApiResponse>
) {
  try {
    // Check if recipe exists
    const recipes = (await query('SELECT * FROM recipes WHERE id = ?', [
      recipeId,
    ])) as any[];

    if (recipes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recipe not found',
      });
    }

    // Get images to delete from filesystem
    const images = (await query(
      'SELECT image_url FROM recipe_images WHERE recipe_id = ?',
      [recipeId]
    )) as any[];

    const imagesToDelete = images.map((img: any) => img.image_url);

    // Delete recipe (ingredients and images will be deleted automatically due to CASCADE)
    await query('DELETE FROM recipes WHERE id = ?', [recipeId]);

    // Delete images from filesystem
    if (imagesToDelete.length > 0) {
      await deleteImages(imagesToDelete);
    }

    return res.status(200).json({
      success: true,
      data: { id: recipeId },
    });
  } catch (error: any) {
    console.error('Error deleting recipe:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete recipe',
    });
  }
}

/**
 * Validate ingredients input data
 */
function validateIngredientsInput(ingredients: RecipeIngredientInput[]): string[] {
  const errors: string[] = [];

  if (ingredients.length === 0) {
    errors.push('At least one ingredient is required');
  }

  ingredients.forEach((ingredient: RecipeIngredientInput, index: number) => {
    if (!ingredient.ingredient_id) {
      errors.push(`Ingredient ${index + 1}: ingredient ID is required`);
    }

    if (!ingredient.quantity || ingredient.quantity <= 0) {
      errors.push(`Ingredient ${index + 1}: quantity must be a positive number`);
    }
  });

  return errors;
}
