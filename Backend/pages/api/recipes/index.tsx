import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query, getConnection } from 'src/config/database';
import { parseForm, processUploadedFiles } from 'src/utils/upload';
import {
  RecipeWithDetails,
  CreateRecipeRequest,
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

    if (req.method === 'GET') {
      return await handleGetRecipes(req, res);
    } else if (req.method === 'POST') {
      return await handleCreateRecipe(req, res);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in recipes handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/recipes
 * Fetch all recipes with ingredients and images
 */
async function handleGetRecipes(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    // Fetch all recipes
    const recipes = (await query('SELECT * FROM recipes ORDER BY created_at DESC')) as any[];

    const recipesWithDetails: RecipeWithDetails[] = [];

    for (const recipe of recipes) {
      // Fetch ingredients with ingredient details
      const ingredients = (await query(
        `SELECT ri.*, i.name as ingredient_name, i.description as ingredient_description,
                v.price as unit_price, v.weight, v.package_size
         FROM recipe_ingredients ri
         JOIN ingredients i ON ri.ingredient_id = i.id
         LEFT JOIN vendors v ON i.id = v.ingredient_id AND v.is_default = true
         WHERE ri.recipe_id = ?`,
        [recipe.id]
      )) as any[];

      // Fetch images
      const images = (await query(
        'SELECT * FROM recipe_images WHERE recipe_id = ? ORDER BY display_order',
        [recipe.id]
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

      recipesWithDetails.push({
        ...recipe,
        ingredients: ingredientsWithPrice,
        images,
        total_cost: totalCost,
      });
    }

    return res.status(200).json({
      success: true,
      data: recipesWithDetails,
    });
  } catch (error: any) {
    console.error('Error fetching recipes:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch recipes',
    });
  }
}

/**
 * POST /api/recipes
 * Create a new recipe with ingredients and images
 */
async function handleCreateRecipe(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
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

    // Parse ingredients JSON
    let ingredients: RecipeIngredientInput[] = [];
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

    // Validation
    const errors = validateRecipeInput({ name, description, ingredients });
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors.join(', '),
      });
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

      // Insert recipe
      const [recipeResult] = await connection.execute(
        'INSERT INTO recipes (name, description) VALUES (?, ?)',
        [name, description || null]
      );
      const recipeId = (recipeResult as any).insertId;

      // Insert ingredients
      for (const ingredient of ingredients) {
        await connection.execute(
          'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES (?, ?, ?)',
          [recipeId, ingredient.ingredient_id, ingredient.quantity]
        );
      }

      // Insert images
      for (let i = 0; i < uploadedImages.length; i++) {
        const isPrimary = i === 0; // First image is primary
        await connection.execute(
          'INSERT INTO recipe_images (recipe_id, image_url, is_primary, display_order) VALUES (?, ?, ?, ?)',
          [recipeId, uploadedImages[i].url, isPrimary, i]
        );
      }

      await connection.commit();

      // Fetch the created recipe with details
      const createdRecipe = (await query('SELECT * FROM recipes WHERE id = ?', [
        recipeId,
      ])) as any[];

      const createdIngredients = (await query(
        `SELECT ri.*, i.name as ingredient_name
         FROM recipe_ingredients ri
         JOIN ingredients i ON ri.ingredient_id = i.id
         WHERE ri.recipe_id = ?`,
        [recipeId]
      )) as any[];

      const createdImages = (await query(
        'SELECT * FROM recipe_images WHERE recipe_id = ?',
        [recipeId]
      )) as any[];

      const result: RecipeWithDetails = {
        ...createdRecipe[0],
        ingredients: createdIngredients,
        images: createdImages,
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
    console.error('Error creating recipe:', error);

    // Handle foreign key constraint error
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ingredient ID in ingredients',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create recipe',
    });
  }
}

/**
 * Validate recipe input data
 */
function validateRecipeInput(data: {
  name?: string;
  description?: string;
  ingredients: RecipeIngredientInput[];
}): string[] {
  const errors: string[] = [];

  // Validate name
  if (!data.name || data.name.trim() === '') {
    errors.push('Recipe name is required');
  }

  if (data.name && data.name.length > 255) {
    errors.push('Recipe name must be less than 255 characters');
  }

  // Validate ingredients
  if (!data.ingredients || data.ingredients.length === 0) {
    errors.push('At least one ingredient is required');
  }

  // Validate each ingredient
  if (data.ingredients) {
    data.ingredients.forEach((ingredient: RecipeIngredientInput, index: number) => {
      if (!ingredient.ingredient_id) {
        errors.push(`Ingredient ${index + 1}: ingredient ID is required`);
      }

      if (!ingredient.quantity || ingredient.quantity <= 0) {
        errors.push(`Ingredient ${index + 1}: quantity must be a positive number`);
      }
    });
  }

  return errors;
}
