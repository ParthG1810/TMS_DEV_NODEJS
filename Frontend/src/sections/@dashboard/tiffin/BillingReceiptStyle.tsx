import { Font, StyleSheet } from '@react-pdf/renderer';

// ----------------------------------------------------------------------

Font.register({
  family: 'Roboto',
  fonts: [{ src: '/fonts/Roboto-Regular.ttf' }, { src: '/fonts/Roboto-Bold.ttf' }],
});

const styles = StyleSheet.create({
  // Layout
  page: {
    padding: '40px 24px',
    fontSize: 9,
    lineHeight: 1.6,
    fontFamily: 'Roboto',
    backgroundColor: '#fff',
  },

  // Typography
  h2: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
  },
  h3: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 8,
  },
  h4: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
  },
  body1: {
    fontSize: 10,
    marginBottom: 4,
  },
  body2: {
    fontSize: 9,
    marginBottom: 4,
  },
  caption: {
    fontSize: 8,
    color: '#637381',
  },
  overline: {
    fontSize: 8,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#637381',
    marginBottom: 4,
  },

  // Spacing
  mb4: { marginBottom: 4 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },
  mb24: { marginBottom: 24 },
  mt8: { marginTop: 8 },
  mt16: { marginTop: 16 },

  // Alignment
  alignRight: { textAlign: 'right' },
  alignCenter: { textAlign: 'center' },

  // Grid
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  col6: { width: '48%' },
  col12: { width: '100%' },

  // Header
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#1976d2',
    borderBottomStyle: 'solid',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: 'contain',
  },
  companyInfo: {
    flexDirection: 'column',
  },
  invoiceLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#637381',
    textAlign: 'right',
  },

  // Customer Info
  customerSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },

  // Billing Period
  billingPeriod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
  },

  // Calendar
  calendar: {
    marginBottom: 20,
    border: '1px solid #DFE3E8',
    borderRadius: 4,
  },
  calendarHeader: {
    backgroundColor: '#1976d2',
    color: '#fff',
    padding: 8,
    fontSize: 11,
    fontWeight: 700,
    textAlign: 'center',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    backgroundColor: '#f4f6f8',
    borderBottomWidth: 1,
    borderBottomColor: '#DFE3E8',
    borderBottomStyle: 'solid',
  },
  calendarWeekDay: {
    width: '14.28%', // 100% / 7 days
    padding: 6,
    fontSize: 9,
    fontWeight: 700,
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#DFE3E8',
    borderRightStyle: 'solid',
  },
  calendarWeekDayLast: {
    borderRightWidth: 0,
  },
  calendarDateRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#DFE3E8',
    borderBottomStyle: 'solid',
  },
  calendarDateRowLast: {
    borderBottomWidth: 0,
  },
  calendarDateCell: {
    width: '14.28%',
    minHeight: 35,
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: '#DFE3E8',
    borderRightStyle: 'solid',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  calendarDateCellLast: {
    borderRightWidth: 0,
  },
  calendarDate: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 2,
  },
  calendarStatus: {
    fontSize: 7,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
    textAlign: 'center',
  },

  // Status Colors
  statusDelivered: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  statusAbsent: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  statusExtra: {
    backgroundColor: '#d1ecf1',
    color: '#0c5460',
  },
  statusEmpty: {
    backgroundColor: '#f4f6f8',
    color: '#919EAB',
  },

  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  legendBox: {
    width: 12,
    height: 12,
    marginRight: 4,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 8,
  },

  // Summary
  summary: {
    marginTop: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#DFE3E8',
    borderBottomStyle: 'solid',
  },
  summaryRowTotal: {
    paddingVertical: 10,
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: '#1976d2',
    borderTopStyle: 'solid',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 10,
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: 700,
  },
  summaryLabelTotal: {
    fontSize: 12,
    fontWeight: 700,
  },
  summaryValueTotal: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1976d2',
  },

  // Payment Info
  paymentSection: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2',
    borderLeftStyle: 'solid',
  },

  // Footer
  footer: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#DFE3E8',
    borderTopStyle: 'solid',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 10,
    color: '#637381',
    marginBottom: 4,
  },
  thankYou: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1976d2',
    marginBottom: 8,
  },
});

export default styles;
