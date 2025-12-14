import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';
import {
  ApiResponse,
  MonthlyBilling,
  MonthlyBillingWithDetails,
  CalendarGridData,
} from '../../../src/types';
import cors from '../../../src/utils/cors';

/**
 * @api {get} /api/monthly-billing Get monthly billing data
 * @api {post} /api/monthly-billing Calculate monthly billing
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<MonthlyBillingWithDetails[] | CalendarGridData | MonthlyBilling>>
) {
  // Enable CORS
  await cors(req, res);

  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handleCalculate(req, res);
  } else {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }
}

/**
 * GET /api/monthly-billing
 * Query params:
 * - month: string (YYYY-MM) (optional)
 * - customer_id: number (optional)
 * - format: 'list' | 'grid' (default: 'list')
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<MonthlyBillingWithDetails[] | CalendarGridData>>
) {
  try {
    const { month, customer_id, format = 'list' } = req.query;

    if (format === 'grid') {
      return handleGetCalendarGrid(req, res, month as string, customer_id ? parseInt(customer_id as string) : undefined);
    }

    let sql = `
      SELECT
        mb.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.address AS customer_address
      FROM monthly_billing mb
      INNER JOIN customers c ON mb.customer_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (month) {
      sql += ' AND mb.billing_month = ?';
      params.push(month);
    }

    if (customer_id) {
      sql += ' AND mb.customer_id = ?';
      params.push(customer_id);
    }

    sql += ' ORDER BY mb.billing_month DESC, c.name ASC';

    const billings = await query<MonthlyBillingWithDetails[]>(sql, params);

    return res.status(200).json({
      success: true,
      data: billings,
    });
  } catch (error: any) {
    console.error('Error fetching monthly billing:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch monthly billing',
    });
  }
}

/**
 * GET calendar grid format
 * Returns one row per ORDER (not per customer) for detailed billing tracking
 */
