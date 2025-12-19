import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AvailableOrderBilling {
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
  status: string;
  finalized_at: string | null;
  finalized_by: string | null;
  meal_plan_name: string;
  order_price: number;
  start_date: string;
  end_date: string;
}

interface InvoicedOrderBilling extends AvailableOrderBilling {
  invoice_id: number;
  invoice_number: string;
}

interface NotReadyOrderBilling {
  id: number;
  order_id: number;
  meal_plan_name: string;
  billing_month: string;
  total_amount: number;
  status: string;
}

interface AvailableForInvoiceResponse {
  customer: {
    id: number;
    name: string;
    phone: string;
    address: string;
  };
  billing_month: string;
  available_orders: AvailableOrderBilling[];
  already_invoiced_orders: InvoicedOrderBilling[];
  not_ready_orders: NotReadyOrderBilling[];
  summary: {
    total_orders: number;
    available_for_invoice: number;
    already_invoiced: number;
    not_ready: number;
    available_total_amount: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<AvailableForInvoiceResponse>>
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

    // Validate billing_month format
    if (!/^\d{4}-\d{2}$/.test(billing_month as string)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid billing_month format - must be YYYY-MM',
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

    // Get date range for the billing month
    const [year, monthNum] = (billing_month as string).split('-').map(Number);
    const firstDayOfMonth = `${billing_month}-01`;
    const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
    const lastDayOfMonthStr = `${billing_month}-${String(lastDayOfMonth).padStart(2, '0')}`;

    // Get all order_billing records for this customer and month
    const allOrderBillings = await query<any[]>(
      `SELECT
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
        ob.finalized_by,
        ob.invoice_id,
        i.invoice_number,
        mp.meal_name as meal_plan_name,
        co.price as order_price,
        DATE_FORMAT(co.start_date, '%Y-%m-%d') as start_date,
        DATE_FORMAT(co.end_date, '%Y-%m-%d') as end_date
      FROM order_billing ob
      INNER JOIN customer_orders co ON ob.order_id = co.id
      INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
      LEFT JOIN invoices i ON ob.invoice_id = i.id
      WHERE ob.customer_id = ?
      AND ob.billing_month = ?
      AND (co.parent_order_id IS NULL OR co.parent_order_id = 0)
      ORDER BY mp.meal_name`,
      [customer_id, billing_month]
    );

    // Also get orders that don't have billing records yet but should
    const ordersWithoutBilling = await query<any[]>(
      `SELECT
        co.id as order_id,
        co.customer_id,
        mp.meal_name as meal_plan_name,
        co.price as order_price,
        DATE_FORMAT(co.start_date, '%Y-%m-%d') as start_date,
        DATE_FORMAT(co.end_date, '%Y-%m-%d') as end_date
      FROM customer_orders co
      INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
      LEFT JOIN order_billing ob ON co.id = ob.order_id AND ob.billing_month = ?
      WHERE co.customer_id = ?
      AND co.start_date <= ?
      AND co.end_date >= ?
      AND (co.parent_order_id IS NULL OR co.parent_order_id = 0)
      AND ob.id IS NULL
      ORDER BY mp.meal_name`,
      [billing_month, customer_id, lastDayOfMonthStr, firstDayOfMonth]
    );

    // Categorize the order billings
    const availableOrders: AvailableOrderBilling[] = [];
    const alreadyInvoicedOrders: InvoicedOrderBilling[] = [];
    const notReadyOrders: NotReadyOrderBilling[] = [];

    // Process existing order_billings
    for (const ob of allOrderBillings) {
      const formatted = {
        id: ob.id,
        order_id: ob.order_id,
        customer_id: ob.customer_id,
        billing_month: ob.billing_month,
        total_delivered: ob.total_delivered,
        total_absent: ob.total_absent,
        total_extra: ob.total_extra,
        total_plan_days: ob.total_plan_days,
        base_amount: Number(ob.base_amount),
        extra_amount: Number(ob.extra_amount),
        total_amount: Number(ob.total_amount),
        status: ob.status,
        finalized_at: ob.finalized_at,
        finalized_by: ob.finalized_by,
        meal_plan_name: ob.meal_plan_name,
        order_price: Number(ob.order_price),
        start_date: ob.start_date,
        end_date: ob.end_date,
      };

      if (ob.invoice_id) {
        // Already has an invoice
        alreadyInvoicedOrders.push({
          ...formatted,
          invoice_id: ob.invoice_id,
          invoice_number: ob.invoice_number,
        });
      } else if (ob.status === 'finalized') {
        // Finalized and available for invoice
        availableOrders.push(formatted);
      } else {
        // Still calculating
        notReadyOrders.push({
          id: ob.id,
          order_id: ob.order_id,
          meal_plan_name: ob.meal_plan_name,
          billing_month: ob.billing_month,
          total_amount: Number(ob.total_amount),
          status: ob.status,
        });
      }
    }

    // Add orders without billing records as not ready
    for (const order of ordersWithoutBilling) {
      notReadyOrders.push({
        id: 0,
        order_id: order.order_id,
        meal_plan_name: order.meal_plan_name,
        billing_month: billing_month as string,
        total_amount: 0,
        status: 'no_billing',
      });
    }

    // Calculate summary
    const totalOrders = availableOrders.length + alreadyInvoicedOrders.length + notReadyOrders.length;
    const availableTotalAmount = availableOrders.reduce((sum, o) => sum + o.total_amount, 0);

    const response: AvailableForInvoiceResponse = {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone || '',
        address: customer.address || '',
      },
      billing_month: billing_month as string,
      available_orders: availableOrders,
      already_invoiced_orders: alreadyInvoicedOrders,
      not_ready_orders: notReadyOrders,
      summary: {
        total_orders: totalOrders,
        available_for_invoice: availableOrders.length,
        already_invoiced: alreadyInvoicedOrders.length,
        not_ready: notReadyOrders.length,
        available_total_amount: availableTotalAmount,
      },
    };

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error('Error getting available orders for invoice:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get available orders',
    });
  }
}
