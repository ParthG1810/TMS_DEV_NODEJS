import { useState, useEffect } from 'react';
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
  Button,
  Divider,
  Stack,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import DashboardLayout from '../../../layouts/dashboard';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import Iconify from '../../../components/iconify';
import { PATH_DASHBOARD } from '../../../routes/paths';
import { useSettingsContext } from '../../../components/settings';
import axios from '../../../utils/axios';
import { useSnackbar } from '../../../components/snackbar';
import OrderInvoicePDF from '../../../sections/@dashboard/tiffin/OrderInvoicePDF';

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

const TAB_OPTIONS = ['invoice-view', 'pdf-export'];

// ----------------------------------------------------------------------

OrderInvoiceDetailsPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function OrderInvoiceDetailsPage() {
  const router = useRouter();
  const theme = useTheme();
  const { themeStretch } = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const { orderId, month } = router.query;

  const [currentTab, setCurrentTab] = useState('invoice-view');
  const [invoice, setInvoice] = useState<OrderInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [eTransferEmail, setETransferEmail] = useState('admin@tiffinservice.com');
  const [companyName, setCompanyName] = useState('TIFFIN MANAGEMENT SYSTEM');
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // Load invoice details and settings
  useEffect(() => {
    if (orderId && month) {
      fetchInvoiceDetails();
      fetchSettings();
    }
  }, [orderId, month]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/settings');
      if (response.data.success) {
        setETransferEmail(response.data.data.etransfer_email);
        setCompanyName(response.data.data.company_name);

        // Fetch logo as base64
        const logoUrl = response.data.data.company_logo || '';
        if (logoUrl) {
          try {
            const logoResponse = await axios.get('/api/settings/logo');
            if (logoResponse.data.success) {
              setLogoDataUrl(logoResponse.data.data.dataUrl);
            }
          } catch (error) {
            console.error('Error fetching logo:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/order-billing/order-invoice', {
        params: {
          order_id: orderId,
          billing_month: month,
        },
      });

      if (response.data.success) {
        setInvoice(response.data.data);
      } else {
        enqueueSnackbar(response.data.error || 'Failed to load invoice', { variant: 'error' });
      }
    } catch (error: any) {
      console.error('Error fetching order invoice:', error);
      enqueueSnackbar(error.response?.data?.error || 'Failed to load invoice', {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setCurrentTab(newValue);
  };

  const formatCurrency = (amount: number) => {
    return `CAD $${amount.toFixed(2)}`;
  };

  const getMonthDisplay = () => {
    if (!month || typeof month !== 'string') return '';
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    if (!invoice || !month || typeof month !== 'string') return [];

    const [year, monthNum] = month.split('-').map(Number);
    const firstDay = new Date(year, monthNum - 1, 1);
    const lastDay = new Date(year, monthNum, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const entryMap = new Map<string, CalendarEntry>();
    invoice.calendar_entries.forEach((entry) => {
      const date = new Date(entry.delivery_date);
      const day = date.getDate();
      entryMap.set(day.toString(), entry);
    });

    const selectedDaysMap = new Map<number, boolean>();
    const dayNameToNumber: { [key: string]: number } = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    invoice.selected_days.forEach((dayName) => {
      const dayNum = dayNameToNumber[dayName];
      if (dayNum !== undefined) {
        selectedDaysMap.set(dayNum, true);
      }
    });

    const days = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, entry: null, isPlanDay: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, monthNum - 1, day);
      const dayOfWeek = currentDate.getDay();
      const isPlanDay = selectedDaysMap.has(dayOfWeek);
      const entry = entryMap.get(day.toString());

      days.push({
        day,
        entry: entry || null,
        isPlanDay,
      });
    }

    return days;
  };

  const perTiffinPrice =
    invoice && invoice.billing.total_plan_days > 0
      ? invoice.meal_plan_price / invoice.billing.total_plan_days
      : 0;

  if (loading) {
    return (
      <Container maxWidth={themeStretch ? false : 'xl'}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!invoice) {
    return (
      <Container maxWidth={themeStretch ? false : 'xl'}>
        <Typography>Invoice not found</Typography>
        <Button onClick={() => router.back()}>Go Back</Button>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>Order Invoice - {invoice.customer_name} | TMS</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'xl'}>
        <CustomBreadcrumbs
          heading="Order Invoice"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Billing', href: PATH_DASHBOARD.tiffin.billingCalendar },
            { name: `Invoice #${invoice.order_id}` },
          ]}
          action={
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<Iconify icon="eva:arrow-back-fill" />}
                onClick={() => router.back()}
              >
                Back
              </Button>
              {currentTab === 'invoice-view' && invoice && (
                <PDFDownloadLink
                  document={
                    <OrderInvoicePDF
                      invoiceData={invoice}
                      companyName={companyName}
                      eTransferEmail={eTransferEmail}
                      companyLogo={logoDataUrl}
                    />
                  }
                  fileName={`order-invoice-${invoice.order_id}-${month}.pdf`}
                  style={{ textDecoration: 'none' }}
                >
                  {({ loading: pdfLoading }) => (
                    <Button
                      variant="contained"
                      startIcon={<Iconify icon="eva:download-fill" />}
                      disabled={pdfLoading}
                    >
                      {pdfLoading ? 'Generating PDF...' : 'Download PDF'}
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
            </Stack>
          }
        />

        <Card>
          <Tabs value={currentTab} onChange={handleTabChange} sx={{ px: 3, bgcolor: 'background.neutral' }}>
            <Tab label="Invoice View" value="invoice-view" />
            <Tab label="PDF Export" value="pdf-export" />
          </Tabs>

          <Divider />

          {/* Invoice View Tab */}
          {currentTab === 'invoice-view' && (
            <Box sx={{ p: 3 }}>
              {/* Invoice Header */}
              <Stack spacing={3}>
                {/* Title and Status */}
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" gutterBottom>
                      Order Invoice
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {invoice.customer_name} - {invoice.meal_plan_name} - {getMonthDisplay()}
                    </Typography>
                  </Box>
                  <Chip
                    label={invoice.billing.status === 'finalized' ? 'Finalized' : 'Calculating'}
                    color={invoice.billing.status === 'finalized' ? 'success' : 'warning'}
                  />
                </Stack>

                {/* Customer & Order Info */}
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                      <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                        Customer Details
                      </Typography>
                      <Stack spacing={1}>
                        <Typography variant="body1">{invoice.customer_name}</Typography>
                        {invoice.customer_phone && (
                          <Typography variant="body2" color="text.secondary">
                            {invoice.customer_phone}
                          </Typography>
                        )}
                        {invoice.customer_address && (
                          <Typography variant="body2" color="text.secondary">
                            {invoice.customer_address}
                          </Typography>
                        )}
                      </Stack>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                      <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                        Order Details
                      </Typography>
                      <Stack spacing={1}>
                        <Typography variant="body1">{invoice.meal_plan_name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Price: {formatCurrency(invoice.meal_plan_price)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Period: {getMonthDisplay()}
                        </Typography>
                        {invoice.selected_days.length > 0 && (
                          <Typography variant="body2" color="text.secondary">
                            Days: {invoice.selected_days.join(', ')}
                          </Typography>
                        )}
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Billing Summary */}
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                    Billing Summary
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6} sm={3}>
                      <Stack alignItems="center">
                        <Typography variant="h4" color="text.secondary">
                          {invoice.billing.total_plan_days}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Plan Days
                        </Typography>
                      </Stack>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Stack alignItems="center">
                        <Typography variant="h4" color="success.main">
                          {invoice.billing.total_delivered}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Delivered
                        </Typography>
                      </Stack>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Stack alignItems="center">
                        <Typography variant="h4" color="error.main">
                          {invoice.billing.total_absent}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Absent
                        </Typography>
                      </Stack>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Stack alignItems="center">
                        <Typography variant="h4" color="info.main">
                          {invoice.billing.total_extra}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Extra
                        </Typography>
                      </Stack>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 3 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Stack alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          Base Amount
                        </Typography>
                        <Typography variant="h6">{formatCurrency(invoice.billing.base_amount)}</Typography>
                      </Stack>
                    </Grid>
                    <Grid item xs={4}>
                      <Stack alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          Extra Amount
                        </Typography>
                        <Typography variant="h6" color="info.main">
                          +{formatCurrency(invoice.billing.extra_amount)}
                        </Typography>
                      </Stack>
                    </Grid>
                    <Grid item xs={4}>
                      <Stack alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          Total Amount
                        </Typography>
                        <Typography variant="h5" color="primary.main" fontWeight={700}>
                          {formatCurrency(invoice.billing.total_amount)}
                        </Typography>
                      </Stack>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Calendar & Calculation Breakdown */}
                <Grid container spacing={3}>
                  {/* Left Half: Calendar View */}
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                      <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                        Delivery Calendar
                      </Typography>

                      {/* Day headers */}
                      <Grid container spacing={0.2} sx={{ mb: 0.5, maxWidth: 350, mx: 'auto' }}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                          <Grid item xs key={day}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              fontWeight={600}
                              textAlign="center"
                              display="block"
                              sx={{ fontSize: 10 }}
                            >
                              {day}
                            </Typography>
                          </Grid>
                        ))}
                      </Grid>

                      {/* Calendar days */}
                      <Grid container spacing={0.2} sx={{ maxWidth: 350, mx: 'auto' }}>
                        {generateCalendarDays().map((item, index) => (
                          <Grid item xs key={index}>
                            <Box
                              sx={{
                                width: '100%',
                                aspectRatio: '1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 0.5,
                                position: 'relative',
                                minHeight: 28,
                                backgroundColor: item.entry
                                  ? item.entry.status === 'T'
                                    ? 'rgba(76, 175, 80, 0.2)'
                                    : item.entry.status === 'A'
                                    ? 'rgba(244, 67, 54, 0.2)'
                                    : 'rgba(33, 150, 243, 0.2)'
                                  : item.isPlanDay
                                  ? alpha(theme.palette.grey[400], 0.05)
                                  : 'transparent',
                              }}
                            >
                              {item.day && (
                                <Stack alignItems="center" spacing={0}>
                                  <Typography sx={{ fontSize: 11, fontWeight: 500, marginBottom: 0.5 }}>
                                    {item.day}
                                  </Typography>
                                  {item.entry && (
                                    <Box
                                      sx={{
                                        fontSize: 11,
                                        fontWeight: 'bold',
                                        color:
                                          item.entry.status === 'T'
                                            ? '#4caf50'
                                            : item.entry.status === 'A'
                                            ? '#f44336'
                                            : '#2196f3',
                                      }}
                                    >
                                      {item.entry.status === 'T'
                                        ? '✓'
                                        : item.entry.status === 'A'
                                        ? '✗'
                                        : '+'}
                                    </Box>
                                  )}
                                </Stack>
                              )}
                            </Box>
                          </Grid>
                        ))}
                      </Grid>

                      {/* Summary */}
                      <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 2 }}>
                        <Chip
                          label={`${invoice.billing.total_delivered} Delivered`}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(76, 175, 80, 0.2)',
                            color: '#4caf50',
                            fontWeight: 600,
                            fontSize: 11,
                            height: 22,
                          }}
                        />
                        <Chip
                          label={`${invoice.billing.total_absent} Absent`}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(244, 67, 54, 0.2)',
                            color: '#f44336',
                            fontWeight: 600,
                            fontSize: 11,
                            height: 22,
                          }}
                        />
                        <Chip
                          label={`${invoice.billing.total_extra} Extra`}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(33, 150, 243, 0.2)',
                            color: '#2196f3',
                            fontWeight: 600,
                            fontSize: 11,
                            height: 22,
                          }}
                        />
                      </Stack>
                    </Paper>
                  </Grid>

                  {/* Right Half: Billing Calculation */}
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                      <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                        Billing Calculation Breakdown
                      </Typography>

                      <Stack spacing={2}>
                        {/* Base Order */}
                        <Box>
                          <Typography variant="body2" fontWeight={600} gutterBottom>
                            Base Order: {invoice.meal_plan_name}
                          </Typography>
                          <Box sx={{ pl: 2, position: 'relative' }}>
                            <Box
                              component="span"
                              sx={{ position: 'absolute', left: 0, color: 'text.disabled' }}
                            >
                              ├─
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              Order Price: {formatCurrency(invoice.meal_plan_price)}
                            </Typography>
                          </Box>
                          <Box sx={{ pl: 2, position: 'relative' }}>
                            <Box
                              component="span"
                              sx={{ position: 'absolute', left: 0, color: 'text.disabled' }}
                            >
                              ├─
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              Total {invoice.selected_days.join('-')} days in {getMonthDisplay().split(' ')[0]}:{' '}
                              {invoice.billing.total_plan_days} days
                            </Typography>
                          </Box>
                          <Box sx={{ pl: 2, position: 'relative' }}>
                            <Box
                              component="span"
                              sx={{ position: 'absolute', left: 0, color: 'text.disabled' }}
                            >
                              ├─
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              Per-Tiffin Price: {formatCurrency(invoice.meal_plan_price)} ÷{' '}
                              {invoice.billing.total_plan_days} = {formatCurrency(perTiffinPrice)}/tiffin
                            </Typography>
                          </Box>
                          <Box sx={{ pl: 2, position: 'relative' }}>
                            <Box
                              component="span"
                              sx={{ position: 'absolute', left: 0, color: 'text.disabled' }}
                            >
                              └─
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              Order covers: {new Date(invoice.start_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              -{' '}
                              {new Date(invoice.end_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </Typography>
                          </Box>
                        </Box>

                        <Divider />

                        {/* Delivered Tiffins */}
                        <Box>
                          <Typography variant="body2" fontWeight={600} gutterBottom color="success.main">
                            Delivered Tiffins
                          </Typography>
                          <Box sx={{ pl: 2, position: 'relative' }}>
                            <Box
                              component="span"
                              sx={{ position: 'absolute', left: 0, color: 'text.disabled' }}
                            >
                              ├─
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              Count: {invoice.billing.total_delivered} tiffins delivered
                            </Typography>
                          </Box>
                          <Box sx={{ pl: 2, position: 'relative' }}>
                            <Box
                              component="span"
                              sx={{ position: 'absolute', left: 0, color: 'text.disabled' }}
                            >
                              ├─
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              Calculation: {invoice.billing.total_delivered} × {formatCurrency(perTiffinPrice)} ={' '}
                              {formatCurrency(invoice.billing.total_delivered * perTiffinPrice)}
                            </Typography>
                          </Box>
                          <Box sx={{ pl: 2, position: 'relative' }}>
                            <Box
                              component="span"
                              sx={{ position: 'absolute', left: 0, color: 'text.disabled' }}
                            >
                              └─
                            </Box>
                            <Typography variant="caption" fontWeight={600} color="success.main">
                              Subtotal: {formatCurrency(invoice.billing.total_delivered * perTiffinPrice)}
                            </Typography>
                          </Box>
                        </Box>

                        {invoice.billing.total_absent > 0 && (
                          <>
                            <Divider />
                            <Box>
                              <Typography variant="body2" fontWeight={600} gutterBottom color="error.main">
                                Absent Days (Deduction)
                              </Typography>
                              <Box sx={{ pl: 2, position: 'relative' }}>
                                <Box
                                  component="span"
                                  sx={{ position: 'absolute', left: 0, color: 'text.disabled' }}
                                >
                                  ├─
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  Count: {invoice.billing.total_absent} day(s) absent
                                </Typography>
                              </Box>
                              <Box sx={{ pl: 2, position: 'relative' }}>
                                <Box
                                  component="span"
                                  sx={{ position: 'absolute', left: 0, color: 'text.disabled' }}
                                >
                                  ├─
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  Calculation: {invoice.billing.total_absent} × {formatCurrency(perTiffinPrice)} ={' '}
                                  -{formatCurrency(invoice.billing.total_absent * perTiffinPrice)}
                                </Typography>
                              </Box>
                              <Box sx={{ pl: 2, position: 'relative' }}>
                                <Box
                                  component="span"
                                  sx={{ position: 'absolute', left: 0, color: 'text.disabled' }}
                                >
                                  └─
                                </Box>
                                <Typography variant="caption" fontWeight={600} color="error.main">
                                  Deduction: -{formatCurrency(invoice.billing.total_absent * perTiffinPrice)}
                                </Typography>
                              </Box>
                            </Box>
                          </>
                        )}

                        {invoice.billing.total_extra > 0 && (
                          <>
                            <Divider />
                            <Box>
                              <Typography variant="body2" fontWeight={600} gutterBottom color="info.main">
                                Extra Tiffins
                              </Typography>
                              <Box sx={{ pl: 2, position: 'relative' }}>
                                <Box
                                  component="span"
                                  sx={{ position: 'absolute', left: 0, color: 'text.disabled' }}
                                >
                                  ├─
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  Count: {invoice.billing.total_extra} extra tiffin(s)
                                </Typography>
                              </Box>
                              <Box sx={{ pl: 2, position: 'relative' }}>
                                <Box
                                  component="span"
                                  sx={{ position: 'absolute', left: 0, color: 'text.disabled' }}
                                >
                                  ├─
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  Price:{' '}
                                  {formatCurrency(
                                    invoice.billing.extra_amount / invoice.billing.total_extra
                                  )}
                                  /tiffin
                                </Typography>
                              </Box>
                              <Box sx={{ pl: 2, position: 'relative' }}>
                                <Box
                                  component="span"
                                  sx={{ position: 'absolute', left: 0, color: 'text.disabled' }}
                                >
                                  └─
                                </Box>
                                <Typography variant="caption" fontWeight={600} color="info.main">
                                  Addition: +{formatCurrency(invoice.billing.extra_amount)}
                                </Typography>
                              </Box>
                            </Box>
                          </>
                        )}

                        <Divider />

                        {/* Final Total */}
                        <Box
                          sx={{
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            p: 2,
                            borderRadius: 1,
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="h6" fontWeight={700}>
                              Total Amount
                            </Typography>
                            <Typography variant="h4" color="primary.main" fontWeight={700}>
                              {formatCurrency(invoice.billing.total_amount)}
                            </Typography>
                          </Stack>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </Stack>
            </Box>
          )}

          {/* PDF Export Tab */}
          {currentTab === 'pdf-export' && invoice && (
            <Box sx={{ height: 900 }}>
              <PDFViewer width="100%" height="100%">
                <OrderInvoicePDF
                  invoiceData={invoice}
                  companyName={companyName}
                  eTransferEmail={eTransferEmail}
                  companyLogo={logoDataUrl}
                />
              </PDFViewer>
            </Box>
          )}
        </Card>
      </Container>
    </>
  );
}
