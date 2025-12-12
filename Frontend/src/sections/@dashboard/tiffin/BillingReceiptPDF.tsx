import React from 'react';
import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import { styles } from './BillingReceiptStyle';

// ----------------------------------------------------------------------

interface BillingData {
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
  };
  calendar: Array<{
    delivery_date: string;
    status: 'delivered' | 'absent' | 'extra' | null;
    order_id: number;
    meal_plan_name: string;
    quantity: number;
    price: number | null;
  }>;
}

interface BillingReceiptPDFProps {
  billingData: BillingData;
  companyName: string;
  eTransferEmail: string;
  companyLogo?: string;
}

// ----------------------------------------------------------------------

/**
 * Professional PDF Receipt Component
 * Generates a clean, printable billing receipt with company branding
 */
export default function BillingReceiptPDF({
  billingData,
  companyName,
  eTransferEmail,
  companyLogo,
}: BillingReceiptPDFProps) {
  const { billing, calendar } = billingData;

  // Generate calendar grid
  const [year, month] = billing.billing_month.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0 = Sunday

  // Create calendar grid mapping
  const calendarGrid: { [day: number]: 'delivered' | 'absent' | 'extra' | null } = {};
  calendar.forEach((entry) => {
    const day = parseInt(entry.delivery_date.split('-')[2], 10);
    calendarGrid[day] = entry.status;
  });

  // Get month name
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const monthName = monthNames[month - 1];

  // Format currency
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  // Get current date
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Generate invoice number
  const invoiceNumber = `MB-${billing.id.toString().padStart(6, '0')}`;

  // Calculate summary
  const deliveredAmount = billing.base_amount;
  const absentDeduction = 0; // Absent days are not charged
  const extraAmount = billing.extra_amount;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Logo and Company Name */}
        <View style={styles.header}>
          {companyLogo && (
            <Image
              src={companyLogo}
              style={styles.logo}
            />
          )}
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.invoiceTitle}>INVOICE</Text>
          <Text style={styles.invoiceDate}>Invoice Date: {currentDate}</Text>
          <Text style={styles.invoiceDate}>Invoice #: {invoiceNumber}</Text>
        </View>

        <View style={styles.divider} />

        {/* Customer Info and Billing Period */}
        <View style={styles.infoSection}>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>Bill To</Text>
            <Text style={styles.infoValue}>{billing.customer_name}</Text>
            <Text style={styles.infoText}>{billing.customer_phone || 'No phone'}</Text>
            <Text style={styles.infoText}>{billing.customer_address}</Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>Billing Period</Text>
            <Text style={styles.infoValue}>
              {monthName} {year}
            </Text>
            <Text style={styles.infoText}>Invoice #: {invoiceNumber}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Delivery Calendar */}
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>Delivery Calendar</Text>

          {/* Calendar Header */}
          <View style={styles.calendarGrid}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <View key={day} style={styles.calendarHeaderCell}>
                <Text>{day}</Text>
              </View>
            ))}

            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <View key={`empty-${i}`} style={styles.calendarCell} />
            ))}

            {/* Calendar days */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const status = calendarGrid[day];

              // Handle both database values ('T', 'A', 'E') and full names
              const isDelivered = status === 'T' || status === 'delivered';
              const isAbsent = status === 'A' || status === 'absent';
              const isExtra = status === 'E' || status === 'extra';

              let cellStyle = [styles.calendarCell];
              let textStyle = [styles.calendarDayStatus];

              if (isDelivered) {
                cellStyle.push(styles.deliveredCell);
                textStyle.push(styles.deliveredText);
              } else if (isAbsent) {
                cellStyle.push(styles.absentCell);
                textStyle.push(styles.absentText);
              } else if (isExtra) {
                cellStyle.push(styles.extraCell);
                textStyle.push(styles.extraText);
              }

              // Use same format as My Use tab: T, A, E
              const statusText = isDelivered ? 'T' : isAbsent ? 'A' : isExtra ? 'E' : '';

              return (
                <View key={day} style={cellStyle}>
                  <Text style={styles.calendarDayNumber}>{day}</Text>
                  {statusText && <Text style={textStyle}>{statusText}</Text>}
                </View>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, styles.deliveredCell]} />
              <Text style={styles.legendText}>Delivered ({billing.total_delivered})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, styles.absentCell]} />
              <Text style={styles.legendText}>Absent ({billing.total_absent})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, styles.extraCell]} />
              <Text style={styles.legendText}>Extra ({billing.total_extra})</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Summary Section */}
        <View style={styles.summarySection}>
          <View style={styles.summaryTable}>
            <View style={[styles.summaryRow, styles.summaryRowBorder]}>
              <Text style={styles.summaryLabel}>Delivered ({billing.total_delivered} tiffins)</Text>
              <Text style={styles.summaryValue}>{formatCurrency(deliveredAmount)}</Text>
            </View>

            {billing.total_absent > 0 && (
              <View style={[styles.summaryRow, styles.summaryRowBorder]}>
                <Text style={styles.summaryLabel}>Absent ({billing.total_absent} days)</Text>
                <Text style={styles.summaryValue}>-{formatCurrency(absentDeduction)}</Text>
              </View>
            )}

            {billing.total_extra > 0 && (
              <View style={[styles.summaryRow, styles.summaryRowBorder]}>
                <Text style={styles.summaryLabel}>Extra ({billing.total_extra} tiffins)</Text>
                <Text style={styles.summaryValue}>{formatCurrency(extraAmount)}</Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelBold}>Total Amount Due</Text>
              <Text style={styles.summaryValueBold}>{formatCurrency(billing.total_amount)}</Text>
            </View>
          </View>
        </View>

        {/* Total Amount Highlighted */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total Amount Due</Text>
          <Text style={styles.totalAmount}>{formatCurrency(billing.total_amount)}</Text>
        </View>

        <View style={styles.divider} />

        {/* Payment Information */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Payment Method</Text>
          <Text style={styles.paymentText}>E-Transfer to:</Text>
          <Text style={styles.paymentEmail}>{eTransferEmail}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Thank you for your business!</Text>
          <Text style={styles.footerText}>
            For questions regarding this invoice, please contact us.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
