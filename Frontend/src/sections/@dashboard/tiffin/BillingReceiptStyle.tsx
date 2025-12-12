import { StyleSheet } from '@react-pdf/renderer';

/**
 * Professional PDF styles for billing receipts
 * Following A4 page format with proper margins and spacing
 */
export const styles = StyleSheet.create({
  // Page and container styles
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
  },

  // Header section
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },

  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
    alignSelf: 'center',
  },

  companyName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
    textTransform: 'uppercase',
  },

  invoiceTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
    color: '#1976d2',
  },

  invoiceDate: {
    fontSize: 9,
    color: '#666666',
  },

  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginVertical: 15,
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
    marginBottom: 20,
  },

  infoColumn: {
    width: '48%',
  },

  infoLabel: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 5,
    textTransform: 'uppercase',
  },

  infoValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },

  infoText: {
    fontSize: 9,
    color: '#333333',
    marginBottom: 2,
  },

  // Calendar section
  calendarSection: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
    color: '#333333',
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    border: '1px solid #e0e0e0',
  },

  calendarHeaderCell: {
    width: '14.28%', // 7 columns (100% / 7)
    padding: 5,
    backgroundColor: '#f5f5f5',
    borderRight: '1px solid #e0e0e0',
    borderBottom: '1px solid #e0e0e0',
    textAlign: 'center',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },

  calendarCell: {
    width: '14.28%', // 7 columns
    padding: 8,
    minHeight: 35,
    borderRight: '1px solid #e0e0e0',
    borderBottom: '1px solid #e0e0e0',
    textAlign: 'center',
    fontSize: 9,
  },

  calendarDayNumber: {
    marginBottom: 3,
  },

  calendarDayStatus: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },

  // Status colors for calendar cells
  deliveredCell: {
    backgroundColor: '#e8f5e9', // Light green
  },

  absentCell: {
    backgroundColor: '#ffebee', // Light red
  },

  extraCell: {
    backgroundColor: '#e3f2fd', // Light blue
  },

  deliveredText: {
    color: '#2e7d32', // Dark green
  },

  absentText: {
    color: '#c62828', // Dark red
  },

  extraText: {
    color: '#1565c0', // Dark blue
  },

  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 15,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },

  legendBox: {
    width: 12,
    height: 12,
    marginRight: 5,
    borderRadius: 2,
  },

  legendText: {
    fontSize: 8,
    color: '#666666',
  },

  // Summary section
  summarySection: {
    marginTop: 20,
    marginBottom: 20,
  },

  summaryTable: {
    width: '60%',
    marginLeft: 'auto',
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },

  summaryRowBorder: {
    borderBottom: '1px solid #e0e0e0',
  },

  summaryLabel: {
    fontSize: 10,
    color: '#333333',
  },

  summaryValue: {
    fontSize: 10,
    textAlign: 'right',
  },

  summaryLabelBold: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#333333',
  },

  summaryValueBold: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },

  // Total amount section
  totalSection: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    marginVertical: 20,
    textAlign: 'center',
    borderRadius: 4,
  },

  totalLabel: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 5,
    textTransform: 'uppercase',
  },

  totalAmount: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#1976d2',
  },

  // Payment information
  paymentSection: {
    marginTop: 20,
    marginBottom: 20,
  },

  paymentTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    color: '#333333',
  },

  paymentText: {
    fontSize: 10,
    color: '#333333',
    marginBottom: 3,
  },

  paymentEmail: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1976d2',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    paddingTop: 15,
    borderTop: '1px solid #e0e0e0',
  },

  footerText: {
    fontSize: 9,
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
