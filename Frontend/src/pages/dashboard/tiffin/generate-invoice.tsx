import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
// @mui
import {
  Container,
  Card,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  TextField,
  Stack,
  Grid,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// components
import { useSettingsContext } from '../../../components/settings';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import Iconify from '../../../components/iconify';
import { useSnackbar } from '../../../components/snackbar';
// utils
import axios from '../../../utils/axios';
import { fCurrency } from '../../../utils/formatNumber';

// ----------------------------------------------------------------------

GenerateInvoicePage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

interface OrderBillingData {
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
  status: string;
  finalized_at: string | null;
  meal_plan_name: string;
  order_price: number;
  start_date: string;
  end_date: string;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
}

// ----------------------------------------------------------------------

export default function GenerateInvoicePage() {
  const theme = useTheme();
  const router = useRouter();
  const { themeStretch } = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const { orderId, month } = router.query;

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [orderData, setOrderData] = useState<OrderBillingData | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');

  // Fetch order billing data when page loads
  useEffect(() => {
    if (orderId && month) {
      fetchOrderBilling();
    }
  }, [orderId, month]);

  const fetchOrderBilling = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/order-billing/order-invoice', {
        params: {
          order_id: orderId,
          billing_month: month,
        },
      });

      if (response.data.success) {
        const data = response.data.data;
        setOrderData({
          id: data.billing?.id || 0,
          order_id: data.order_id,
          billing_month: data.billing_month,
          total_delivered: data.billing?.total_delivered || 0,
          total_absent: data.billing?.total_absent || 0,
          total_extra: data.billing?.total_extra || 0,
          total_plan_days: data.billing?.total_plan_days || 0,
          base_amount: data.billing?.base_amount || 0,
          extra_amount: data.billing?.extra_amount || 0,
          total_amount: data.billing?.total_amount || 0,
          status: data.billing?.status || 'calculating',
          finalized_at: data.billing?.finalized_at || null,
          meal_plan_name: data.meal_plan_name,
          order_price: data.meal_plan_price,
          start_date: data.start_date,
          end_date: data.end_date,
          customer_id: data.customer_id,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          customer_address: data.customer_address,
        });
      } else {
        enqueueSnackbar(response.data.error || 'Failed to load order data', {
          variant: 'error',
        });
      }
    } catch (error: any) {
      console.error('Error fetching order billing:', error);
      enqueueSnackbar(error.message || 'Failed to load order data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!orderData || !orderData.id) {
      enqueueSnackbar('No billing data available', { variant: 'warning' });
      return;
    }

    try {
      setGenerating(true);
      const response = await axios.post('/api/invoices/generate', {
        customer_id: orderData.customer_id,
        order_billing_ids: [orderData.id],
        due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
        notes: notes || null,
      });

      if (response.data.success) {
        enqueueSnackbar(
          `Invoice ${response.data.data.invoice_number} generated successfully!`,
          { variant: 'success' }
        );
        router.push('/dashboard/tiffin/invoices');
      } else {
        enqueueSnackbar(response.data.error || 'Failed to generate invoice', {
          variant: 'error',
        });
      }
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      enqueueSnackbar(error.message || 'Failed to generate invoice', { variant: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const formatMonth = (monthStr: string) => {
    const [year, m] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  };

  const getMonthDisplay = () => {
    if (!month || typeof month !== 'string') return '';
    return formatMonth(month);
  };

  const canGenerateInvoice = orderData && (orderData.status === 'finalized' || orderData.status === 'approved');

  return (
    <>
      <Head>
        <title>Generate Invoice | Tiffin Management</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading="Generate Invoice"
          links={[
            { name: 'Dashboard', href: '/dashboard' },
            { name: 'Tiffin', href: '/dashboard/tiffin' },
            { name: 'Billing Calendar', href: '/dashboard/tiffin/billing-calendar' },
            { name: 'Generate Invoice' },
          ]}
          action={
            <Button
              variant="outlined"
              startIcon={<Iconify icon="eva:arrow-back-fill" />}
              onClick={handleBack}
            >
              Back
            </Button>
          }
        />

        {loading ? (
          <Card sx={{ p: 5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          </Card>
        ) : !orderData ? (
          <Card sx={{ p: 5 }}>
            <Alert severity="error">Failed to load order data</Alert>
          </Card>
        ) : (
          <Stack spacing={3}>
            {/* Header Card */}
            <Card sx={{ p: 3 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Iconify icon="solar:document-add-bold" width={32} color="primary.main" />
                  <Stack>
                    <Typography variant="h4">Generate Invoice</Typography>
                    <Typography variant="body1" color="text.secondary">
                      {orderData.customer_name} - {getMonthDisplay()}
                    </Typography>
                  </Stack>
                </Stack>
                <Stack alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
                  <Typography variant="caption" color="text.secondary">
                    Invoice Amount
                  </Typography>
                  <Typography variant="h3" color="primary.main">
                    {fCurrency(orderData.total_amount)}
                  </Typography>
                </Stack>
              </Stack>
            </Card>

            {/* Customer Info */}
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Customer Information
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4}>
                <Stack>
                  <Typography variant="caption" color="text.secondary">
                    Customer Name
                  </Typography>
                  <Typography variant="subtitle1">{orderData.customer_name}</Typography>
                </Stack>
                {orderData.customer_phone && (
                  <Stack>
                    <Typography variant="caption" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography variant="body1">{orderData.customer_phone}</Typography>
                  </Stack>
                )}
                {orderData.customer_address && (
                  <Stack>
                    <Typography variant="caption" color="text.secondary">
                      Address
                    </Typography>
                    <Typography variant="body1">{orderData.customer_address}</Typography>
                  </Stack>
                )}
              </Stack>
            </Card>

            {/* Order Details */}
            <Card>
              <Box sx={{ p: 3, pb: 2 }}>
                <Typography variant="h6">Order Details</Typography>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Meal Plan</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Period</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Plan Days</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Delivered</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Absent</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Extra</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {orderData.meal_plan_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Plan: {fCurrency(orderData.order_price)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {formatDate(orderData.start_date)} - {formatDate(orderData.end_date)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">{orderData.total_plan_days}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={600} color="success.main">
                          {orderData.total_delivered}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={600} color="error.main">
                          {orderData.total_absent}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={600} color="info.main">
                          {orderData.total_extra}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700}>
                          {fCurrency(orderData.total_amount)}
                        </Typography>
                        {orderData.extra_amount > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            (Base: {fCurrency(orderData.base_amount)} + Extra: {fCurrency(orderData.extra_amount)})
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>

            {/* Status Warning */}
            {!canGenerateInvoice && (
              <Alert severity="warning">
                This order must be finalized or approved before generating an invoice. Current status: {orderData.status}
              </Alert>
            )}

            {/* Invoice Options */}
            {canGenerateInvoice && (
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Invoice Options
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="Due Date (Optional)"
                      value={dueDate}
                      onChange={(newValue) => setDueDate(newValue)}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Notes (Optional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      fullWidth
                      multiline
                      rows={2}
                    />
                  </Grid>
                </Grid>
              </Card>
            )}

            {/* Action Buttons */}
            <Card sx={{ p: 3 }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', md: 'center' }}
                spacing={3}
              >
                <Paper
                  sx={{
                    p: 3,
                    flex: 1,
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box>
                      <Typography variant="body1" color="text.secondary">
                        Invoice Type: <strong>Individual Order</strong>
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        Order: {orderData.meal_plan_name}
                      </Typography>
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="caption" color="text.secondary">
                        Total Amount
                      </Typography>
                      <Typography variant="h4" color="primary.main" fontWeight="bold">
                        {fCurrency(orderData.total_amount)}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={handleBack}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleGenerateInvoice}
                    disabled={loading || generating || !canGenerateInvoice}
                    startIcon={
                      generating ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <Iconify icon="solar:document-add-bold" />
                      )
                    }
                  >
                    {generating ? 'Generating...' : 'Generate Invoice'}
                  </Button>
                </Stack>
              </Stack>
            </Card>
          </Stack>
        )}
      </Container>
    </>
  );
}
