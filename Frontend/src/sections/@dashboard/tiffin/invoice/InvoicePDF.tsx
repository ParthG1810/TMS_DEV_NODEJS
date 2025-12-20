import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

// ----------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 8,
    alignSelf: 'center',
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  invoiceTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    color: '#1976d2',
  },
  invoiceNumber: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 2,
  },
  invoiceDate: {
    fontSize: 8,
    color: '#666666',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginVertical: 12,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  infoColumn: {
    width: '48%',
  },
  infoLabel: {
    fontSize: 8,
    color: '#666666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 9,
    color: '#333333',
    marginBottom: 2,
  },
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tableColMealPlan: {
    width: '30%',
  },
  tableColMonth: {
    width: '15%',
  },
  tableColDelivered: {
    width: '12%',
    textAlign: 'center',
  },
  tableColAbsent: {
    width: '12%',
    textAlign: 'center',
  },
  tableColExtra: {
    width: '12%',
    textAlign: 'center',
  },
  tableColAmount: {
    width: '19%',
    textAlign: 'right',
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#333333',
  },
  tableCellText: {
    fontSize: 9,
    color: '#333333',
  },
  tableCellBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#333333',
  },
  tableCellSmall: {
    fontSize: 7,
    color: '#666666',
  },
  deliveredBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    color: '#2e7d32',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  absentBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    color: '#c62828',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  extraBadge: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    color: '#1565c0',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 6,
    backgroundColor: '#f5f5f5',
  },
  summarySection: {
    marginTop: 15,
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#666666',
    width: 100,
    textAlign: 'right',
    marginRight: 15,
  },
  summaryValue: {
    fontSize: 9,
    color: '#333333',
    width: 80,
    textAlign: 'right',
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  summaryTotalLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#333333',
    width: 100,
    textAlign: 'right',
    marginRight: 15,
  },
  summaryTotalValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1976d2',
    width: 80,
    textAlign: 'right',
  },
  paymentSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
  },
  paymentTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    color: '#333333',
  },
  paymentText: {
    fontSize: 9,
    color: '#333333',
    marginBottom: 3,
  },
  paymentEmail: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1976d2',
  },
  notesSection: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#fff9e6',
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    color: '#333333',
  },
  notesText: {
    fontSize: 8,
    color: '#666666',
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    right: 40,
    textAlign: 'center',
    paddingTop: 10,
    borderTop: '1px solid #e0e0e0',
  },
  footerText: {
    fontSize: 7,
    color: '#999999',
  },
  chip: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    alignSelf: 'flex-start',
  },
  statusPaid: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    color: '#2e7d32',
  },
  statusPartial: {
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    color: '#e65100',
  },
  statusUnpaid: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    color: '#c62828',
  },
});

// ----------------------------------------------------------------------

interface OrderBillingDetail {
  id: number;
  order_id: number;
  billing_month: string;
  total_delivered: number;
  total_absent: number;
  total_extra: number;
  total_plan_days: number;
  base_amount: number;
  extra_amount: number;
  total_amount: number;
  meal_plan_name: string;
  order_price: number;
  start_date: string;
  end_date: string;
}

interface InvoiceDetail {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  invoice_type: 'individual' | 'combined';
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: 'unpaid' | 'partial_paid' | 'paid';
  generated_at: string;
  generated_by: string | null;
  due_date: string | null;
  notes: string | null;
  orders: OrderBillingDetail[];
}

interface InvoicePDFProps {
  invoice: InvoiceDetail;
  companyName: string;
  eTransferEmail: string;
  companyLogo?: string;
}

// ----------------------------------------------------------------------

export default function InvoicePDF({
  invoice,
  companyName,
  eTransferEmail,
  companyLogo,
}: InvoicePDFProps) {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusStyle = () => {
    switch (invoice.payment_status) {
      case 'paid':
        return styles.statusPaid;
      case 'partial_paid':
        return styles.statusPartial;
      default:
        return styles.statusUnpaid;
    }
  };

  const getStatusLabel = () => {
    switch (invoice.payment_status) {
      case 'paid':
        return 'PAID';
      case 'partial_paid':
        return 'PARTIAL';
      default:
        return 'UNPAID';
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {companyLogo && <Image src={companyLogo} style={styles.logo} />}
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.invoiceTitle}>
            {invoice.invoice_type === 'combined' ? 'COMBINED INVOICE' : 'INVOICE'}
          </Text>
          <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          <Text style={styles.invoiceDate}>
            Generated: {formatDate(invoice.generated_at)}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Customer and Invoice Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>Bill To</Text>
            <Text style={styles.infoValue}>{invoice.customer_name}</Text>
            <Text style={styles.infoText}>{invoice.customer_phone || 'No phone'}</Text>
            <Text style={styles.infoText}>{invoice.customer_address || 'No address'}</Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>Invoice Details</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.infoText}>Status: </Text>
              <Text style={[styles.chip, getStatusStyle()]}>{getStatusLabel()}</Text>
            </View>
            <Text style={styles.infoText}>
              Orders: {invoice.orders.length}
            </Text>
            {invoice.due_date && (
              <Text style={styles.infoText}>
                Due: {formatDate(invoice.due_date)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Orders Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={styles.tableColMealPlan}>
              <Text style={styles.tableHeaderText}>Meal Plan</Text>
            </View>
            <View style={styles.tableColMonth}>
              <Text style={styles.tableHeaderText}>Month</Text>
            </View>
            <View style={styles.tableColDelivered}>
              <Text style={styles.tableHeaderText}>Delivered</Text>
            </View>
            <View style={styles.tableColAbsent}>
              <Text style={styles.tableHeaderText}>Absent</Text>
            </View>
            <View style={styles.tableColExtra}>
              <Text style={styles.tableHeaderText}>Extra</Text>
            </View>
            <View style={styles.tableColAmount}>
              <Text style={styles.tableHeaderText}>Amount</Text>
            </View>
          </View>

          {/* Table Rows */}
          {invoice.orders.map((order, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.tableColMealPlan}>
                <Text style={styles.tableCellBold}>{order.meal_plan_name}</Text>
                <Text style={styles.tableCellSmall}>Order #{order.order_id}</Text>
              </View>
              <View style={styles.tableColMonth}>
                <Text style={styles.tableCellText}>{formatMonth(order.billing_month)}</Text>
              </View>
              <View style={styles.tableColDelivered}>
                <Text style={styles.deliveredBadge}>{order.total_delivered}</Text>
              </View>
              <View style={styles.tableColAbsent}>
                <Text style={styles.absentBadge}>{order.total_absent}</Text>
              </View>
              <View style={styles.tableColExtra}>
                <Text style={styles.extraBadge}>{order.total_extra}</Text>
              </View>
              <View style={styles.tableColAmount}>
                <Text style={styles.tableCellBold}>{formatCurrency(order.total_amount)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(invoice.total_amount)}</Text>
          </View>
          {invoice.amount_paid > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount Paid:</Text>
              <Text style={[styles.summaryValue, { color: '#2e7d32' }]}>
                -{formatCurrency(invoice.amount_paid)}
              </Text>
            </View>
          )}
          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Balance Due:</Text>
            <Text style={styles.summaryTotalValue}>{formatCurrency(invoice.balance_due)}</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Payment Information */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Payment Information</Text>
          <Text style={styles.paymentText}>Please send payment via e-Transfer to:</Text>
          <Text style={styles.paymentEmail}>{eTransferEmail}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for your business! - {companyName}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
