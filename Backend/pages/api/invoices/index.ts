import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../src/config/database';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface InvoiceListItem {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer_name: string;
  invoice_type: 'individual' | 'combined';
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: 'unpaid' | 'partial_paid' | 'paid';
  generated_at: string;
  generated_by: string | null;
  due_date: string | null;
  order_count: number;
  billing_months: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<InvoiceListItem[] | InvoiceListItem>>
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
    const {
      customer_id,
      payment_status,
      invoice_type,
      billing_month,
      page = '1',
      limit = '20',
      sort_by = 'generated_at',
      sort_order = 'desc',
    } = req.query;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];

    if (customer_id) {
      conditions.push('i.customer_id = ?');
      params.push(customer_id);
    }

    if (payment_status) {
      conditions.push('i.payment_status = ?');
      params.push(payment_status);
    }

    if (invoice_type) {
      conditions.push('i.invoice_type = ?');
      params.push(invoice_type);
    }

    if (billing_month) {
      // Filter invoices that have order_billings for this month
      conditions.push(`EXISTS (
        SELECT 1 FROM order_billing ob
        WHERE ob.invoice_id = i.id AND ob.billing_month = ?
      )`);
      params.push(billing_month);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate sort options
    const validSortColumns = ['generated_at', 'invoice_number', 'total_amount', 'balance_due', 'payment_status', 'customer_name'];
    const sortColumn = validSortColumns.includes(sort_by as string) ? sort_by : 'generated_at';
    const sortDir = sort_order === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await query<any[]>(
      `SELECT COUNT(*) as total
       FROM invoices i
       INNER JOIN customers c ON i.customer_id = c.id
       ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;
    const totalPages = Math.ceil(total / limitNum);

    // Get invoices with aggregated order info
    // Note: LIMIT and OFFSET are embedded directly as they're validated integers
    // This avoids mysql2 prepared statement issues with GROUP BY queries
    const invoices = await query<InvoiceListItem[]>(
      `SELECT
        i.id,
        i.invoice_number,
        i.customer_id,
        c.name as customer_name,
        i.invoice_type,
        i.total_amount,
        i.amount_paid,
        i.balance_due,
        i.payment_status,
        i.generated_at,
        i.generated_by,
        i.due_date,
        COUNT(ob.id) as order_count,
        GROUP_CONCAT(DISTINCT ob.billing_month ORDER BY ob.billing_month SEPARATOR ', ') as billing_months
       FROM invoices i
       INNER JOIN customers c ON i.customer_id = c.id
       LEFT JOIN order_billing ob ON ob.invoice_id = i.id
       ${whereClause}
       GROUP BY i.id
       ORDER BY ${sortColumn === 'customer_name' ? 'c.name' : `i.${sortColumn}`} ${sortDir}
       LIMIT ${limitNum} OFFSET ${offset}`,
      params
    );

    // Format amounts
    const formattedInvoices = invoices.map(inv => ({
      ...inv,
      total_amount: Number(inv.total_amount),
      amount_paid: Number(inv.amount_paid),
      balance_due: Number(inv.balance_due),
      order_count: Number(inv.order_count),
    }));

    return res.status(200).json({
      success: true,
      data: formattedInvoices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch invoices',
    });
  }
}
