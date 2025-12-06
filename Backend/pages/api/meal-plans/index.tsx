import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query } from 'src/config/database';
import {
  MealPlan,
  CreateMealPlanRequest,
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
      return await handleGetMealPlans(req, res);
    } else if (req.method === 'POST') {
      return await handleCreateMealPlan(req, res);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in meal plans handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/meal-plans
 * Fetch all meal plans
 */
async function handleGetMealPlans(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const mealPlans = (await query(
      'SELECT * FROM meal_plans ORDER BY created_at DESC'
    )) as MealPlan[];

    return res.status(200).json({
      success: true,
      data: mealPlans,
    });
  } catch (error: any) {
    console.error('Error fetching meal plans:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch meal plans',
    });
  }
}

/**
 * POST /api/meal-plans
 * Create a new meal plan
 */
async function handleCreateMealPlan(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const { meal_name, description, frequency, days, price } = req.body as CreateMealPlanRequest;

    // Validation
    const errors = validateMealPlanInput({ meal_name, description, frequency, days, price });
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors.join(', '),
      });
    }

    // Business rule: If frequency is 'Daily', set days to 'Single'
    let finalDays = days || 'Single';
    if (frequency === 'Daily') {
      finalDays = 'Single';
    }

    // Insert meal plan
    const result = (await query(
      'INSERT INTO meal_plans (meal_name, description, frequency, days, price) VALUES (?, ?, ?, ?, ?)',
      [meal_name, description || null, frequency, finalDays, price]
    )) as any;

    const mealPlanId = result.insertId;

    // Fetch the created meal plan
    const createdMealPlan = (await query('SELECT * FROM meal_plans WHERE id = ?', [
      mealPlanId,
    ])) as MealPlan[];

    return res.status(201).json({
      success: true,
      data: createdMealPlan[0],
    });
  } catch (error: any) {
    console.error('Error creating meal plan:', error);

    // Handle duplicate entry error
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'Meal plan with this name already exists',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create meal plan',
    });
  }
}

/**
 * Validate meal plan input data
 */
function validateMealPlanInput(data: CreateMealPlanRequest): string[] {
  const errors: string[] = [];

  // Validate meal_name
  if (!data.meal_name || data.meal_name.trim() === '') {
    errors.push('Meal name is required');
  }

  if (data.meal_name && data.meal_name.length > 255) {
    errors.push('Meal name must be less than 255 characters');
  }

  // Validate frequency
  const validFrequencies = ['Daily', 'Weekly', 'Monthly'];
  if (!data.frequency || !validFrequencies.includes(data.frequency)) {
    errors.push('Frequency must be one of: Daily, Weekly, Monthly');
  }

  // Validate days
  const validDays = ['Mon-Fri', 'Mon-Sat', 'Single'];
  if (data.days && !validDays.includes(data.days)) {
    errors.push('Days must be one of: Mon-Fri, Mon-Sat, Single');
  }

  // Validate price
  if (!data.price || data.price <= 0) {
    errors.push('Price must be a positive number');
  }

  return errors;
}
