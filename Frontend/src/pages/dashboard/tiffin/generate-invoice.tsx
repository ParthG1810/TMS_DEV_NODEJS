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
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  Divider,
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
// paths
import { PATH_DASHBOARD } from '../../../routes/paths';

// ----------------------------------------------------------------------

GenerateInvoicePage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

interface AvailableOrder {
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
}

interface InvoicedOrder extends AvailableOrder {
  invoice_id: number;
  invoice_number: string;
}

interface NotReadyOrder {
  id: number;
  order_id: number;
  meal_plan_name: string;
  billing_month: string;
  total_amount: number;
  status: string;
}

interface AvailableForInvoiceData {
  customer: {
    id: number;
    name: string;
    phone: string;
    address: string;
  };
  billing_month: string;
  available_orders: AvailableOrder[];
  already_invoiced_orders: InvoicedOrder[];
  not_ready_orders: NotReadyOrder[];
  summary: {
    total_orders: number;
    available_for_invoice: number;
    already_invoiced: number;
    not_ready: number;
    available_total_amount: number;
  };
}

// ----------------------------------------------------------------------

export default function GenerateInvoicePage() {
  const theme = useTheme();
  const router = useRouter();
  const { themeStretch } = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const { customerId, month, customerName } = router.query;

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<AvailableForInvoiceData | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');

  // Fetch available orders when page loads
  useEffect(() => {
    if (customerId && month) {
      fetchAvailableOrders();
    }
  }, [customerId, month]);

  const fetchAvailableOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/order-billing/available-for-invoice', {
        params: {
          customer_id: customerId,
          billing_month: month,
        },
      });

      if (response.data.success) {
        setData(response.data.data);
        // Pre-select all available orders
        setSelectedOrderIds(response.data.data.available_orders.map((o: AvailableOrder) => o.id));
      } else {
        enqueueSnackbar(response.data.error || 'Failed to load available orders', {
          variant: 'error',
        });
      }
    } catch (error: any) {
      console.error('Error fetching available orders:', error);
      enqueueSnackbar(error.message || 'Failed to load available orders', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOrder = (orderId: number) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleToggleAll = () => {
    if (!data) return;
    if (selectedOrderIds.length === data.available_orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(data.available_orders.map((o) => o.id));
    }
  };

  const handleGenerateInvoice = async () => {
    if (selectedOrderIds.length === 0) {
      enqueueSnackbar('Please select at least one order', { variant: 'warning' });
      return;
    }

    try {
      setGenerating(true);
      const response = await axios.post('/api/invoices/generate', {
        customer_id: customerId,
        order_billing_ids: selectedOrderIds,
        due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
        notes: notes || null,
      });

      if (response.data.success) {
        enqueueSnackbar(
          `Invoice ${response.data.data.invoice_number} generated successfully!`,
          { variant: 'success' }
        );
        // Navigate to invoices list or back to previous page
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

  const selectedTotal = data
    ? data.available_orders
        .filter((o) => selectedOrderIds.includes(o.id))
        .reduce((sum, o) => sum + o.total_amount, 0)
    : 0;

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
        ) : !data ? (
          <Card sx={{ p: 5 }}>
            <Alert severity="error">Failed to load invoice data</Alert>
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
                      {data.customer.name} - {getMonthDisplay()}
                    </Typography>
                  </Stack>
                </Stack>
                <Stack alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
                  <Typography variant="caption" color="text.secondary">
                    Selected Total
                  </Typography>
                  <Typography variant="h3" color="primary.main">
                    {fCurrency(selectedTotal)}
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
                  <Typography variant="subtitle1">{data.customer.name}</Typography>
                </Stack>
                {data.customer.phone && (
                  <Stack>
                    <Typography variant="caption" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography variant="body1">{data.customer.phone}</Typography>
                  </Stack>
                )}
                {data.customer.address && (
                  <Stack>
                    <Typography variant="caption" color="text.secondary">
                      Address
                    </Typography>
                    <Typography variant="body1">{data.customer.address}</Typography>
                  </Stack>
                )}
              </Stack>
            </Card>

            {/* Available Orders */}
            {data.available_orders.length > 0 ? (
              <Card>
                <Box sx={{ p: 3, pb: 2 }}>
                  <Typography variant="h6">
                    Select Orders to Include in Invoice
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedOrderIds.length} of {data.available_orders.length} orders selected
                  </Typography>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedOrderIds.length === data.available_orders.length}
                            indeterminate={
                              selectedOrderIds.length > 0 &&
                              selectedOrderIds.length < data.available_orders.length
                            }
                            onChange={handleToggleAll}
                          />
                        </TableCell>
                        <TableCell>Meal Plan</TableCell>
                        <TableCell align="center">Period</TableCell>
                        <TableCell align="center">Plan Days</TableCell>
                        <TableCell align="center">Delivered</TableCell>
                        <TableCell align="center">Absent</TableCell>
                        <TableCell align="center">Extra</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.available_orders.map((order) => (
                        <TableRow
                          key={order.id}
                          hover
                          onClick={() => handleToggleOrder(order.id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox checked={selectedOrderIds.includes(order.id)} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {order.meal_plan_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Plan: {fCurrency(order.order_price)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {formatDate(order.start_date)} - {formatDate(order.end_date)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {order.total_plan_days}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight={600} color="success.main">
                              {order.total_delivered}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight={600} color="error.main">
                              {order.total_absent}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight={600} color="info.main">
                              {order.total_extra}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={700}>
                              {fCurrency(order.total_amount)}
                            </Typography>
                            {order.extra_amount > 0 && (
                              <Typography variant="caption" color="text.secondary">
                                (Base: {fCurrency(order.base_amount)} + Extra: {fCurrency(order.extra_amount)})
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            ) : (
              <Alert severity="info">
                No orders available for invoice generation. Orders must be finalized first.
              </Alert>
            )}

            {/* Already Invoiced Orders */}
            {data.already_invoiced_orders.length > 0 && (
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom color="text.secondary">
                  Already Invoiced ({data.already_invoiced_orders.length})
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, bgcolor: alpha(theme.palette.warning.main, 0.05) }}
                >
                  <Stack spacing={1}>
                    {data.already_invoiced_orders.map((order) => (
                      <Stack
                        key={order.id}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography variant="body2">
                          {order.meal_plan_name} - {fCurrency(order.total_amount)}
                        </Typography>
                        <Chip
                          label={order.invoice_number}
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              </Card>
            )}

            {/* Not Ready Orders */}
            {data.not_ready_orders.length > 0 && (
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom color="text.secondary">
                  Not Ready ({data.not_ready_orders.length})
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{ p: 2, bgcolor: alpha(theme.palette.grey[500], 0.05) }}
                >
                  <Stack spacing={1}>
                    {data.not_ready_orders.map((order, index) => (
                      <Stack
                        key={`${order.order_id}-${index}`}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography variant="body2" color="text.secondary">
                          {order.meal_plan_name}
                        </Typography>
                        <Chip
                          label={order.status === 'no_billing' ? 'No Billing' : 'Calculating'}
                          size="small"
                          color="default"
                          variant="outlined"
                        />
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              </Card>
            )}

            {/* Invoice Options */}
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

            {/* Summary and Action */}
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
                        Selected Orders: {selectedOrderIds.length}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        Invoice Type:{' '}
                        <strong>{selectedOrderIds.length === 1 ? 'Individual' : 'Combined'}</strong>
                      </Typography>
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="caption" color="text.secondary">
                        Total Amount
                      </Typography>
                      <Typography variant="h4" color="primary.main" fontWeight="bold">
                        {fCurrency(selectedTotal)}
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
                    disabled={loading || generating || selectedOrderIds.length === 0}
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
