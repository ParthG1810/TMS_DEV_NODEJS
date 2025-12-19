import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface CalendarEntry {
  delivery_date: string;
  status: 'T' | 'A' | 'E';
  quantity: number;
  price: number;
}

interface OrderInvoice {
  order_id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  billing_month: string;
  meal_plan_name: string;
  meal_plan_price: number;
  start_date: string;
  end_date: string;
  selected_days: string[];
  billing: {
    total_delivered: number;
    total_absent: number;
    total_extra: number;
    total_plan_days: number;
    base_amount: number;
    extra_amount: number;
    total_amount: number;
    status: 'calculating' | 'finalized';
    finalized_at: string | null;
    finalized_by: string | null;
  };
  calendar_entries: CalendarEntry[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<OrderInvoice>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    const { order_id, billing_month } = req.query;

    if (!order_id || !billing_month) {
      return res.status(400).json({
        success: false,
        error: 'order_id and billing_month are required',
      });
    }

    // Get order details with customer and meal plan info
    const orders = await query<any[]>(
      `
        SELECT
          co.id as order_id,
          co.customer_id,
          c.name as customer_name,
          c.phone as customer_phone,
          c.address as customer_address,
          mp.meal_name as meal_plan_name,
          co.price as meal_plan_price,
          DATE_FORMAT(co.start_date, '%Y-%m-%d') as start_date,
          DATE_FORMAT(co.end_date, '%Y-%m-%d') as end_date,
          co.selected_days
        FROM customer_orders co
        INNER JOIN customers c ON co.customer_id = c.id
        INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
        WHERE co.id = ?
      `,
      [order_id]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    const order = orders[0];

    // Parse selected_days
    let selectedDays: string[] = [];
    if (order.selected_days) {
      try {
        selectedDays = typeof order.selected_days === 'string'
          ? JSON.parse(order.selected_days)
          : order.selected_days;
      } catch (e) {
        selectedDays = [];
      }
    }

    // Get order billing
    const billings = await query<any[]>(
      `
        SELECT
          total_delivered,
          total_absent,
          total_extra,
          total_plan_days,
          base_amount,
          extra_amount,
          total_amount,
          status,
          finalized_at,
          finalized_by
        FROM order_billing
        WHERE order_id = ? AND billing_month = ?
      `,
      [order_id, billing_month]
    );

    const billing = billings.length > 0 ? billings[0] : {
      total_delivered: 0,
      total_absent: 0,
      total_extra: 0,
      total_plan_days: 0,
      base_amount: 0,
      extra_amount: 0,
      total_amount: 0,
      status: 'calculating',
      finalized_at: null,
      finalized_by: null,
    };

    // Get calendar entries for this order in the billing month
    const [year, monthNum] = (billing_month as string).split('-').map(Number);
    const firstDayOfMonth = `${billing_month}-01`;
    const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
    const lastDayOfMonthStr = `${billing_month}-${String(lastDayOfMonth).padStart(2, '0')}`;

    const entries = await query<CalendarEntry[]>(
      `
        SELECT
          DATE_FORMAT(delivery_date, '%Y-%m-%d') as delivery_date,
          status,
          quantity,
          price
        FROM tiffin_calendar_entries
        WHERE order_id = ?
        AND delivery_date >= ?
        AND delivery_date <= ?
        ORDER BY delivery_date ASC
      `,
      [order_id, firstDayOfMonth, lastDayOfMonthStr]
    );

    const orderInvoice: OrderInvoice = {
      order_id: Number(order_id),
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone || '',
      customer_address: order.customer_address || '',
      billing_month: billing_month as string,
      meal_plan_name: order.meal_plan_name,
      meal_plan_price: Number(order.meal_plan_price) || 0,
      start_date: order.start_date,
      end_date: order.end_date,
      selected_days: selectedDays,
      billing: {
        total_delivered: billing.total_delivered || 0,
        total_absent: billing.total_absent || 0,
        total_extra: billing.total_extra || 0,
        total_plan_days: billing.total_plan_days || 0,
        base_amount: Number(billing.base_amount) || 0,
        extra_amount: Number(billing.extra_amount) || 0,
        total_amount: Number(billing.total_amount) || 0,
        status: billing.status || 'calculating',
        finalized_at: billing.finalized_at || null,
        finalized_by: billing.finalized_by || null,
      },
      calendar_entries: entries.map((e) => ({
        ...e,
        price: Number(e.price) || 0,
      })),
    };

    return res.status(200).json({
      success: true,
      data: orderInvoice,
    });
  } catch (error: any) {
    console.error('Error getting order invoice:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get order invoice',
    });
  }
}
