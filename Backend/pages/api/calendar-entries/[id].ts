import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';
import {
  ApiResponse,
  CalendarEntryWithDetails,
  UpdateCalendarEntryRequest,
} from '../../../src/types';
import cors from '../../../src/utils/cors';

/**
 * @api {get} /api/calendar-entries/:id Get calendar entry by ID
 * @api {put} /api/calendar-entries/:id Update calendar entry
 * @api {delete} /api/calendar-entries/:id Delete calendar entry
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<CalendarEntryWithDetails | null>>
) {
  // Enable CORS
  await cors(req, res);

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      error: 'Valid calendar entry ID is required',
    });
  }

  if (req.method === 'GET') {
    return handleGet(req, res, parseInt(id));
  } else if (req.method === 'PUT') {
    return handlePut(req, res, parseInt(id));
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res, parseInt(id));
  } else {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }
}

/**
 * GET /api/calendar-entries/:id
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<CalendarEntryWithDetails>>,
  id: number
) {
  try {
    const entries = await query<CalendarEntryWithDetails[]>(
      `
        SELECT
          tce.*,
          c.name AS customer_name,
          c.phone AS customer_phone,
          co.meal_plan_id,
          mp.meal_name AS meal_plan_name
        FROM tiffin_calendar_entries tce
        INNER JOIN customers c ON tce.customer_id = c.id
        INNER JOIN customer_orders co ON tce.order_id = co.id
        INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
        WHERE tce.id = ?
        LIMIT 1
      `,
      [id]
    );

    if (entries.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Calendar entry not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: entries[0],
    });
  } catch (error: any) {
    console.error('Error fetching calendar entry:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch calendar entry',
    });
  }
}

/**
 * PUT /api/calendar-entries/:id
 */
async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<CalendarEntryWithDetails>>,
  id: number
) {
  try {
    const body: UpdateCalendarEntryRequest = req.body;

    // Check if entry exists
    const existing = await query<any[]>(
      'SELECT id FROM tiffin_calendar_entries WHERE id = ? LIMIT 1',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Calendar entry not found',
      });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (body.status) {
      if (!['T', 'A', 'E'].includes(body.status)) {
        return res.status(400).json({
          success: false,
          error: 'status must be T (Delivered), A (Absent), or E (Extra)',
        });
      }
      updates.push('status = ?');
      params.push(body.status);
    }

    if (body.quantity !== undefined) {
      if (body.quantity < 1) {
        return res.status(400).json({
          success: false,
          error: 'quantity must be at least 1',
        });
      }
      updates.push('quantity = ?');
      params.push(body.quantity);
    }

    if (body.price !== undefined) {
      updates.push('price = ?');
      params.push(body.price);
    }

    if (body.notes !== undefined) {
      updates.push('notes = ?');
      params.push(body.notes || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    // Add updated_at
    updates.push('updated_at = CURRENT_TIMESTAMP');

    // Execute update
    params.push(id);
    await query(
      `UPDATE tiffin_calendar_entries SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Fetch updated entry
    const entries = await query<CalendarEntryWithDetails[]>(
      `
        SELECT
          tce.*,
          c.name AS customer_name,
          c.phone AS customer_phone,
          co.meal_plan_id,
          mp.meal_name AS meal_plan_name
        FROM tiffin_calendar_entries tce
        INNER JOIN customers c ON tce.customer_id = c.id
        INNER JOIN customer_orders co ON tce.order_id = co.id
        INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
        WHERE tce.id = ?
        LIMIT 1
      `,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: entries[0],
    });
  } catch (error: any) {
    console.error('Error updating calendar entry:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update calendar entry',
    });
  }
}

/**
 * DELETE /api/calendar-entries/:id
 */
async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<null>>,
  id: number
) {
  try {
    // Check if entry exists
    const existing = await query<any[]>(
      'SELECT id FROM tiffin_calendar_entries WHERE id = ? LIMIT 1',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Calendar entry not found',
      });
    }

    // Delete entry
    await query('DELETE FROM tiffin_calendar_entries WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error: any) {
    console.error('Error deleting calendar entry:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete calendar entry',
    });
  }
}
