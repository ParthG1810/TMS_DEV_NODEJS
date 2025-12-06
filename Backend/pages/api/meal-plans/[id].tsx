import { NextApiRequest, NextApiResponse } from 'next';
import cors from 'src/utils/cors';
import { query } from 'src/config/database';
import {
  MealPlan,
  UpdateMealPlanRequest,
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
        error: 'Invalid meal plan ID',
      });
    }

    if (req.method === 'GET') {
      return await handleGetMealPlan(req, res, parseInt(id));
    } else if (req.method === 'PUT') {
      return await handleUpdateMealPlan(req, res, parseInt(id));
    } else if (req.method === 'DELETE') {
      return await handleDeleteMealPlan(req, res, parseInt(id));
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
      });
    }
  } catch (error: any) {
    console.error('Error in meal plan handler:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/meal-plans/:id
 * Fetch a single meal plan by ID
 */
async function handleGetMealPlan(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  id: number
) {
  try {
    const mealPlans = (await query('SELECT * FROM meal_plans WHERE id = ?', [id])) as MealPlan[];

    if (mealPlans.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Meal plan not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: mealPlans[0],
    });
  } catch (error: any) {
    console.error('Error fetching meal plan:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch meal plan',
    });
  }
}

/**
 * PUT /api/meal-plans/:id
 * Update a meal plan
 */
async function handleUpdateMealPlan(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  id: number
) {
  try {
    const { meal_name, description, frequency, days, price } = req.body as UpdateMealPlanRequest;

    // Check if meal plan exists
    const existingMealPlans = (await query('SELECT * FROM meal_plans WHERE id = ?', [
      id,
    ])) as MealPlan[];

    if (existingMealPlans.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Meal plan not found',
      });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (meal_name !== undefined) {
      if (meal_name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Meal name cannot be empty',
        });
      }
      updates.push('meal_name = ?');
      values.push(meal_name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }

    if (frequency !== undefined) {
      const validFrequencies = ['Daily', 'Weekly', 'Monthly'];
      if (!validFrequencies.includes(frequency)) {
        return res.status(400).json({
          success: false,
          error: 'Frequency must be one of: Daily, Weekly, Monthly',
        });
      }
      updates.push('frequency = ?');
      values.push(frequency);

      // Business rule: If frequency is 'Daily', set days to 'Single'
      if (frequency === 'Daily') {
        updates.push('days = ?');
        values.push('Single');
      }
    }

    if (days !== undefined && frequency !== 'Daily') {
      const validDays = ['Mon-Fri', 'Mon-Sat', 'Single'];
      if (!validDays.includes(days)) {
        return res.status(400).json({
          success: false,
          error: 'Days must be one of: Mon-Fri, Mon-Sat, Single',
        });
      }
      updates.push('days = ?');
      values.push(days);
    }

    if (price !== undefined) {
      if (price <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Price must be a positive number',
        });
      }
      updates.push('price = ?');
      values.push(price);
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
    await query(`UPDATE meal_plans SET ${updates.join(', ')} WHERE id = ?`, values);

    // Fetch updated meal plan
    const updatedMealPlans = (await query('SELECT * FROM meal_plans WHERE id = ?', [
      id,
    ])) as MealPlan[];

    return res.status(200).json({
      success: true,
      data: updatedMealPlans[0],
    });
  } catch (error: any) {
    console.error('Error updating meal plan:', error);

    // Handle duplicate entry error
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'Meal plan with this name already exists',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update meal plan',
    });
  }
}

/**
 * DELETE /api/meal-plans/:id
 * Delete a meal plan
 */
async function handleDeleteMealPlan(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  id: number
) {
  try {
    // Check if meal plan exists
    const existingMealPlans = (await query('SELECT * FROM meal_plans WHERE id = ?', [
      id,
    ])) as MealPlan[];

    if (existingMealPlans.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Meal plan not found',
      });
    }

    // Check if meal plan is used in any orders
    const orders = (await query('SELECT COUNT(*) as count FROM customer_orders WHERE meal_plan_id = ?', [
      id,
    ])) as any[];

    if (orders[0].count > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete meal plan that is used in orders',
      });
    }

    // Delete meal plan
    await query('DELETE FROM meal_plans WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      data: { message: 'Meal plan deleted successfully' },
    });
  } catch (error: any) {
    console.error('Error deleting meal plan:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete meal plan',
    });
  }
}
