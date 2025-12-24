import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface OrderBillingDetail {
  id: number;
  order_id: number;
  customer_id: number;
  billing_month: string;
  total_delivered: number;
  total_absent: number;
  total_extra: number;
  total_plan_days: number;
  base_amount: number;
  extra_amount: number;
  total_amount: number;
  status: 'calculating' | 'finalized' | 'approved' | 'invoiced' | 'paid' | 'partial_paid';
  finalized_at: string | null;
  finalized_by: string | null;
  meal_plan_name: string;
  order_price: number;
  start_date: string;
  end_date: string;
  selected_days: string[];
}

interface CombinedInvoice {
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  billing_month: string;
  orders: OrderBillingDetail[];
  summary: {
    total_orders: number;
    finalized_orders: number;
    all_finalized: boolean;
    grand_total_delivered: number;
    grand_total_absent: number;
    grand_total_extra: number;
    grand_total_amount: number;
  };
  can_approve: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<CombinedInvoice>>
) {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    const { customer_id, billing_month } = req.query;

    if (!customer_id || !billing_month) {
      return res.status(400).json({
        success: false,
        error: 'customer_id and billing_month are required',
      });
    }

    // Get customer details
    const customers = await query<any[]>(
      'SELECT id, name, phone, address FROM customers WHERE id = ?',
      [customer_id]
    );

    if (customers.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }

    const customer = customers[0];

    // Get all orders for this customer that overlap with the billing month
    const [year, monthNum] = (billing_month as string).split('-').map(Number);
    const firstDayOfMonth = `${billing_month}-01`;
    const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
    const lastDayOfMonthStr = `${billing_month}-${String(lastDayOfMonth).padStart(2, '0')}`;

    // Get order billing details with order and meal plan info
    const orderBillings = await query<any[]>(
      `
        SELECT
          ob.*,
          mp.meal_name as meal_plan_name,
          co.price as order_price,
          DATE_FORMAT(co.start_date, '%Y-%m-%d') as start_date,
          DATE_FORMAT(co.end_date, '%Y-%m-%d') as end_date,
          co.selected_days
        FROM order_billing ob
        INNER JOIN customer_orders co ON ob.order_id = co.id
        INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
        WHERE ob.customer_id = ?
        AND ob.billing_month = ?
        AND (co.parent_order_id IS NULL OR co.parent_order_id = 0)
        ORDER BY mp.meal_name ASC
      `,
      [customer_id, billing_month]
    );

    // Also get any orders that might not have billing records yet
    const ordersWithoutBilling = await query<any[]>(
      `
        SELECT
          co.id as order_id,
          co.customer_id,
          mp.meal_name as meal_plan_name,
          co.price as order_price,
          DATE_FORMAT(co.start_date, '%Y-%m-%d') as start_date,
          DATE_FORMAT(co.end_date, '%Y-%m-%d') as end_date,
          co.selected_days
        FROM customer_orders co
        INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
        LEFT JOIN order_billing ob ON co.id = ob.order_id AND ob.billing_month = ?
        WHERE co.customer_id = ?
        AND co.start_date <= ?
        AND co.end_date >= ?
        AND (co.parent_order_id IS NULL OR co.parent_order_id = 0)
        AND ob.id IS NULL
        ORDER BY mp.meal_name ASC
      `,
      [billing_month, customer_id, lastDayOfMonthStr, firstDayOfMonth]
    );

    // Parse selected_days for all records
    const parseSelectedDays = (record: any) => {
      if (record.selected_days) {
        try {
          return typeof record.selected_days === 'string'
            ? JSON.parse(record.selected_days)
            : record.selected_days;
        } catch (e) {
          return [];
        }
      }
      return [];
    };

    // Format order billings
    const formattedOrderBillings: OrderBillingDetail[] = orderBillings.map((ob) => ({
      ...ob,
      selected_days: parseSelectedDays(ob),
      base_amount: Number(ob.base_amount) || 0,
      extra_amount: Number(ob.extra_amount) || 0,
      total_amount: Number(ob.total_amount) || 0,
      order_price: Number(ob.order_price) || 0,
    }));

    // Add placeholder entries for orders without billing
    const placeholderBillings: OrderBillingDetail[] = ordersWithoutBilling.map((order) => ({
      id: 0,
      order_id: order.order_id,
      customer_id: Number(customer_id),
      billing_month: billing_month as string,
      total_delivered: 0,
      total_absent: 0,
      total_extra: 0,
      total_plan_days: 0,
      base_amount: 0,
      extra_amount: 0,
      total_amount: 0,
      status: 'calculating' as const,
      finalized_at: null,
      finalized_by: null,
      meal_plan_name: order.meal_plan_name,
      order_price: Number(order.order_price) || 0,
      start_date: order.start_date,
      end_date: order.end_date,
      selected_days: parseSelectedDays(order),
    }));

    const allOrders = [...formattedOrderBillings, ...placeholderBillings];

    // Calculate summary
    // Count orders that are ready for invoicing (finalized, approved, invoiced, paid, or partial_paid)
    const totalOrders = allOrders.length;
    const readyStatuses = ['finalized', 'approved', 'invoiced', 'paid', 'partial_paid'];
    const finalizedOrders = allOrders.filter((o) => readyStatuses.includes(o.status)).length;
    const allFinalized = totalOrders > 0 && finalizedOrders === totalOrders;

    const summary = {
      total_orders: totalOrders,
      finalized_orders: finalizedOrders,
      all_finalized: allFinalized,
      grand_total_delivered: allOrders.reduce((sum, o) => sum + (o.total_delivered || 0), 0),
      grand_total_absent: allOrders.reduce((sum, o) => sum + (o.total_absent || 0), 0),
      grand_total_extra: allOrders.reduce((sum, o) => sum + (o.total_extra || 0), 0),
      grand_total_amount: allOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    };

    const combinedInvoice: CombinedInvoice = {
      customer_id: Number(customer_id),
      customer_name: customer.name,
      customer_phone: customer.phone || '',
      customer_address: customer.address || '',
      billing_month: billing_month as string,
      orders: allOrders,
      summary,
      can_approve: allFinalized,
    };

    return res.status(200).json({
      success: true,
      data: combinedInvoice,
    });
  } catch (error: any) {
    console.error('Error getting combined invoice:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get combined invoice',
    });
  }
}
