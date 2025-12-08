import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';
import {
  ApiResponse,
  TiffinCalendarEntry,
  CalendarEntryWithDetails,
  CreateCalendarEntryRequest,
  BatchUpdateCalendarEntriesRequest,
} from '../../../src/types';
import cors from '../../../src/utils/cors';

/**
 * @api {get} /api/calendar-entries Get calendar entries
 * @api {post} /api/calendar-entries Create calendar entry
 * @api {put} /api/calendar-entries Batch update calendar entries
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<TiffinCalendarEntry[] | CalendarEntryWithDetails | CalendarEntryWithDetails[]>>
) {
  // Enable CORS
  await cors(req, res);

  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else if (req.method === 'PUT') {
    return handleBatchUpdate(req, res);
  } else {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }
}

/**
 * GET /api/calendar-entries
 * Query params:
 * - customer_id: number (optional)
 * - month: string (YYYY-MM) (optional)
 * - start_date: string (YYYY-MM-DD) (optional)
 * - end_date: string (YYYY-MM-DD) (optional)
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<CalendarEntryWithDetails[]>>
) {
  try {
    const { customer_id, month, start_date, end_date } = req.query;

    let sql = `
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
      WHERE 1=1
    `;

    const params: any[] = [];

    if (customer_id) {
      sql += ' AND tce.customer_id = ?';
      params.push(customer_id);
    }

    if (month) {
      sql += ' AND DATE_FORMAT(tce.delivery_date, "%Y-%m") = ?';
      params.push(month);
    }

    if (start_date) {
      sql += ' AND tce.delivery_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND tce.delivery_date <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY tce.delivery_date DESC, c.name ASC';

    const entries = await query<CalendarEntryWithDetails[]>(sql, params);

    // Parse selected_days JSON if it's a string
    const parsedEntries = entries.map((entry: any) => ({
      ...entry,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
    }));

    return res.status(200).json({
      success: true,
      data: parsedEntries,
    });
  } catch (error: any) {
    console.error('Error fetching calendar entries:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch calendar entries',
    });
  }
}

/**
 * POST /api/calendar-entries
 * Create a new calendar entry
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<CalendarEntryWithDetails>>
) {
  try {
    const body: CreateCalendarEntryRequest = req.body;

    // Validate required fields
    if (!body.customer_id) {
      return res.status(400).json({
        success: false,
        error: 'customer_id is required',
      });
    }

    if (!body.order_id) {
      return res.status(400).json({
        success: false,
        error: 'order_id is required',
      });
    }

    if (!body.delivery_date) {
      return res.status(400).json({
        success: false,
        error: 'delivery_date is required',
      });
    }

    if (!body.status) {
      return res.status(400).json({
        success: false,
        error: 'status is required (T, A, or E)',
      });
    }

    // Validate status value
    if (!['T', 'A', 'E'].includes(body.status)) {
      return res.status(400).json({
        success: false,
        error: 'status must be T (Delivered), A (Absent), or E (Extra)',
      });
    }

    // Validate customer exists
    const customers = await query<any[]>(
      'SELECT id FROM customers WHERE id = ? LIMIT 1',
      [body.customer_id]
    );

    if (customers.length === 0) {
      return res.status(400).json({
        success: false,
        error: `Customer with id ${body.customer_id} not found`,
      });
    }

    // Validate order exists
    const orders = await query<any[]>(
      'SELECT id FROM customer_orders WHERE id = ? LIMIT 1',
      [body.order_id]
    );

    if (orders.length === 0) {
      return res.status(400).json({
        success: false,
        error: `Order with id ${body.order_id} not found`,
      });
    }

    // Get pricing from the order's meal plan or use default
    let price = body.price || 0;
    if (!price || price === 0) {
      const pricingRules = await query<any[]>(
        'SELECT delivered_price, extra_price FROM pricing_rules WHERE is_default = TRUE LIMIT 1'
      );

      if (pricingRules.length > 0) {
        price = body.status === 'E' ? pricingRules[0].extra_price : pricingRules[0].delivered_price;
      }
    }

    const quantity = body.quantity || 1;

    // Insert calendar entry (or update if exists)
    const insertSql = `
      INSERT INTO tiffin_calendar_entries (
        customer_id, order_id, delivery_date, status, quantity, price, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        quantity = VALUES(quantity),
        price = VALUES(price),
        notes = VALUES(notes),
        updated_at = CURRENT_TIMESTAMP
    `;

    await query(insertSql, [
      body.customer_id,
      body.order_id,
      body.delivery_date,
      body.status,
      quantity,
      price,
      body.notes || null,
    ]);

    // Fetch the created/updated entry with details
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
        WHERE tce.customer_id = ? AND tce.delivery_date = ?
        LIMIT 1
      `,
      [body.customer_id, body.delivery_date]
    );

    return res.status(201).json({
      success: true,
      data: entries[0],
    });
  } catch (error: any) {
    console.error('Error creating calendar entry:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create calendar entry',
    });
  }
}

/**
 * PUT /api/calendar-entries
 * Batch update calendar entries
 */
async function handleBatchUpdate(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<CalendarEntryWithDetails[]>>
) {
  try {
    const body: BatchUpdateCalendarEntriesRequest = req.body;

    if (!body.customer_id || !body.order_id || !body.entries || body.entries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'customer_id, order_id, and entries array are required',
      });
    }

    // Get pricing rules
    const pricingRules = await query<any[]>(
      'SELECT delivered_price, extra_price FROM pricing_rules WHERE is_default = TRUE LIMIT 1'
    );

    const deliveredPrice = pricingRules.length > 0 ? pricingRules[0].delivered_price : 50;
    const extraPrice = pricingRules.length > 0 ? pricingRules[0].extra_price : 60;

    // Batch insert/update entries
    const insertSql = `
      INSERT INTO tiffin_calendar_entries (
        customer_id, order_id, delivery_date, status, quantity, price
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        quantity = VALUES(quantity),
        price = VALUES(price),
        updated_at = CURRENT_TIMESTAMP
    `;

    for (const entry of body.entries) {
      const price = entry.price || (entry.status === 'E' ? extraPrice : deliveredPrice);
      const quantity = entry.quantity || 1;

      await query(insertSql, [
        body.customer_id,
        body.order_id,
        entry.delivery_date,
        entry.status,
        quantity,
        price,
      ]);
    }

    // Fetch all updated entries
    const dates = body.entries.map((e) => e.delivery_date);
    const placeholders = dates.map(() => '?').join(',');

    const updatedEntries = await query<CalendarEntryWithDetails[]>(
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
        WHERE tce.customer_id = ? AND tce.delivery_date IN (${placeholders})
        ORDER BY tce.delivery_date ASC
      `,
      [body.customer_id, ...dates]
    );

    return res.status(200).json({
      success: true,
      data: updatedEntries,
    });
  } catch (error: any) {
    console.error('Error batch updating calendar entries:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to batch update calendar entries',
    });
  }
}
