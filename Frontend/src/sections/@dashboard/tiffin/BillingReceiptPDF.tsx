import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { fCurrency } from '../../../utils/formatNumber';
import styles from './BillingReceiptStyle';

// ----------------------------------------------------------------------

interface CalendarDay {
  delivery_date: string;
  status: 'delivered' | 'absent' | 'extra' | null;
  order_id: number;
  meal_plan_name: string;
  quantity: number;
  price: number | null;
}

interface BillingReceiptData {
  billing: {
    id: number;
    customer_name: string;
    customer_phone: string | null;
    customer_address: string;
    billing_month: string;
    total_delivered: number;
    total_absent: number;
    total_extra: number;
    total_amount: number;
    base_amount: number;
    extra_amount: number;
  };
  calendar: CalendarDay[];
  companySettings: {
    company_name: string;
    company_logo_url: string;
    company_email: string;
    company_phone: string;
    company_address: string;
    etransfer_email: string;
  };
}

// ----------------------------------------------------------------------

export default function BillingReceiptPDF({ data }: { data: BillingReceiptData }) {
  const { billing, calendar, companySettings } = data;

  // Generate invoice number
  const invoiceNumber = `MB-${String(billing.id).padStart(6, '0')}`;

  // Parse billing month
  const billingDate = new Date(billing.billing_month);
  const billingMonthYear = format(billingDate, 'MMMM yyyy');

  // Generate calendar grid
  const calendarGrid = generateCalendarGrid(billing.billing_month, calendar);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.companyInfo}>
              {companySettings.company_logo_url && (
                <Image
                  source={companySettings.company_logo_url}
                  style={styles.logo}
                />
              )}
              <Text style={styles.h2}>{companySettings.company_name}</Text>
              <Text style={styles.body2}>{companySettings.company_phone}</Text>
              <Text style={styles.body2}>{companySettings.company_email}</Text>
            </View>
            <View>
              <Text style={styles.invoiceLabel}>INVOICE</Text>
              <Text style={[styles.h4, styles.alignRight]}>{invoiceNumber}</Text>
            </View>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.customerSection}>
          <Text style={styles.overline}>BILL TO</Text>
          <Text style={styles.h4}>{billing.customer_name}</Text>
          {billing.customer_phone && (
            <Text style={styles.body2}>Phone: {billing.customer_phone}</Text>
          )}
          <Text style={styles.body2}>{billing.customer_address}</Text>
        </View>

        {/* Billing Period */}
        <View style={styles.billingPeriod}>
          <View>
            <Text style={styles.overline}>BILLING PERIOD</Text>
            <Text style={styles.h4}>{billingMonthYear}</Text>
          </View>
          <View>
            <Text style={[styles.overline, styles.alignRight]}>INVOICE DATE</Text>
            <Text style={[styles.body1, styles.alignRight]}>
              {format(new Date(), 'MMM dd, yyyy')}
            </Text>
          </View>
        </View>

        {/* Delivery Calendar */}
        <View style={styles.calendar}>
          <Text style={styles.calendarHeader}>Delivery Calendar</Text>

          {/* Week day headers */}
          <View style={styles.calendarWeekRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
              <Text
                key={day}
                style={[
                  styles.calendarWeekDay,
                  index === 6 && styles.calendarWeekDayLast,
                ]}
              >
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar dates */}
          {calendarGrid.map((week, weekIndex) => (
            <View
              key={weekIndex}
              style={[
                styles.calendarDateRow,
                weekIndex === calendarGrid.length - 1 && styles.calendarDateRowLast,
              ]}
            >
              {week.map((day, dayIndex) => (
                <View
                  key={dayIndex}
                  style={[
                    styles.calendarDateCell,
                    dayIndex === 6 && styles.calendarDateCellLast,
                  ]}
                >
                  {day.date && (
                    <>
                      <Text style={styles.calendarDate}>{day.date}</Text>
                      {day.status && (
                        <Text
                          style={[
                            styles.calendarStatus,
                            day.status === 'delivered' && styles.statusDelivered,
                            day.status === 'absent' && styles.statusAbsent,
                            day.status === 'extra' && styles.statusExtra,
                          ]}
                        >
                          {day.status === 'delivered'
                            ? 'Delivered'
                            : day.status === 'absent'
                            ? 'Absent'
                            : 'Extra'}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.statusDelivered]} />
            <Text style={styles.legendText}>Delivered</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.statusAbsent]} />
            <Text style={styles.legendText}>Absent</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.statusExtra]} />
            <Text style={styles.legendText}>Extra</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Delivered ({billing.total_delivered} days)
            </Text>
            <Text style={styles.summaryValue}>{fCurrency(billing.base_amount)}</Text>
          </View>
          {billing.total_absent > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Absent ({billing.total_absent} days)
              </Text>
              <Text style={styles.summaryValue}>
                -{fCurrency((billing.base_amount / billing.total_delivered) * billing.total_absent)}
              </Text>
            </View>
          )}
          {billing.total_extra > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Extra Deliveries ({billing.total_extra} days)
              </Text>
              <Text style={styles.summaryValue}>{fCurrency(billing.extra_amount)}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.summaryRowTotal]}>
            <Text style={styles.summaryLabelTotal}>Total Amount Due</Text>
            <Text style={styles.summaryValueTotal}>{fCurrency(billing.total_amount)}</Text>
          </View>
        </View>

        {/* Payment Information */}
        <View style={styles.paymentSection}>
          <Text style={styles.h4}>Payment Information</Text>
          <Text style={styles.body1}>E-Transfer: {companySettings.etransfer_email}</Text>
          <Text style={styles.caption}>
            Please include invoice number {invoiceNumber} in the transfer message
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.thankYou}>Thank you for your business!</Text>
          <Text style={styles.footerText}>{companySettings.company_name}</Text>
          <Text style={styles.footerText}>
            {companySettings.company_phone} | {companySettings.company_email}
          </Text>
          <Text style={styles.footerText}>{companySettings.company_address}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ----------------------------------------------------------------------

interface CalendarGridDay {
  date: number | null;
  status: 'delivered' | 'absent' | 'extra' | null;
}

function generateCalendarGrid(
  billingMonth: string,
  calendar: CalendarDay[]
): CalendarGridDay[][] {
  const date = new Date(billingMonth);
  const year = date.getFullYear();
  const month = date.getMonth();

  // Get first day of month and total days in month
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create calendar lookup
  const calendarLookup: Record<number, CalendarDay> = {};
  calendar.forEach((day) => {
    const dayDate = new Date(day.delivery_date);
    if (dayDate.getMonth() === month && dayDate.getFullYear() === year) {
      calendarLookup[dayDate.getDate()] = day;
    }
  });

  // Build calendar grid
  const grid: CalendarGridDay[][] = [];
  let week: CalendarGridDay[] = [];

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfMonth; i++) {
    week.push({ date: null, status: null });
  }

  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const calendarDay = calendarLookup[day];
    week.push({
      date: day,
      status: calendarDay?.status || null,
    });

    // Start new week after Saturday
    if (week.length === 7) {
      grid.push(week);
      week = [];
    }
  }

  // Fill last week with empty cells
  while (week.length > 0 && week.length < 7) {
    week.push({ date: null, status: null });
  }
  if (week.length > 0) {
    grid.push(week);
  }

  return grid;
}
