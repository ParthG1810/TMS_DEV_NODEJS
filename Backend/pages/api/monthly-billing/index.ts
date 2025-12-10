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

    // Get customers who have orders that overlap with the selected month
    let customerSql = `
      SELECT DISTINCT c.id, c.name, c.phone
      FROM customers c
      INNER JOIN customer_orders co ON c.id = co.customer_id
      WHERE co.start_date <= ? AND co.end_date >= ?
    `;
    const customerParams: any[] = [lastDayOfMonthStr, firstDayOfMonth];

    if (customer_id) {
      customerSql += ' AND c.id = ?';
      customerParams.push(customer_id);
    }

    customerSql += ' ORDER BY c.name ASC';

    const customers = await query<any[]>(customerSql, customerParams);

    // Get orders for these customers that overlap with the selected month
    const customerIds = customers.map(c => c.id);
    let orders: any[] = [];

    if (customerIds.length > 0) {
      const placeholders = customerIds.map(() => '?').join(',');
      orders = await query<any[]>(
        `
          SELECT id, customer_id, start_date, end_date, selected_days
          FROM customer_orders
          WHERE customer_id IN (${placeholders})
          AND start_date <= ? AND end_date >= ?
          ORDER BY customer_id, start_date
        `,
        [...customerIds, lastDayOfMonthStr, firstDayOfMonth]
      );
    }

    // Get calendar entries for the month
    const entries = await query<any[]>(
      `
        SELECT
          customer_id,
          DATE_FORMAT(delivery_date, '%Y-%m-%d') as delivery_date,
          status
        FROM tiffin_calendar_entries
        WHERE DATE_FORMAT(delivery_date, '%Y-%m') = ?
        ORDER BY delivery_date ASC
      `,
      [month]
    );

    // Get billing data for the month
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

    // Create billing lookup
    const billingMap = new Map();
    billings.forEach((b) => {
      billingMap.set(b.customer_id, b);
    });

    // Create orders lookup by customer
    const ordersMap = new Map();
    orders.forEach((order) => {
      if (!ordersMap.has(order.customer_id)) {
        ordersMap.set(order.customer_id, []);
      }

      // Parse selected_days from JSON string if it exists
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

      ordersMap.get(order.customer_id).push({
        id: order.id,
        start_date: order.start_date,
        end_date: order.end_date,
        selected_days: selectedDays,
      });
    });

    // Build grid data
    const gridData: CalendarGridData = {
      year,
      month: monthNum,
      customers: customers.map((customer) => {
        const customerEntries = entries.filter((e) => e.customer_id === customer.id);
        const entriesMap: { [date: string]: any } = {};

        customerEntries.forEach((entry) => {
          entriesMap[entry.delivery_date] = entry.status;
        });

        const billing = billingMap.get(customer.id);
        const customerOrders = ordersMap.get(customer.id) || [];

        return {
          customer_id: customer.id,
          customer_name: customer.name,
          customer_phone: customer.phone,
          entries: entriesMap,
          total_delivered: billing?.total_delivered || 0,
          total_absent: billing?.total_absent || 0,
          total_extra: billing?.total_extra || 0,
          total_amount: billing?.total_amount || 0,
          billing_status: billing?.status || 'calculating',
          billing_id: billing?.id,
          orders: customerOrders,
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
