import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Tab,
  Tabs,
  Card,
  Container,
  Grid,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Divider,
  TextField,
  Stack,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import DashboardLayout from '../../../layouts/dashboard';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import Scrollbar from '../../../components/scrollbar';
import Iconify from '../../../components/iconify';
import { PATH_DASHBOARD } from '../../../routes/paths';
import { useSettingsContext } from '../../../components/settings';
import axios from '../../../utils/axios';
import { useSnackbar } from '../../../components/snackbar';
import { fCurrency } from '../../../utils/formatNumber';
import { fDate } from '../../../utils/formatTime';
import BillingReceiptPDF from '../../../sections/@dashboard/tiffin/BillingReceiptPDF';

// ----------------------------------------------------------------------

interface BillingDetails {
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
    finalized_at: Date | null;
    finalized_by: string | null;
    paid_at: Date | null;
    payment_method: string | null;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
  };
  orders: Array<{
    id: number;
    meal_plan_id: number;
    meal_plan_name: string;
    meal_plan_type: string;
    weekdays_only: boolean;
    start_date: string;
    end_date: string;
    price: number;
    payment_status: string;
    days?: string;
  }>;
  calendar: Array<{
    delivery_date: string;
    status: 'delivered' | 'absent' | 'extra' | null;
    order_id: number;
    meal_plan_name: string;
    quantity: number;
    price: number | null;
  }>;
  calculations: {
    month_first_day: string;
    month_last_day: string;
    total_weekdays: number;
    breakdown_by_order: Array<{
      order_id: number;
      meal_plan_name: string;
      meal_plan_type: string;
      weekdays_only: boolean;
      order_price: number;
      per_tiffin_price: number;
      applicable_days: number;
      delivered_count: number;
      absent_count: number;
      extra_count: number;
      delivered_amount: number;
      absent_deduction: number;
      extra_amount: number;
      order_total: number;
    }>;
  };
}

const TAB_OPTIONS = ['my-use', 'customer-preview'];

// ----------------------------------------------------------------------

BillingDetailsPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function BillingDetailsPage() {
  const router = useRouter();
  const theme = useTheme();
  const { themeStretch } = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const componentRef = useRef<HTMLDivElement>(null);

  const { id } = router.query;

  const [currentTab, setCurrentTab] = useState('my-use');
  const [billingDetails, setBillingDetails] = useState<BillingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [eTransferEmail, setETransferEmail] = useState('admin@tiffinservice.com');
  const [companyName, setCompanyName] = useState('TIFFIN MANAGEMENT SYSTEM');
  const [companyLogo, setCompanyLogo] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // Load billing details and settings
  useEffect(() => {
    if (id) {
      fetchBillingDetails();
      fetchSettings();
    }
  }, [id]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/settings');
      if (response.data.success) {
        setETransferEmail(response.data.data.etransfer_email);
        setCompanyName(response.data.data.company_name);
        const logoUrl = response.data.data.company_logo || '';
        setCompanyLogo(logoUrl);

        // Convert logo to data URL for PDF rendering
        if (logoUrl) {
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');
                setLogoDataUrl(dataUrl);
              }
            };
            img.src = logoUrl;
          } catch (error) {
            console.error('Error converting logo to data URL:', error);
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      // Keep default values if settings fetch fails
    }
  };

  const fetchBillingDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/monthly-billing/details/${id}`);
      if (response.data.success) {
        setBillingDetails(response.data.data);
      } else {
        enqueueSnackbar(response.data.error || 'Failed to load billing details', {
          variant: 'error',
        });
      }
    } catch (error: any) {
      console.error('Error fetching billing details:', error);
      enqueueSnackbar(error.message || 'Failed to load billing details', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setCurrentTab(newValue);
  };

  const handleApprove = async () => {
    try {
      const response = await axios.put(`/api/monthly-billing/${id}`, {
        status: 'finalized',
      });
      if (response.data.success) {
        enqueueSnackbar('Billing approved successfully', { variant: 'success' });
        fetchBillingDetails();
      }
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to approve billing', { variant: 'error' });
    }
  };

  const handleReject = async () => {
    try {
      const response = await axios.put(`/api/monthly-billing/${id}`, {
        status: 'calculating',
      });
      if (response.data.success) {
        enqueueSnackbar('Billing rejected and reset to calculating', { variant: 'success' });
        fetchBillingDetails();
      }
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to reject billing', { variant: 'error' });
    }
  };

  const handlePrint = () => {
    // Open PDF in new window for printing
    if (billingDetails) {
      setShowPdfPreview(true);
      // Note: User can use the PDF viewer's print button
    }
  };

  if (loading) {
    return (
      <Container maxWidth={themeStretch ? false : 'xl'}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (!billingDetails) {
    return (
      <Container maxWidth={themeStretch ? false : 'xl'}>
        <Typography>Billing details not found</Typography>
      </Container>
    );
  }

  const { billing, orders, calendar, calculations } = billingDetails;

  // Generate calendar grid
  const [year, month] = billing.billing_month.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const calendarGrid: { [day: number]: 'delivered' | 'absent' | 'extra' | null } = {};

  calendar.forEach((entry) => {
    const day = parseInt(entry.delivery_date.split('-')[2], 10);
    calendarGrid[day] = entry.status;
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'calculating':
        return 'warning';
      case 'pending':
        return 'info';
      case 'finalized':
        return 'success';
      case 'paid':
        return 'success';
      default:
        return 'default';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'calculating':
        return '🕐 Calculating';
      case 'pending':
        return '🕐 Pending Approval';
      case 'finalized':
        return '✓ Finalized';
      case 'paid':
        return '✓ Paid';
      default:
        return status;
    }
  };

  return (
    <>
      <Head>
        <title>Billing Details | Tiffin Management</title>
        <style>{`
          @media print {
            /* Hide header, breadcrumbs, tabs, and buttons */
            .no-print,
            header,
            .MuiTabs-root,
            .MuiTab-root {
              display: none !important;
            }

            /* Show only customer preview */
            body {
              background: white !important;
              margin: 0;
              padding: 0;
            }

            #customer-preview-content {
              position: relative !important;
              width: 100% !important;
              background: white !important;
              color: black !important;
              padding: 15mm !important;
              margin: 0 !important;
            }

            /* Page setup for A4/Letter */
            @page {
              size: A4;
              margin: 10mm;
            }

            /* Keep calendar cell colors visible */
            .print-calendar-cell {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }

            /* Dividers should be visible */
            hr, .MuiDivider-root {
              border-color: #e0e0e0 !important;
              opacity: 1 !important;
            }

            /* Remove shadows and unnecessary styling */
            .MuiCard-root,
            .MuiPaper-root {
              box-shadow: none !important;
              border: none !important;
            }
          }
        `}</style>
      </Head>

      <Container
        maxWidth={themeStretch ? false : 'xl'}
        sx={{ '@media print': { maxWidth: '100% !important', padding: '0 !important' } }}
      >
        <CustomBreadcrumbs
          className="no-print"
          heading="Billing Invoice Details"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Billing', href: PATH_DASHBOARD.tiffin.billingCalendar },
            { name: billing.customer_name },
          ]}
          action={
            <Stack direction="row" spacing={2} className="no-print">
              <Button
                variant="outlined"
                startIcon={<Iconify icon="eva:eye-outline" />}
                onClick={() => setShowPdfPreview(true)}
              >
                Preview PDF
              </Button>
              <PDFDownloadLink
                document={
                  <BillingReceiptPDF
                    billingData={billingDetails}
                    companyName={companyName}
                    eTransferEmail={eTransferEmail}
                    companyLogo={logoDataUrl}
                  />
                }
                fileName={`Invoice-${billing.customer_name.replace(/\s+/g, '-')}-${billing.billing_month}.pdf`}
                style={{ textDecoration: 'none' }}
              >
                {({ loading: pdfLoading }) => (
                  <Button
                    variant="contained"
                    startIcon={<Iconify icon="eva:download-outline" />}
                    disabled={pdfLoading}
                  >
                    {pdfLoading ? 'Preparing...' : 'Download PDF'}
                  </Button>
                )}
              </PDFDownloadLink>
              {billing.status === 'pending' && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<Iconify icon="eva:checkmark-circle-2-outline" />}
                    onClick={handleApprove}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<Iconify icon="eva:close-circle-outline" />}
                    onClick={handleReject}
                  >
                    Reject
                  </Button>
                </>
              )}
            </Stack>
          }
        />

        <Card sx={{ '@media print': { boxShadow: 'none', border: 'none' } }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            className="no-print"
            sx={{
              px: 2,
              bgcolor: 'background.neutral',
            }}
          >
            {TAB_OPTIONS.map((tab) => (
              <Tab
                key={tab}
                label={tab === 'my-use' ? 'My Use' : 'Customer Preview'}
                value={tab}
              />
            ))}
          </Tabs>

          <Divider className="no-print" />

          {/* Tab Content */}
          <Box sx={{ p: 3, '@media print': { p: 0 } }} ref={componentRef}>
            {currentTab === 'my-use' ? (
              <MyUseTab
                billing={billing}
                orders={orders}
                calendar={calendar}
                calculations={calculations}
                calendarGrid={calendarGrid}
                daysInMonth={daysInMonth}
                statusColor={statusColor}
                statusLabel={statusLabel}
                eTransferEmail={eTransferEmail}
                setETransferEmail={setETransferEmail}
              />
            ) : (
              <CustomerPreviewTab
                billing={billing}
                orders={orders}
                calendarGrid={calendarGrid}
                daysInMonth={daysInMonth}
                companyName={companyName}
                eTransferEmail={eTransferEmail}
              />
            )}
          </Box>
        </Card>

        {/* PDF Preview Dialog */}
        <Dialog
          open={showPdfPreview}
          onClose={() => setShowPdfPreview(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            PDF Preview
            <IconButton
              onClick={() => setShowPdfPreview(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <Iconify icon="eva:close-outline" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ height: '80vh', p: 0 }}>
            <PDFViewer width="100%" height="100%" showToolbar>
              <BillingReceiptPDF
                billingData={billingDetails}
                companyName={companyName}
                eTransferEmail={eTransferEmail}
                companyLogo={logoDataUrl}
              />
            </PDFViewer>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPdfPreview(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}

// ----------------------------------------------------------------------

interface TabProps {
  billing: BillingDetails['billing'];
  orders: BillingDetails['orders'];
  calendar?: BillingDetails['calendar'];
  calculations?: BillingDetails['calculations'];
  calendarGrid: { [day: number]: 'delivered' | 'absent' | 'extra' | null };
  daysInMonth: number;
  statusColor?: (status: string) => any;
  statusLabel?: (status: string) => string;
  eTransferEmail?: string;
  setETransferEmail?: (email: string) => void;
  companyName?: string;
}

function MyUseTab({
  billing,
  orders,
  calendar,
  calculations,
  calendarGrid,
  daysInMonth,
  statusColor,
  statusLabel,
  eTransferEmail,
  setETransferEmail,
}: TabProps) {
  const theme = useTheme();

  return (
    <Stack spacing={3}>
      {/* Row 1: Bill To/Period + Total Amount */}
      <Grid container spacing={3}>
        {/* Left: Bill To and Billing Period */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 2, height: '100%', bgcolor: 'background.neutral' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Bill To
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {billing.customer_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {billing.customer_phone || 'No phone'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {billing.customer_address}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 2, height: '100%', bgcolor: 'background.neutral' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Billing Period
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {billing.billing_month}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {calculations?.month_first_day} to {calculations?.month_last_day}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip
                    label={statusLabel?.(billing.status) || billing.status}
                    color={statusColor?.(billing.status)}
                    size="small"
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Grid>

        {/* Right: Total Amount Due */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              TOTAL AMOUNT DUE
            </Typography>
            <Typography variant="h3" color="primary.main" fontWeight="bold">
              {fCurrency(billing.total_amount)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Row 2: Calendar + Calculation Breakdown */}
      <Grid container spacing={3}>
        {/* Left: Calendar */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Delivery Calendar
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 0.5,
                maxHeight: 400,
                overflow: 'auto',
              }}
            >
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Box
                  key={day}
                  sx={{
                    p: 1,
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
                  }}
                >
                  {day}
                </Box>
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const status = calendarGrid[day];

                // Handle both database values ('T', 'A', 'E') and full names
                const isDelivered = status === 'T' || status === 'delivered';
                const isAbsent = status === 'A' || status === 'absent';
                const isExtra = status === 'E' || status === 'extra';

                let bgColor = 'transparent';
                let borderColor = theme.palette.mode === 'dark' ? '#555' : '#e0e0e0';
                let textColor = theme.palette.text.primary;

                if (isDelivered) {
                  // Green for delivered
                  bgColor = alpha(theme.palette.success.main, 0.2);
                  borderColor = alpha(theme.palette.success.main, 0.4);
                  textColor = theme.palette.success.main;
                } else if (isAbsent) {
                  // Red for absent
                  bgColor = alpha(theme.palette.error.main, 0.2);
                  borderColor = alpha(theme.palette.error.main, 0.4);
                  textColor = theme.palette.error.main;
                } else if (isExtra) {
                  // Blue for extra
                  bgColor = alpha(theme.palette.info.main, 0.2);
                  borderColor = alpha(theme.palette.info.main, 0.4);
                  textColor = theme.palette.info.main;
                }

                const statusText = isDelivered ? 'T' : isAbsent ? 'A' : isExtra ? 'E' : '';

                return (
                  <Box
                    key={day}
                    sx={{
                      p: 1,
                      textAlign: 'center',
                      bgcolor: bgColor,
                      border: `1px solid ${borderColor}`,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                    }}
                  >
                    <div>{day}</div>
                    {statusText && (
                      <div style={{ fontWeight: 'bold', color: textColor }}>{statusText}</div>
                    )}
                  </Box>
                );
              })}
            </Box>
            <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={`${billing.total_delivered} Delivered`}
                sx={{ bgcolor: alpha(theme.palette.success.main, 0.2) }}
              />
              <Chip
                size="small"
                label={`${billing.total_absent} Absent`}
                sx={{ bgcolor: alpha(theme.palette.error.main, 0.2) }}
              />
              <Chip
                size="small"
                label={`${billing.total_extra} Extra`}
                sx={{ bgcolor: alpha(theme.palette.info.main, 0.2) }}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Right: Billing Calculation Breakdown */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, maxHeight: 530, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Billing Calculation Breakdown
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={3}>
              {calculations?.breakdown_by_order.map((breakdown, index) => {
                const totalDays = breakdown.weekdays_only ? calculations.total_weekdays : daysInMonth;
                const dayType = breakdown.weekdays_only ? 'Mon-Fri' : 'All';

                // Get month name from billing_month (YYYY-MM format)
                const [year, monthNum] = billing.billing_month.split('-');
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
                const monthName = monthNames[parseInt(monthNum) - 1];

                return (
                  <Box key={breakdown.order_id}>
                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                      Base Order: {breakdown.meal_plan_name} ({dayType})
                    </Typography>
                    <Stack spacing={0.3} sx={{ pl: 0, fontSize: '0.875rem' }}>
                      <Typography variant="body2">
                        ├─ Order Price: {fCurrency(breakdown.order_price)}
                      </Typography>
                      <Typography variant="body2">
                        ├─ Total {dayType} days in {monthName}: {totalDays} days
                      </Typography>
                      <Typography variant="body2">
                        ├─ Per-Tiffin Price: {fCurrency(breakdown.order_price)} ÷ {totalDays} = {fCurrency(breakdown.per_tiffin_price)}/tiffin
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1.5 }}>
                        └─ Order covers: {breakdown.applicable_days} applicable days
                      </Typography>

                      <Typography variant="body2" fontWeight="bold">
                        Delivered Tiffins:
                      </Typography>
                      <Typography variant="body2">
                        ├─ Count: {breakdown.delivered_count} tiffins delivered
                      </Typography>
                      <Typography variant="body2">
                        ├─ Calculation: {breakdown.delivered_count} × {fCurrency(breakdown.per_tiffin_price)} = {fCurrency(breakdown.delivered_amount)}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1.5 }}>
                        └─ Subtotal: {fCurrency(breakdown.delivered_amount)}
                      </Typography>

                      {breakdown.absent_count > 0 && (
                        <>
                          <Typography variant="body2" fontWeight="bold">
                            Absent Days (Not Charged):
                          </Typography>
                          <Typography variant="body2">
                            ├─ Count: {breakdown.absent_count} day{breakdown.absent_count > 1 ? 's' : ''} absent
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1.5 }}>
                            └─ Note: No charge for absent days
                          </Typography>
                        </>
                      )}

                      {breakdown.extra_count > 0 && (
                        <>
                          <Typography variant="body2" fontWeight="bold">
                            Extra Tiffins:
                          </Typography>
                          <Typography variant="body2">
                            ├─ Count: {breakdown.extra_count} extra tiffin{breakdown.extra_count > 1 ? 's' : ''}
                          </Typography>
                          <Typography variant="body2">
                            ├─ Price: {fCurrency(breakdown.extra_amount / breakdown.extra_count)}/tiffin
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1.5 }}>
                            └─ Addition: +{fCurrency(breakdown.extra_amount)}
                          </Typography>
                        </>
                      )}

                      <Typography variant="body2" fontWeight="bold" sx={{ mt: 1 }}>
                        Order Total: {fCurrency(breakdown.order_total)}
                      </Typography>
                    </Stack>

                    {index < (calculations?.breakdown_by_order.length || 0) - 1 && (
                      <Divider sx={{ my: 3 }} />
                    )}
                  </Box>
                );
              })}

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" fontWeight="bold" align="center">
                TOTAL AMOUNT DUE: {fCurrency(billing.total_amount)}
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Row 3: Order Details Table */}
      <Paper>
        <Typography variant="h6" sx={{ p: 2 }}>
          Order Details
        </Typography>
        <Divider />
        <TableContainer sx={{ maxHeight: 300 }}>
          <Scrollbar>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Meal Plan</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell align="right">Days</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => {
                  const breakdown = calculations?.breakdown_by_order.find(
                    (b) => b.order_id === order.id
                  );
                  return (
                    <TableRow key={order.id}>
                      <TableCell>{order.meal_plan_name}</TableCell>
                      <TableCell>
                        <Chip label={order.days || order.meal_plan_type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        {fDate(order.start_date)} - {fDate(order.end_date)}
                      </TableCell>
                      <TableCell align="right">{breakdown?.applicable_days || 0}</TableCell>
                      <TableCell align="right">{fCurrency(order.price)}</TableCell>
                      <TableCell>
                        <Chip
                          label={order.payment_status}
                          size="small"
                          color={
                            order.payment_status === 'paid'
                              ? 'success'
                              : order.payment_status === 'pending'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Scrollbar>
        </TableContainer>
      </Paper>

      {/* Row 4: Payment Information */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Payment Information
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Payment Methods
            </Typography>
            <Stack spacing={1} sx={{ pl: 2 }}>
              <Typography variant="body2">• E-Transfer:</Typography>
              <TextField
                size="small"
                value={eTransferEmail}
                onChange={(e) => setETransferEmail?.(e.target.value)}
                fullWidth
                placeholder="Enter E-Transfer email"
              />
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Payment Status
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                Status:{' '}
                <Chip
                  label={billing.status}
                  color={statusColor?.(billing.status)}
                  size="small"
                />
              </Typography>
              {billing.paid_at && (
                <Typography variant="body2">
                  Paid At: {fDate(billing.paid_at)}
                </Typography>
              )}
              {billing.payment_method && (
                <Typography variant="body2">
                  Method: {billing.payment_method}
                </Typography>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Stack>
  );
}

// ----------------------------------------------------------------------

function CustomerPreviewTab({
  billing,
  orders,
  calendarGrid,
  daysInMonth,
  companyName,
  eTransferEmail,
}: TabProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      id="customer-preview-content"
      sx={{
        bgcolor: isDark ? '#1a1a1a' : '#f5f5f5',
        color: isDark ? '#fff' : '#000',
        p: 4,
        minHeight: '100vh',
        '@media print': {
          bgcolor: 'white !important',
          color: 'black !important',
          p: 0,
        },
      }}
    >
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          {companyName}
        </Typography>
        <Typography variant="h6" color="text.secondary">
          INVOICE
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Invoice Date: {fDate(new Date())}
        </Typography>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* Customer Info + Billing Period */}
      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Customer
          </Typography>
          <Typography variant="h6" fontWeight="bold">
            {billing.customer_name}
          </Typography>
          <Typography variant="body2">{billing.customer_phone || 'No phone'}</Typography>
          <Typography variant="body2">{billing.customer_address}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Billing Period
          </Typography>
          <Typography variant="h6" fontWeight="bold">
            {billing.billing_month}
          </Typography>
        </Grid>
      </Grid>

      {/* Dense Calendar */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Delivery Calendar
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 0.25,
            maxWidth: 500,
            margin: '0 auto',
          }}
        >
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <Box
              key={i}
              sx={{
                p: 0.5,
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '0.65rem',
                bgcolor: isDark ? '#333' : '#e0e0e0',
              }}
            >
              {day}
            </Box>
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const status = calendarGrid[day];

            // Handle both database values ('T', 'A', 'E') and full names
            const isDelivered = status === 'T' || status === 'delivered';
            const isAbsent = status === 'A' || status === 'absent';
            const isExtra = status === 'E' || status === 'extra';

            // Use color-coded backgrounds matching the "My Use" tab
            let bgColor = 'transparent';
            let borderColor = isDark ? '#555' : '#e0e0e0';
            let textColor = isDark ? '#fff' : '#000';

            if (isDelivered) {
              bgColor = isDark ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.15)'; // Green
              borderColor = isDark ? 'rgba(76, 175, 80, 0.4)' : 'rgba(76, 175, 80, 0.3)';
              textColor = '#4caf50'; // Green text
            } else if (isAbsent) {
              bgColor = isDark ? 'rgba(244, 67, 54, 0.2)' : 'rgba(244, 67, 54, 0.15)'; // Red
              borderColor = isDark ? 'rgba(244, 67, 54, 0.4)' : 'rgba(244, 67, 54, 0.3)';
              textColor = '#f44336'; // Red text
            } else if (isExtra) {
              bgColor = isDark ? 'rgba(33, 150, 243, 0.2)' : 'rgba(33, 150, 243, 0.15)'; // Blue
              borderColor = isDark ? 'rgba(33, 150, 243, 0.4)' : 'rgba(33, 150, 243, 0.3)';
              textColor = '#2196f3'; // Blue text
            }

            const statusText = isDelivered ? 'T' : isAbsent ? 'A' : isExtra ? 'E' : '';

            return (
              <Box
                key={day}
                className="print-calendar-cell"
                sx={{
                  p: 0.5,
                  textAlign: 'center',
                  bgcolor: bgColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 0.5,
                  fontSize: '0.75rem',
                  fontWeight: status ? 'bold' : 'normal',
                  minHeight: '40px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <div>{day}</div>
                {statusText && (
                  <div style={{ fontSize: '0.65rem', marginTop: 1, fontWeight: 'bold', color: textColor }}>
                    {statusText}
                  </div>
                )}
              </Box>
            );
          })}
        </Box>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2">
            Delivered: {billing.total_delivered} | Absent: {billing.total_absent} | Extra:{' '}
            {billing.total_extra}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* Total Amount */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          TOTAL AMOUNT DUE
        </Typography>
        <Typography variant="h2" fontWeight="bold">
          {fCurrency(billing.total_amount)}
        </Typography>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* Payment Methods */}
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Payment Method
        </Typography>
        <Typography variant="body2">E-Transfer: {eTransferEmail || 'admin@tiffinservice.com'}</Typography>
      </Box>

      <Box sx={{ mt: 6, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Thank you for your business!
        </Typography>
      </Box>
    </Box>
  );
}