async function handleGetCalendarGrid(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<CalendarGridData>>,
  month: string,
  customer_id?: number
) {
  try {
    if (!month) {
      return res.status(400).json({
        success: false,
        error: 'month parameter (YYYY-MM) is required for grid format',
      });
    }

    const [year, monthNum] = month.split('-').map(Number);

    // Calculate the first and last day of the selected month
    const firstDayOfMonth = `${month}-01`;
    const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
    const lastDayOfMonthStr = `${month}-${String(lastDayOfMonth).padStart(2, '0')}`;

    // Get all parent orders that overlap with the selected month (with customer and meal plan details)
    let ordersSql = `
      SELECT
        co.id as order_id,
        co.customer_id,
        co.start_date,
        co.end_date,
        co.selected_days,
        co.price as order_price,
        co.payment_status,
        c.name as customer_name,
        c.phone as customer_phone,
        mp.meal_name as meal_plan_name
      FROM customer_orders co
      INNER JOIN customers c ON co.customer_id = c.id
      LEFT JOIN meal_plans mp ON co.meal_plan_id = mp.id
      WHERE co.start_date <= ? AND co.end_date >= ?
      AND (co.parent_order_id IS NULL OR co.parent_order_id = 0)
    `;
    const orderParams: any[] = [lastDayOfMonthStr, firstDayOfMonth];

    if (customer_id) {
      ordersSql += ' AND co.customer_id = ?';
      orderParams.push(customer_id);
    }

    ordersSql += ' ORDER BY c.name ASC, co.start_date ASC';

    const orders = await query<any[]>(ordersSql, orderParams);

    // Get calendar entries for the month (with order_id to match entries to specific orders)
    const entries = await query<any[]>(
      `
        SELECT
          customer_id,
          order_id,
          DATE_FORMAT(delivery_date, '%Y-%m-%d') as delivery_date,
          status,
          price
        FROM tiffin_calendar_entries
        WHERE DATE_FORMAT(delivery_date, '%Y-%m') = ?
        ORDER BY delivery_date ASC
      `,
      [month]
    );

    // Get billing data for the month (per customer - shared across orders)
    const billings = await query<any[]>(
      `
        SELECT
          customer_id,
          total_delivered,
          total_absent,
          total_extra,
          total_amount,
          status,
          id
        FROM monthly_billing
        WHERE billing_month = ?
      `,
      [month]
    );

    // Create billing lookup by customer_id
    const billingMap = new Map<number, any>();
    billings.forEach((b) => {
      billingMap.set(Number(b.customer_id), b);
    });

    // Format date helper
    const formatDate = (date: any): string => {
      if (!date) return '';
      if (typeof date === 'string') return date.split('T')[0];
      if (date instanceof Date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      return String(date);
    };

    // Build grid data - ONE ROW PER ORDER
    const gridData: CalendarGridData = {
      year,
      month: monthNum,
      customers: orders.map((order) => {
        const customerId = Number(order.customer_id);
        const orderId = Number(order.order_id);

        // Get entries for this specific order (or fallback to customer-level if order_id not set)
        const orderEntries = entries.filter((e) => {
          if (e.order_id) {
            return Number(e.order_id) === orderId;
          }
          // Fallback: match by customer_id for entries without order_id
          return Number(e.customer_id) === customerId;
        });

        const entriesMap: { [date: string]: any } = {};
        orderEntries.forEach((entry) => {
          entriesMap[entry.delivery_date] = entry.status;
        });

        // Parse selected_days
        let selectedDays = null;
        if (order.selected_days) {
          try {
            selectedDays = typeof order.selected_days === 'string'
              ? JSON.parse(order.selected_days)
              : order.selected_days;
          } catch (e) {
            console.error('Error parsing selected_days:', e);
          }
        }

        const billing = billingMap.get(customerId);

        // Calculate order-specific totals from entries
        let orderDelivered = 0;
        let orderAbsent = 0;
        let orderExtra = 0;
        let extraAmount = 0;
        orderEntries.forEach((entry) => {
          if (entry.status === 'T') orderDelivered++;
          else if (entry.status === 'A') orderAbsent++;
          else if (entry.status === 'E') {
            orderExtra++;
            // Extra entries have their price stored
            extraAmount += Number(entry.price) || 0;
          }
        });

        // Calculate the actual billing amount based on deliveries
        // Formula: (order_price / total_plan_days_in_month) * delivered_count + extra_amount
        let calculatedAmount = 0;
        const orderPrice = Number(order.order_price) || 0;

        if (selectedDays && selectedDays.length > 0 && orderDelivered > 0) {
          // Count how many times selected days appear in the billing month
          const dayNameMap: { [key: string]: number } = {
            'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
            'Thursday': 4, 'Friday': 5, 'Saturday': 6
          };

          let totalPlanDaysInMonth = 0;
          const firstDay = new Date(year, monthNum - 1, 1);
          const lastDay = new Date(year, monthNum, 0).getDate();

          for (let d = 1; d <= lastDay; d++) {
            const currentDate = new Date(year, monthNum - 1, d);
            const dayOfWeek = currentDate.getDay();
            const dayName = Object.keys(dayNameMap).find(key => dayNameMap[key] === dayOfWeek);
            if (dayName && selectedDays.includes(dayName)) {
              totalPlanDaysInMonth++;
            }
          }

          if (totalPlanDaysInMonth > 0) {
            const perTiffinPrice = orderPrice / totalPlanDaysInMonth;
            calculatedAmount = (perTiffinPrice * orderDelivered) + extraAmount;
          }
        } else if (orderDelivered > 0) {
          // Fallback: if no selected_days, use full order price proportionally
          calculatedAmount = orderPrice + extraAmount;
        }

        return {
          customer_id: customerId,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          entries: entriesMap,
          total_delivered: orderDelivered,
          total_absent: orderAbsent,
          total_extra: orderExtra,
          total_amount: Math.round(calculatedAmount * 100) / 100, // Round to 2 decimal places
          billing_status: order.payment_status || 'calculating',
          billing_id: billing?.id,
          // Include single order for this row (for plan day calculation)
          orders: [{
            id: orderId,
            start_date: formatDate(order.start_date),
            end_date: formatDate(order.end_date),
            selected_days: selectedDays,
            meal_plan_name: order.meal_plan_name,
          }],
        };
      }),
    };

    return res.status(200).json({
      success: true,
      data: gridData,
    });
  } catch (error: any) {
    console.error('Error fetching calendar grid:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch calendar grid',
    });
  }
}

/**
 * POST /api/monthly-billing
 * Calculate billing for a customer and month
 * Body: { customer_id: number, billing_month: string }
 */
async function handleCalculate(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<MonthlyBilling>>
) {
  try {
    const { customer_id, billing_month } = req.body;

    if (!customer_id || !billing_month) {
      return res.status(400).json({
        success: false,
        error: 'customer_id and billing_month (YYYY-MM) are required',
      });
    }

    // Validate customer exists
    const customers = await query<any[]>(
      'SELECT id FROM customers WHERE id = ? LIMIT 1',
      [customer_id]
    );

    if (customers.length === 0) {
      return res.status(400).json({
        success: false,
        error: `Customer with id ${customer_id} not found`,
      });
    }

    // Call stored procedure to calculate
    await query('CALL sp_calculate_monthly_billing(?, ?)', [customer_id, billing_month]);

    // Fetch the calculated billing
    const billings = await query<MonthlyBilling[]>(
      `
        SELECT * FROM monthly_billing
        WHERE customer_id = ? AND billing_month = ?
        LIMIT 1
      `,
      [customer_id, billing_month]
    );

    if (billings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No billing data found after calculation',
      });
    }

    return res.status(200).json({
      success: true,
      data: billings[0],
    });
  } catch (error: any) {
    console.error('Error calculating monthly billing:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate monthly billing',
    });
  }
}
