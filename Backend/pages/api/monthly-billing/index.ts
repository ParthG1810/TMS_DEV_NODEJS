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

    // Fetch order-level breakdown for each billing record
    const billingIds = billings.map(b => b.id);
    const customerIds = billings.map(b => b.customer_id);
    const billingMonths = Array.from(new Set(billings.map(b => b.billing_month)));

    // Get order billing details for all relevant customers and months
    let orderDetails: any[] = [];
    if (billings.length > 0) {
      const orderDetailsSql = `
        SELECT
          ob.id,
          ob.order_id,
          ob.customer_id,
          ob.billing_month,
          ob.total_delivered,
          ob.total_absent,
          ob.total_extra,
          ob.total_plan_days,
          ob.base_amount,
          ob.extra_amount,
          ob.total_amount,
          ob.status,
          ob.finalized_at,
          co.start_date,
          co.end_date,
          mp.meal_name
        FROM order_billing ob
        INNER JOIN customer_orders co ON ob.order_id = co.id
        LEFT JOIN meal_plans mp ON co.meal_plan_id = mp.id
        WHERE ob.customer_id IN (${customerIds.map(() => '?').join(',')})
        AND ob.billing_month IN (${billingMonths.map(() => '?').join(',')})
        ORDER BY ob.customer_id, mp.meal_name
      `;
      orderDetails = await query<any[]>(orderDetailsSql, [...customerIds, ...billingMonths]);
    }

    // Group order details by customer_id and billing_month
    const orderDetailsMap = new Map<string, any[]>();
    orderDetails.forEach((od) => {
      const key = `${od.customer_id}-${od.billing_month}`;
      if (!orderDetailsMap.has(key)) {
        orderDetailsMap.set(key, []);
      }
      orderDetailsMap.get(key)!.push(od);
    });

    // Attach order details to each billing record and sync status if needed
    const billingsWithOrders = await Promise.all(billings.map(async (billing) => {
      const key = `${billing.customer_id}-${billing.billing_month}`;
      const orders = orderDetailsMap.get(key) || [];

      // Determine effective status based on order statuses (priority order: top to bottom)
      // 1. Calculating - if ANY order is still calculating
      // 2. Pending - if ANY order is pending approval
      // 3. Paid - if ALL orders are paid
      // 4. Finalized/Invoiced - if ALL orders are finalized, invoiced, or approved
      // 5. Partial Paid - if SOME orders are paid and SOME are finalized/invoiced/approved
      let effectiveStatus = billing.status;
      if (orders.length > 0) {
        const hasCalculating = orders.some((o: any) => o.status === 'calculating');
        const hasPending = orders.some((o: any) => o.status === 'pending');
        const allPaid = orders.every((o: any) => o.status === 'paid');
        // Consider finalized, invoiced, and approved as equivalent for "Invoiced" status
        const invoicedStatuses = ['finalized', 'invoiced', 'approved'];
        const allInvoiced = orders.every((o: any) => invoicedStatuses.includes(o.status));
        const somePaid = orders.some((o: any) => o.status === 'paid');
        const someInvoiced = orders.some((o: any) => invoicedStatuses.includes(o.status));

        if (hasCalculating) {
          effectiveStatus = 'calculating';
        } else if (hasPending) {
          effectiveStatus = 'pending';
        } else if (allPaid) {
          effectiveStatus = 'paid';
        } else if (allInvoiced) {
          effectiveStatus = 'finalized';
        } else if (somePaid && someInvoiced) {
          effectiveStatus = 'partial_paid';
        }

        // Sync the monthly_billing status in the database if it differs from effective status
        if (effectiveStatus !== billing.status) {
          try {
            await query(
              'UPDATE monthly_billing SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [effectiveStatus, billing.id]
            );
            console.log(`[Monthly Billing] Synced status for billing ${billing.id}: ${billing.status} -> ${effectiveStatus}`);
          } catch (syncError) {
            console.error(`[Monthly Billing] Failed to sync status for billing ${billing.id}:`, syncError);
          }
        }
      }

      return {
        ...billing,
        status: effectiveStatus, // Use the effective status as the main status
        effective_status: effectiveStatus,
        orders: orders.map((o: any) => ({
          id: o.id,
          order_id: o.order_id,
          meal_plan_name: o.meal_name || 'Unknown Plan',
          start_date: o.start_date,
          end_date: o.end_date,
          total_delivered: o.total_delivered,
          total_absent: o.total_absent,
          total_extra: o.total_extra,
          total_amount: o.total_amount,
          status: o.status,
          finalized_at: o.finalized_at,
        })),
      };
    }));

    return res.status(200).json({
      success: true,
      data: billingsWithOrders,
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

    // Get billing data for the month (per customer - for combined invoice)
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

    // Get order-level billing data
    const orderBillings = await query<any[]>(
      `
        SELECT
          order_id,
          customer_id,
          total_delivered,
          total_absent,
          total_extra,
          total_plan_days,
          base_amount,
          extra_amount,
          total_amount,
          status,
          id,
          finalized_at
        FROM order_billing
        WHERE billing_month = ?
      `,
      [month]
    );

    // Create billing lookup by customer_id (for combined invoice)
    const billingMap = new Map<number, any>();
    billings.forEach((b) => {
      billingMap.set(Number(b.customer_id), b);
    });

    // Create order billing lookup by order_id
    const orderBillingMap = new Map<number, any>();
    orderBillings.forEach((ob) => {
      orderBillingMap.set(Number(ob.order_id), ob);
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

        // Get entries for this specific order only (strict matching by order_id)
        // No fallback to customer_id - each order has its own isolated entries
        const orderEntries = entries.filter((e) => {
          return Number(e.order_id) === orderId;
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

        // Get order-level billing for this specific order
        const orderBilling = orderBillingMap.get(orderId);

        return {
          customer_id: customerId,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          entries: entriesMap,
          total_delivered: orderDelivered,
          total_absent: orderAbsent,
          total_extra: orderExtra,
          total_amount: Math.round(calculatedAmount * 100) / 100, // Round to 2 decimal places
          // Use order-level billing status (per-order finalization)
          billing_status: orderBilling?.status || 'calculating',
          billing_id: orderBilling?.id || null, // order_billing.id for per-order finalization
          order_billing_id: orderBilling?.id || null,
          // Combined invoice billing (per-customer)
          combined_billing_id: billing?.id,
          combined_billing_status: billing?.status || 'calculating',
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
