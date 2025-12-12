import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../src/config/database';
import { ApiResponse } from '../../../../src/types';
import cors from '../../../../src/utils/cors';

/**
 * Comprehensive billing details for invoice page
 */
export interface BillingDetailsData {
  billing: {
    id: number;
    customer_id: number;
    customer_name: string;
    customer_phone: string | null;
    customer_address: string;
    billing_month: string;
    total_delivered: number;
    total_absent: number;
    total_extra: number;
    total_days: number;
    base_amount: number;
    extra_amount: number;
    total_amount: number;
    status: string;
    finalized_at: Date | null;
    finalized_by: string | null;
    paid_at: Date | null;
    payment_method: string | null;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
  };
  orders: Array<{
    id: number;
    meal_plan_id: number;
    meal_plan_name: string;
    meal_plan_type: string;
    weekdays_only: boolean;
    start_date: string;
    end_date: string;
    price: number;
    payment_status: string;
    days: string;
  }>;
  calendar: Array<{
    delivery_date: string;
    status: 'delivered' | 'absent' | 'extra' | null;
    order_id: number;
    meal_plan_name: string;
    quantity: number;
    price: number | null;
  }>;
  calculations: {
    month_first_day: string;
    month_last_day: string;
    total_weekdays: number;
    breakdown_by_order: Array<{
      order_id: number;
      meal_plan_name: string;
      meal_plan_type: string;
      weekdays_only: boolean;
      order_price: number;
      per_tiffin_price: number;
      applicable_days: number;
      delivered_count: number;
      absent_count: number;
      extra_count: number;
      delivered_amount: number;
      absent_deduction: number;
      extra_amount: number;
      order_total: number;
    }>;
  };
}

/**
 * @api {get} /api/monthly-billing/details/:id Get comprehensive billing details
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<BillingDetailsData | null>>
) {
  await cors(req, res);

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      error: 'Valid billing ID is required',
    });
  }

  const billingId = parseInt(id);

  try {
    // 1. Get billing record with customer details
    const billingResults = await query<any[]>(
      `
        SELECT
          mb.*,
          c.name AS customer_name,
          c.phone AS customer_phone,
          c.address AS customer_address
        FROM monthly_billing mb
        INNER JOIN customers c ON mb.customer_id = c.id
        WHERE mb.id = ?
        LIMIT 1
      `,
      [billingId]
    );

    if (billingResults.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Billing record not found',
      });
    }

    const billing = billingResults[0];
    const customerId = billing.customer_id;
    const billingMonth = billing.billing_month;

    // Parse month
    const [year, month] = billingMonth.split('-').map(Number);
    const firstDay = `${billingMonth}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const lastDayStr = `${billingMonth}-${String(lastDay).padStart(2, '0')}`;

    // 2. Get all orders for this customer in this billing period
    const orders = await query<any[]>(
      `
        SELECT
          co.*,
          mp.meal_name AS meal_plan_name,
          mp.frequency AS meal_plan_type,
          mp.days,
          CASE
            WHEN mp.days = 'Mon-Fri' THEN 1
            ELSE 0
          END AS weekdays_only
        FROM customer_orders co
        INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
        WHERE co.customer_id = ?
          AND (
            (co.start_date <= ? AND co.end_date >= ?)
            OR (co.start_date >= ? AND co.start_date <= ?)
          )
        ORDER BY co.start_date ASC
      `,
      [customerId, lastDayStr, firstDay, firstDay, lastDayStr]
    );

    // 3. Get calendar entries for this customer in this month
    const calendar = await query<any[]>(
      `
        SELECT
          ce.delivery_date,
          ce.status,
          ce.order_id,
          ce.quantity,
          ce.price,
          mp.meal_name AS meal_plan_name
        FROM tiffin_calendar_entries ce
        INNER JOIN customer_orders co ON ce.order_id = co.id
        INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
        WHERE ce.customer_id = ?
          AND ce.delivery_date >= ?
          AND ce.delivery_date <= ?
        ORDER BY ce.delivery_date ASC
      `,
      [customerId, firstDay, lastDayStr]
    );

    // 4. Calculate total weekdays in the month
    let totalWeekdays = 0;
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        totalWeekdays++;
      }
    }

    // 5. Build calculation breakdown by order
    // Filter to only include base/recurring orders (exclude single-day extra orders)
    const baseOrders = orders.filter((order) => {
      const orderStart = new Date(order.start_date);
      const orderEnd = new Date(order.end_date);
      const daysDiff = Math.ceil((orderEnd.getTime() - orderStart.getTime()) / (1000 * 60 * 60 * 24));
      // Only include orders that span more than 1 day (exclude single-day extra orders)
      return daysDiff > 0;
    });

    // Get all extra entries for this customer in this month (regardless of order)
    const allExtraEntries = calendar.filter((e) => e.status === 'extra');

    const breakdownByOrder = baseOrders.map((order) => {
      const orderEntries = calendar.filter((entry) => entry.order_id === order.id);

      // Determine applicable days (days within month and order period)
      const orderStartDate = new Date(order.start_date);
      const orderEndDate = new Date(order.end_date);
      const monthStart = new Date(firstDay);
      const monthEnd = new Date(lastDayStr);

      const effectiveStart = orderStartDate > monthStart ? orderStartDate : monthStart;
      const effectiveEnd = orderEndDate < monthEnd ? orderEndDate : monthEnd;

      let applicableDays = 0;
      for (
        let d = new Date(effectiveStart);
        d <= effectiveEnd;
        d.setDate(d.getDate() + 1)
      ) {
        const dayOfWeek = d.getDay();
        if (order.weekdays_only) {
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            applicableDays++;
          }
        } else {
          applicableDays++;
        }
      }

      // Calculate per-tiffin price
      const divisor = order.weekdays_only ? totalWeekdays : lastDay;
      const perTiffinPrice = divisor > 0 ? order.price / divisor : 0;

      // Count delivered and absent for THIS order only
      const deliveredCount = orderEntries.filter((e) => e.status === 'delivered').length;
      const absentCount = orderEntries.filter((e) => e.status === 'absent').length;

      // For the FIRST base order, include ALL extra entries
      // For subsequent orders, don't count extras (to avoid duplication)
      const isFirstOrder = baseOrders[0].id === order.id;
      const extraCount = isFirstOrder ? allExtraEntries.length : 0;
      const extraAmount = isFirstOrder
        ? allExtraEntries.reduce((sum, e) => sum + (e.price || 0), 0)
        : 0;

      // Calculate amounts
      const deliveredAmount = deliveredCount * perTiffinPrice;
      const absentDeduction = absentCount * perTiffinPrice;

      const orderTotal = deliveredAmount - absentDeduction + extraAmount;

      return {
        order_id: order.id,
        meal_plan_name: order.meal_plan_name,
        meal_plan_type: order.meal_plan_type,
        weekdays_only: order.weekdays_only,
        order_price: order.price,
        per_tiffin_price: perTiffinPrice,
        applicable_days: applicableDays,
        delivered_count: deliveredCount,
        absent_count: absentCount,
        extra_count: extraCount,
        delivered_amount: deliveredAmount,
        absent_deduction: absentDeduction,
        extra_amount: extraAmount,
        order_total: orderTotal,
      };
    });

    const responseData: BillingDetailsData = {
      billing,
      orders,
      calendar,
      calculations: {
        month_first_day: firstDay,
        month_last_day: lastDayStr,
        total_weekdays: totalWeekdays,
        breakdown_by_order: breakdownByOrder,
      },
    };

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('Error fetching billing details:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch billing details',
    });
  }
}
