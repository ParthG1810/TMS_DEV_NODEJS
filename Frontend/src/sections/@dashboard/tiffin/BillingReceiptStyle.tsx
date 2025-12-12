import { StyleSheet } from '@react-pdf/renderer';

/**
 * Professional PDF styles for billing receipts
 * Following A4 page format with proper margins and spacing
 */
export const styles = StyleSheet.create({
  // Page and container styles
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 20,
    paddingBottom: 25,
    paddingHorizontal: 30,
    backgroundColor: '#FFFFFF',
  },

  // Header section
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

  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginVertical: 8,
  },

  dividerThick: {
    borderBottomWidth: 2,
    borderBottomColor: '#333333',
    marginVertical: 15,
  },

  // Customer info section
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

  // Calendar section
  calendarSection: {
    marginBottom: 10,
    alignItems: 'center', // Center the calendar
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
    width: 280, // Fixed width to match My Use tab compact size (7 cells * ~40px each)
    alignSelf: 'center',
  },

  calendarHeaderCell: {
    width: '13%', // Compact size to fit within 280px width
    margin: '1.5px', // Tight spacing like My Use tab
    padding: 3,
    backgroundColor: 'transparent',
    textAlign: 'center',
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
  },

  calendarCell: {
    width: '13%', // Compact size to fit within 280px width
    margin: '1.5px', // Tight spacing like My Use tab
    padding: 4, // Compact padding
    minHeight: 20,
    borderRadius: 3, // Subtle rounded corners
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

  // Status colors for calendar cells - matching My Use tab exactly (no borders)
  deliveredCell: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)', // alpha(theme.palette.success.main, 0.2)
  },

  absentCell: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)', // alpha(theme.palette.error.main, 0.2)
  },

  extraCell: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)', // alpha(theme.palette.info.main, 0.2)
  },

  deliveredText: {
    color: '#4caf50', // theme.palette.success.main
  },

  absentText: {
    color: '#f44336', // theme.palette.error.main
  },

  extraText: {
    color: '#2196f3', // theme.palette.info.main
  },

  // Legend
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

  // Summary section
  summarySection: {
    marginTop: 10,
    marginBottom: 10,
  },

  summaryTable: {
    width: '60%',
    marginLeft: 'auto',
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    paddingHorizontal: 8,
  },

  summaryRowBorder: {
    borderBottom: '1px solid #e0e0e0',
  },

  summaryLabel: {
    fontSize: 8,
    color: '#333333',
  },

  summaryValue: {
    fontSize: 8,
    textAlign: 'right',
  },

  summaryLabelBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#333333',
  },

  summaryValueBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },

  // Total amount section
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

  // Payment information
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

  // Footer
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

  // Utility styles
  textCenter: {
    textAlign: 'center',
  },

  textBold: {
    fontFamily: 'Helvetica-Bold',
  },

  marginBottom10: {
    marginBottom: 10,
  },

  marginBottom15: {
    marginBottom: 15,
  },

  colorPrimary: {
    color: '#1976d2',
  },

  colorSuccess: {
    color: '#2e7d32',
  },

  colorError: {
    color: '#c62828',
  },

  colorInfo: {
    color: '#1565c0',
  },
});
