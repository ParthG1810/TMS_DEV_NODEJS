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
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
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
    window.print();
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
      </Head>

      <Container maxWidth={themeStretch ? false : 'xl'}>
        <CustomBreadcrumbs
          heading="Billing Invoice Details"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Billing', href: PATH_DASHBOARD.tiffin.billingCalendar },
            { name: billing.customer_name },
          ]}
          action={
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<Iconify icon="eva:printer-outline" />}
                onClick={handlePrint}
              >
                Export PDF
              </Button>
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

        <Card>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
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

          <Divider />

          {/* Tab Content */}
          <Box sx={{ p: 3 }} ref={componentRef}>
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
                const bgColor =
                  status === 'delivered'
                    ? theme.palette.success.main
                    : status === 'absent'
                    ? theme.palette.error.main
                    : status === 'extra'
                    ? theme.palette.info.main
                    : theme.palette.grey[300];

                const statusText =
                  status === 'delivered' ? 'T' : status === 'absent' ? 'A' : status === 'extra' ? 'E' : '';

                return (
                  <Box
                    key={day}
                    sx={{
                      p: 1,
                      textAlign: 'center',
                      bgcolor: status ? alpha(bgColor, 0.2) : 'transparent',
                      border: `1px solid ${alpha(bgColor, 0.4)}`,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                    }}
                  >
                    <div>{day}</div>
                    {statusText && (
                      <div style={{ fontWeight: 'bold', color: bgColor }}>{statusText}</div>
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
            <Stack spacing={2}>
              {calculations?.breakdown_by_order.map((breakdown, index) => {
                const totalDays = breakdown.weekdays_only ? calculations.total_weekdays : daysInMonth;
                const dayType = breakdown.weekdays_only ? 'Mon-Fri' : 'All';

                return (
                  <Paper key={breakdown.order_id} sx={{ p: 2, bgcolor: 'background.neutral' }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
                      Base Order: {breakdown.meal_plan_name} ({dayType})
                    </Typography>
                    <Stack spacing={0.5} sx={{ pl: 1, fontSize: '0.875rem' }}>
                      {/* Base Order Info */}
                      <Typography variant="body2" color="text.secondary">
                        ├─ Order Price: {fCurrency(breakdown.order_price)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ├─ Total {breakdown.weekdays_only ? 'Mon-Fri' : 'All'} days in{' '}
                        {billing.billing_month}: {totalDays} days
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ├─ Per-Tiffin Price: {fCurrency(breakdown.order_price)} ÷ {totalDays} ={' '}
                        {fCurrency(breakdown.per_tiffin_price)}/tiffin
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        └─ Order covers: {breakdown.applicable_days} applicable days
                      </Typography>

                      {/* Delivered Tiffins */}
                      <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 2, mb: 0.5 }}>
                        Delivered Tiffins:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ├─ Count: {breakdown.delivered_count} tiffins delivered
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ├─ Calculation: {breakdown.delivered_count} × {fCurrency(breakdown.per_tiffin_price)} ={' '}
                        {fCurrency(breakdown.delivered_amount)}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: 'success.main', mb: 1, fontWeight: 'medium' }}
                      >
                        └─ Subtotal: {fCurrency(breakdown.delivered_amount)}
                      </Typography>

                      {/* Absent Days */}
                      {breakdown.absent_count > 0 && (
                        <>
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 2, mb: 0.5 }}>
                            Absent Days (Deduction):
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ├─ Count: {breakdown.absent_count} day{breakdown.absent_count > 1 ? 's' : ''} absent
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ├─ Calculation: {breakdown.absent_count} × {fCurrency(breakdown.per_tiffin_price)} ={' '}
                            -{fCurrency(breakdown.absent_deduction)}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ color: 'error.main', mb: 1, fontWeight: 'medium' }}
                          >
                            └─ Deduction: {fCurrency(-breakdown.absent_deduction)}
                          </Typography>
                        </>
                      )}

                      {/* Extra Tiffins */}
                      {breakdown.extra_count > 0 && (
                        <>
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 2, mb: 0.5 }}>
                            Extra Tiffins:
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ├─ Count: {breakdown.extra_count} extra tiffin{breakdown.extra_count > 1 ? 's' : ''}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ├─ Price: {fCurrency(breakdown.extra_amount / breakdown.extra_count)}/tiffin
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ color: 'info.main', mb: 1, fontWeight: 'medium' }}
                          >
                            └─ Addition: +{fCurrency(breakdown.extra_amount)}
                          </Typography>
                        </>
                      )}

                      <Divider sx={{ my: 2 }} />

                      {/* Order Total */}
                      <Typography variant="body1" fontWeight="bold" sx={{ color: 'primary.main' }}>
                        Order Total: {fCurrency(breakdown.order_total)}
                      </Typography>
                    </Stack>
                  </Paper>
                );
              })}

              {/* Overall Total */}
              <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
                <Typography variant="h6" fontWeight="bold" align="center">
                  TOTAL AMOUNT DUE: {fCurrency(billing.total_amount)}
                </Typography>
              </Paper>
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
      sx={{
        bgcolor: isDark ? '#1a1a1a' : '#f5f5f5',
        color: isDark ? '#fff' : '#000',
        p: 4,
        minHeight: '100vh',
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
            gap: 0.5,
            maxWidth: 600,
            margin: '0 auto',
          }}
        >
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <Box
              key={i}
              sx={{
                p: 1,
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '0.75rem',
                bgcolor: isDark ? '#333' : '#e0e0e0',
              }}
            >
              {day}
            </Box>
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const status = calendarGrid[day];

            // Use color-coded backgrounds matching the "My Use" tab
            let bgColor = 'transparent';
            let borderColor = isDark ? '#555' : '#e0e0e0';

            if (status === 'delivered') {
              bgColor = isDark ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.15)'; // Green
              borderColor = isDark ? 'rgba(76, 175, 80, 0.4)' : 'rgba(76, 175, 80, 0.3)';
            } else if (status === 'absent') {
              bgColor = isDark ? 'rgba(244, 67, 54, 0.2)' : 'rgba(244, 67, 54, 0.15)'; // Red
              borderColor = isDark ? 'rgba(244, 67, 54, 0.4)' : 'rgba(244, 67, 54, 0.3)';
            } else if (status === 'extra') {
              bgColor = isDark ? 'rgba(33, 150, 243, 0.2)' : 'rgba(33, 150, 243, 0.15)'; // Blue
              borderColor = isDark ? 'rgba(33, 150, 243, 0.4)' : 'rgba(33, 150, 243, 0.3)';
            }

            const statusText =
              status === 'delivered' ? 'T' : status === 'absent' ? 'A' : status === 'extra' ? 'E' : '';

            return (
              <Box
                key={day}
                sx={{
                  p: 1,
                  textAlign: 'center',
                  bgcolor: bgColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 1,
                  fontSize: '0.875rem',
                  fontWeight: status ? 'bold' : 'normal',
                }}
              >
                <div>{day}</div>
                {statusText && (
                  <div style={{ fontSize: '0.75rem', marginTop: 2 }}>{statusText}</div>
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
