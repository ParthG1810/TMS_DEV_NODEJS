import React from 'react';
import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import { StyleSheet } from '@react-pdf/renderer';

// ----------------------------------------------------------------------

// PDF Styles matching My Use tab calendar
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 20,
    paddingBottom: 25,
    paddingHorizontal: 30,
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 12,
    textAlign: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 6,
    alignSelf: 'center',
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  invoiceTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
    color: '#1976d2',
  },
  invoiceDate: {
    fontSize: 8,
    color: '#666666',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginVertical: 8,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoColumn: {
    width: '48%',
  },
  infoLabel: {
    fontSize: 8,
    color: '#666666',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 8,
    color: '#333333',
    marginBottom: 1,
  },
  calendarSection: {
    marginBottom: 10,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    color: '#333333',
    textAlign: 'center',
    alignSelf: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
    width: 280,
    alignSelf: 'center',
  },
  calendarHeaderCell: {
    width: '13%',
    margin: '1.5px',
    padding: 3,
    backgroundColor: 'transparent',
    textAlign: 'center',
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
  },
  calendarCell: {
    width: '13%',
    margin: '1.5px',
    padding: 4,
    minHeight: 20,
    borderRadius: 3,
    textAlign: 'center',
    fontSize: 6.5,
    backgroundColor: 'transparent',
  },
  calendarDayNumber: {
    marginBottom: 0.5,
    fontSize: 6.5,
  },
  calendarDayStatus: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
  },
  deliveredCell: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  absentCell: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  extraCell: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
  },
  deliveredText: {
    color: '#4caf50',
  },
  absentText: {
    color: '#f44336',
  },
  extraText: {
    color: '#2196f3',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
    gap: 10,
    alignSelf: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  legendBox: {
    width: 10,
    height: 10,
    marginRight: 4,
    borderRadius: 1,
  },
  legendText: {
    fontSize: 7,
    color: '#666666',
  },
  calculationSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  calculationTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    color: '#333333',
  },
  calculationRow: {
    fontSize: 7,
    color: '#666666',
    marginLeft: 10,
    marginBottom: 2,
  },
  calculationRowBold: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    marginLeft: 10,
    marginBottom: 3,
  },
  totalSection: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    marginVertical: 10,
    textAlign: 'center',
    borderRadius: 3,
  },
  totalLabel: {
    fontSize: 8,
    color: '#666666',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  totalAmount: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1976d2',
  },
  paymentSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  paymentTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
    color: '#333333',
  },
  paymentText: {
    fontSize: 8,
    color: '#333333',
    marginBottom: 2,
  },
  paymentEmail: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1976d2',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    paddingTop: 8,
    borderTop: '1px solid #e0e0e0',
  },
  footerText: {
    fontSize: 7,
    color: '#999999',
  },
});

// ----------------------------------------------------------------------

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

interface OrderInvoicePDFProps {
  invoiceData: OrderInvoice;
  companyName: string;
  eTransferEmail: string;
  companyLogo?: string;
}

// ----------------------------------------------------------------------

