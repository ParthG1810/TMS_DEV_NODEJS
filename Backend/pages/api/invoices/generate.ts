import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface GenerateInvoiceRequest {
  customer_id: number;
  order_billing_ids: number[];
  generated_by?: string;
  due_date?: string;
  notes?: string;
}

interface InvoiceOrder {
  id: number;
  order_id: number;
  meal_plan_name: string;
  billing_month: string;
  total_amount: number;
}

interface GeneratedInvoice {
  id: number;
  invoice_number: string;
  invoice_type: 'individual' | 'combined';
  customer_id: number;
  customer_name: string;
  total_amount: number;
  balance_due: number;
  payment_status: string;
  generated_at: string;
  due_date: string | null;
  orders: InvoiceOrder[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<GeneratedInvoice>>
) {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    const {
      customer_id,
      order_billing_ids,
      generated_by,
      due_date,
      notes,
    }: GenerateInvoiceRequest = req.body;

    // Validate required fields
    if (!customer_id) {
      return res.status(400).json({
        success: false,
        error: 'customer_id is required',
      });
    }

    // Convert customer_id to number for proper comparison
    const customerIdNum = Number(customer_id);

    if (!order_billing_ids || !Array.isArray(order_billing_ids) || order_billing_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'order_billing_ids must be a non-empty array',
      });
    }

    // Validate customer exists
    const customers = await query<any[]>(
      'SELECT id, name FROM customers WHERE id = ?',
      [customer_id]
    );

    if (customers.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }

    const customer = customers[0];

    // Validate all order_billing records exist, are finalized, and don't already have an invoice
    const placeholders = order_billing_ids.map(() => '?').join(', ');
    const orderBillings = await query<any[]>(
      `SELECT
        ob.id,
        ob.order_id,
        ob.customer_id,
        ob.billing_month,
        ob.total_amount,
        ob.status,
        ob.invoice_id,
        mp.meal_name as meal_plan_name
      FROM order_billing ob
      INNER JOIN customer_orders co ON ob.order_id = co.id
      INNER JOIN meal_plans mp ON co.meal_plan_id = mp.id
      WHERE ob.id IN (${placeholders})`,
      order_billing_ids
    );

    // Check if all requested order_billings were found
    if (orderBillings.length !== order_billing_ids.length) {
      const foundIds = orderBillings.map(ob => ob.id);
      const missingIds = order_billing_ids.filter(id => !foundIds.includes(id));
      return res.status(400).json({
        success: false,
        error: `Order billing records not found: ${missingIds.join(', ')}`,
      });
    }

    // Check all belong to the same customer
    const wrongCustomer = orderBillings.filter(ob => ob.customer_id !== customerIdNum);
    if (wrongCustomer.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'All order billings must belong to the same customer',
      });
    }

    // Check all are finalized or approved
    const notReady = orderBillings.filter(ob => ob.status !== 'finalized' && ob.status !== 'approved');
    if (notReady.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Order billings must be finalized or approved before generating invoice. Not ready: ${notReady.map(ob => ob.id).join(', ')}`,
      });
    }

    // Check none already have an invoice
    const alreadyInvoiced = orderBillings.filter(ob => ob.invoice_id !== null);
    if (alreadyInvoiced.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Order billings already have an invoice: ${alreadyInvoiced.map(ob => ob.id).join(', ')}`,
      });
    }

    // Calculate total amount
    const totalAmount = orderBillings.reduce((sum, ob) => sum + Number(ob.total_amount), 0);

    // Determine invoice type
    const invoiceType = orderBillings.length === 1 ? 'individual' : 'combined';

    // Get current date for invoice number (YYYYMMDD format)
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD

    // Get the first order_id and billing_month for the invoice number
    const firstOrderId = orderBillings[0].order_id;
    const billingMonth = orderBillings[0].billing_month; // Format: YYYY-MM

    // Convert billing_month (YYYY-MM) to Month-Year format (e.g., Dec-2025)
    const [billingYear, billingMonthNum] = billingMonth.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthYearStr = `${monthNames[parseInt(billingMonthNum, 10) - 1]}-${billingYear}`;

    // Generate invoice number based on type
    // Single: INV-C{CustomerID}-O{OrderID_Month-Year}-{YYYYMMDD}-{Counter}
    // Combined: INV-C{CustomerID}-O{OrderID_Month-Year}-CMB-{YYYYMMDD}-{Counter}
    let invoiceNumberPrefix: string;
    let invoiceNumberPattern: string;

    if (invoiceType === 'individual') {
      invoiceNumberPrefix = `INV-C${customerIdNum}-O${firstOrderId}_${monthYearStr}-${dateStr}`;
      invoiceNumberPattern = `INV-C${customerIdNum}-O${firstOrderId}_${monthYearStr}-${dateStr}-%`;
    } else {
      invoiceNumberPrefix = `INV-C${customerIdNum}-O${firstOrderId}_${monthYearStr}-CMB-${dateStr}`;
      invoiceNumberPattern = `INV-C${customerIdNum}-O${firstOrderId}_${monthYearStr}-CMB-${dateStr}-%`;
    }

    // Get the next counter for this pattern
    const counterResult = await query<any[]>(
      `SELECT COALESCE(MAX(
        CAST(SUBSTRING_INDEX(invoice_number, '-', -1) AS UNSIGNED)
      ), 0) + 1 as next_counter
      FROM invoices
      WHERE invoice_number LIKE ?`,
      [invoiceNumberPattern]
    );

    const nextCounter = counterResult[0].next_counter;
    const invoiceNumber = `${invoiceNumberPrefix}-${String(nextCounter).padStart(3, '0')}`;

    // Create the invoice
    const insertResult = await query<any>(
      `INSERT INTO invoices (
        invoice_number,
        customer_id,
        invoice_type,
        total_amount,
        amount_paid,
        balance_due,
        payment_status,
        generated_by,
        due_date,
        notes
      ) VALUES (?, ?, ?, ?, 0, ?, 'unpaid', ?, ?, ?)`,
      [
        invoiceNumber,
        customerIdNum,
        invoiceType,
        totalAmount,
        totalAmount,
        generated_by || null,
        due_date || null,
        notes || null,
      ]
    );

    const invoiceId = insertResult.insertId;

    // Update all order_billing records to link to this invoice and set status to 'invoiced'
    await query(
      `UPDATE order_billing
       SET invoice_id = ?, status = 'invoiced'
       WHERE id IN (${placeholders})`,
      [invoiceId, ...order_billing_ids]
    );

    // Update customer_orders payment_status to 'finalized' for all linked orders AND their child orders
    const orderIds = orderBillings.map(ob => ob.order_id);
    const orderPlaceholders = orderIds.map(() => '?').join(', ');
    await query(
      `UPDATE customer_orders
       SET payment_status = 'finalized'
       WHERE id IN (${orderPlaceholders}) OR parent_order_id IN (${orderPlaceholders})`,
      [...orderIds, ...orderIds]
    );

    // Fetch the created invoice with details
    const invoices = await query<any[]>(
      `SELECT
        i.*,
        c.name as customer_name
      FROM invoices i
      INNER JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?`,
      [invoiceId]
    );

    const invoice = invoices[0];

    // Build the response
    const response: GeneratedInvoice = {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      invoice_type: invoice.invoice_type,
      customer_id: invoice.customer_id,
      customer_name: invoice.customer_name,
      total_amount: Number(invoice.total_amount),
      balance_due: Number(invoice.balance_due),
      payment_status: invoice.payment_status,
      generated_at: invoice.generated_at,
      due_date: invoice.due_date,
      orders: orderBillings.map(ob => ({
        id: ob.id,
        order_id: ob.order_id,
        meal_plan_name: ob.meal_plan_name,
        billing_month: ob.billing_month,
        total_amount: Number(ob.total_amount),
      })),
    };

    // Delete any pending approval notifications for the invoiced order billings
    try {
      const billingPlaceholders = order_billing_ids.map(() => '?').join(', ');
      await query(
        `DELETE FROM payment_notifications
         WHERE order_billing_id IN (${billingPlaceholders})
         AND notification_type IN ('billing_pending_approval', 'order_approved')`,
        order_billing_ids
      );
      console.log(`[Invoice Generate] Removed notifications for order_billing_ids: ${order_billing_ids.join(', ')}`);
    } catch (notificationError) {
      // Log but don't fail the request if notification deletion fails
      console.error('Error deleting notifications on invoice generation:', notificationError);
    }

    console.log(`[Invoice Generate] Created invoice ${invoiceNumber} for customer ${customerIdNum} with ${orderBillings.length} order(s), total: ${totalAmount}`);

    return res.status(201).json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error('Error generating invoice:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate invoice',
    });
  }
}