export default function OrderInvoicePDF({
  invoiceData,
  companyName,
  eTransferEmail,
  companyLogo,
}: OrderInvoicePDFProps) {
  const { billing_month, billing, calendar_entries } = invoiceData;

  // Generate calendar grid
  const [year, month] = billing_month.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  // Create calendar grid mapping
  const calendarGrid: { [day: number]: 'T' | 'A' | 'E' | null } = {};
  calendar_entries.forEach((entry) => {
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
  const invoiceNumber = `OI-${invoiceData.order_id.toString().padStart(6, '0')}`;

  // Calculate per tiffin price
  const perTiffinPrice =
    billing.total_plan_days > 0 ? invoiceData.meal_plan_price / billing.total_plan_days : 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Logo and Company Name */}
        <View style={styles.header}>
          {companyLogo && <Image src={companyLogo} style={styles.logo} />}
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.invoiceTitle}>ORDER INVOICE</Text>
          <Text style={styles.invoiceDate}>Invoice Date: {currentDate}</Text>
          <Text style={styles.invoiceDate}>Invoice #: {invoiceNumber}</Text>
        </View>

        <View style={styles.divider} />

        {/* Customer Info and Order Details */}
        <View style={styles.infoSection}>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>Bill To</Text>
            <Text style={styles.infoValue}>{invoiceData.customer_name}</Text>
            <Text style={styles.infoText}>{invoiceData.customer_phone || 'No phone'}</Text>
            <Text style={styles.infoText}>{invoiceData.customer_address}</Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>Order Details</Text>
            <Text style={styles.infoValue}>{invoiceData.meal_plan_name}</Text>
            <Text style={styles.infoText}>
              Period: {monthName} {year}
            </Text>
            <Text style={styles.infoText}>
              Days: {invoiceData.selected_days.join(', ')}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Delivery Calendar */}
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>Delivery Calendar</Text>

          <View style={styles.calendarGrid}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <View key={day} style={styles.calendarHeaderCell}>
                <Text>{day}</Text>
              </View>
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const status = calendarGrid[day];

              let cellStyle = [styles.calendarCell];
              let textStyle = [styles.calendarDayStatus];

              if (status === 'T') {
                cellStyle.push(styles.deliveredCell);
                textStyle.push(styles.deliveredText);
              } else if (status === 'A') {
                cellStyle.push(styles.absentCell);
                textStyle.push(styles.absentText);
              } else if (status === 'E') {
                cellStyle.push(styles.extraCell);
                textStyle.push(styles.extraText);
              }

              const statusText = status === 'T' ? '✓' : status === 'A' ? '✗' : status === 'E' ? '+' : '';

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

        {/* Billing Calculation Breakdown */}
        <View style={styles.calculationSection}>
          <Text style={styles.calculationTitle}>Billing Calculation Breakdown</Text>

          <Text style={styles.calculationRowBold}>
            Base Order: {invoiceData.meal_plan_name}
          </Text>
          <Text style={styles.calculationRow}>├─ Order Price: {formatCurrency(invoiceData.meal_plan_price)}</Text>
          <Text style={styles.calculationRow}>
            ├─ Total {invoiceData.selected_days.join('-')} days in {monthName}: {billing.total_plan_days} days
          </Text>
          <Text style={styles.calculationRow}>
            ├─ Per-Tiffin Price: {formatCurrency(invoiceData.meal_plan_price)} ÷ {billing.total_plan_days} ={' '}
            {formatCurrency(perTiffinPrice)}/tiffin
          </Text>
          <Text style={styles.calculationRow}>
            └─ Order covers: {new Date(invoiceData.start_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}{' '}
            -{' '}
            {new Date(invoiceData.end_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>

          <Text style={styles.calculationRowBold}>Delivered Tiffins</Text>
          <Text style={styles.calculationRow}>
            ├─ Count: {billing.total_delivered} tiffins delivered
          </Text>
          <Text style={styles.calculationRow}>
            ├─ Calculation: {billing.total_delivered} × {formatCurrency(perTiffinPrice)} ={' '}
            {formatCurrency(billing.total_delivered * perTiffinPrice)}
          </Text>
          <Text style={styles.calculationRow}>
            └─ Subtotal: {formatCurrency(billing.total_delivered * perTiffinPrice)}
          </Text>

          {billing.total_absent > 0 && (
            <>
              <Text style={styles.calculationRowBold}>Absent Days (Deduction)</Text>
              <Text style={styles.calculationRow}>
                ├─ Count: {billing.total_absent} day(s) absent
              </Text>
              <Text style={styles.calculationRow}>
                ├─ Calculation: {billing.total_absent} × {formatCurrency(perTiffinPrice)} = -
                {formatCurrency(billing.total_absent * perTiffinPrice)}
              </Text>
              <Text style={styles.calculationRow}>
                └─ Deduction: -{formatCurrency(billing.total_absent * perTiffinPrice)}
              </Text>
            </>
          )}

          {billing.total_extra > 0 && (
            <>
              <Text style={styles.calculationRowBold}>Extra Tiffins</Text>
              <Text style={styles.calculationRow}>
                ├─ Count: {billing.total_extra} extra tiffin(s)
              </Text>
              <Text style={styles.calculationRow}>
                ├─ Price: {formatCurrency(billing.extra_amount / billing.total_extra)}/tiffin
              </Text>
              <Text style={styles.calculationRow}>
                └─ Addition: +{formatCurrency(billing.extra_amount)}
              </Text>
            </>
          )}
        </View>

        <View style={styles.divider} />

        {/* Total Amount */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>{formatCurrency(billing.total_amount)}</Text>
        </View>

        {/* Payment Information */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Payment Information</Text>
          <Text style={styles.paymentText}>
            Please send payment via e-Transfer to:
          </Text>
          <Text style={styles.paymentEmail}>{eTransferEmail}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for your business! • {companyName}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
